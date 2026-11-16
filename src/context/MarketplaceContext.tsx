import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  db,
  firebaseConfigError,
  firebaseConfigured,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../firebase';
import {
  AdminAccount,
  AdminTab,
  AuditLogEntry,
  AuthorizedFacilitator,
  BuyerAccount,
  BuyerRequirement,
  BuyerTab,
  DocumentRecord,
  EPRCategory,
  EPRSubcategory,
  EmailDeliveryLog,
  FacilitatorAccount,
  FacilitatorTab,
  InvoiceRecord,
  MarketRateRecord,
  MarketplaceOffer,
  MarketplaceOrder,
  MatchOpportunity,
  NegotiationEntry,
  NotificationItem,
  OrderStatus,
  PaymentRecord,
  PlatformSettingsRecord,
  PublicPage,
  PublishedEprRate,
  SellerAccount,
  SellerListing,
  SellerTab,
  SeoChangeLog,
  SeoPageRecord,
  SeoSettingsRecord,
  ToastMessage,
  TransactionRecord,
  UserRecord,
  UserRole,
} from '../types';
import {
  completeCompanyOnboarding,
  confirmMatchAndCreateOrderDoc,
  createBuyerRequirementDoc,
  createNotificationIfUnique,
  createSellerListingDoc,
  deletePublishedRateDoc,
  dispatchCategoryEmailNotificationsApi,
  facilitatorSendOfferDoc,
  recomputeMarketRate,
  respondToOfferDoc,
  retryFailedEmailsApi,
  runMatchingForListing,
  runMatchingForRequirement,
  saveCategoryWithSubcategories,
  savePublishedRateDoc,
  togglePublishedRateStatusDoc,
  updateOrderStatusDoc,
  uploadProtectedDocument,
  writeAuditLog,
} from '../services/firestoreService';
import {
  deleteSeoPageDoc,
  regenerateSitemapApi,
  requestSeoSuggestionApi,
  saveSeoPageDoc,
  seedInitialSeoPagesIfEmpty,
  syncSeoSettingsSummaryDoc,
  toggleSeoPagePublishDoc,
  toSeoPageInput,
  writeSeoLogDoc,
} from '../services/seoService';
import { applyResolvedSeoToDocument } from '../seo/headManager';
import { auditSeoPages, normalizeSlug, resolveMetadataForPath } from '../../shared/seoEngine';

const BOOTSTRAPPED_ADMIN_EMAIL = 'ajaykumartiwari609@gmail.com';

interface MarketplaceContextValue {
  firebaseReady: boolean;
  connectionError: string | null;
  permissionError: string | null;
  authLoading: boolean;
  dataLoading: boolean;
  authUser: FirebaseUser | null;
  userRecord: UserRecord | null;
  pendingOnboardingRole: 'buyer' | 'seller' | null;
  role: UserRole;
  publicPage: PublicPage;
  activeCustomSlug: string;
  selectedCategoryId: string;
  buyerTab: BuyerTab;
  sellerTab: SellerTab;
  facilitatorTab: FacilitatorTab;
  adminTab: AdminTab;
  selectedRequirementId: string | null;
  selectedListingId: string | null;
  selectedMatchId: string | null;
  selectedOfferId: string | null;
  selectedOrderId: string | null;
  currentBuyer: BuyerAccount | null;
  currentSeller: SellerAccount | null;
  currentFacilitator: FacilitatorAccount | null;
  currentAdmin: AdminAccount | null;
  categories: EPRCategory[];
  subcategories: EPRSubcategory[];
  marketRates: MarketRateRecord[];
  publishedRates: PublishedEprRate[];
  transactions: TransactionRecord[];
  buyers: BuyerAccount[];
  sellers: SellerAccount[];
  facilitators: FacilitatorAccount[];
  authorizedFacilitators: AuthorizedFacilitator[];
  admins: AdminAccount[];
  requirements: BuyerRequirement[];
  listings: SellerListing[];
  publicListings: SellerListing[];
  matches: MatchOpportunity[];
  offers: MarketplaceOffer[];
  negotiations: NegotiationEntry[];
  orders: MarketplaceOrder[];
  payments: PaymentRecord[];
  invoices: InvoiceRecord[];
  documents: DocumentRecord[];
  notifications: NotificationItem[];
  emailDeliveryLogs: EmailDeliveryLog[];
  auditLogs: AuditLogEntry[];
  platformSettings: PlatformSettingsRecord;
  seoPages: SeoPageRecord[];
  seoSettings: SeoSettingsRecord | null;
  seoLogs: SeoChangeLog[];
  toasts: ToastMessage[];
  navigatePublic: (page: PublicPage, categoryId?: string, customSlug?: string) => void;
  setBuyerTab: (tab: BuyerTab, id?: string) => void;
  setSellerTab: (tab: SellerTab, id?: string) => void;
  setFacilitatorTab: (tab: FacilitatorTab, id?: string) => void;
  setAdminTab: (tab: AdminTab) => void;
  signInGoogleForRole: (targetRole: 'buyer' | 'seller' | 'facilitator' | 'admin') => Promise<void>;
  signInStaffEmailPassword: (email: string, password: string, expectedRole: 'facilitator' | 'admin') => Promise<void>;
  sendFacilitatorPasswordReset: (email: string) => Promise<void>;
  submitOnboardingProfile: (data: {
    companyName: string;
    contactPerson: string;
    mobile: string;
    gstin: string;
    cin?: string;
    eprRegNo: string;
    city: string;
    state: string;
    recyclerType?: string;
    dealingCategories?: string[];
  }) => Promise<void>;
  logout: () => Promise<void>;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  submitBuyerRequirement: (
    params: {
      category: EPRCategory;
      subcategory: string;
      financialYear: string;
      requiredQty: number;
      maxBuyingRate: number;
      requiredDate?: string;
      additionalNotes?: string;
    },
    asDraft?: boolean
  ) => Promise<string>;
  withdrawRequirement: (id: string) => Promise<void>;
  submitSellerListing: (
    params: {
      category: EPRCategory;
      subcategory: string;
      financialYear: string;
      listedQty: number;
      askingRate: number;
      certificateRef?: string;
      additionalInfo?: string;
    },
    asDraft?: boolean
  ) => Promise<string>;
  updateListingStatus: (id: string, status: SellerListing['status']) => Promise<void>;
  editListing: (id: string, qty: number, askingRate: number, additionalInfo: string) => Promise<void>;
  respondToOffer: (
    offer: MarketplaceOffer,
    action: 'accept' | 'reject' | 'counter',
    counterRate?: number,
    counterQty?: number,
    message?: string
  ) => Promise<void>;
  facilitatorSendOffer: (
    match: MatchOpportunity,
    targetParty: 'buyer' | 'seller',
    rate: number,
    qty: number,
    expiryDate: string,
    message: string
  ) => Promise<void>;
  facilitatorAddNote: (match: MatchOpportunity, note: string) => Promise<void>;
  facilitatorConfirmAgreement: (match: MatchOpportunity, agreedRate: number) => Promise<void>;
  updateOrderStatus: (
    order: MarketplaceOrder,
    orderStatus: OrderStatus,
    paymentStatus?: MarketplaceOrder['paymentStatus'],
    transferStatus?: MarketplaceOrder['transferStatus']
  ) => Promise<void>;
  adminApproveListing: (listing: SellerListing, decision: 'Active' | 'Rejected') => Promise<void>;
  adminApproveRequirement: (req: BuyerRequirement, decision: 'Active' | 'Rejected') => Promise<void>;
  adminVerifyUser: (type: 'buyer' | 'seller', uid: string, verification: 'Verified' | 'Action Required') => Promise<void>;
  adminSaveCategory: (params: {
    id?: string;
    code: string;
    name: string;
    shortName: string;
    description: string;
    unit: 'MT' | 'KL' | 'Units';
    financialYears: string[];
    subcategories: string[];
    active: boolean;
  }) => Promise<void>;
  adminToggleCategory: (cat: EPRCategory) => Promise<void>;
  adminSavePublishedRate: (params: {
    id?: string;
    categoryId: string;
    categoryName: string;
    financialYear: string;
    unit: 'MT' | 'KL' | 'Units';
    rate: number;
    trend?: 'Up' | 'Down' | 'Stable';
    published: boolean;
    notes?: string;
  }) => Promise<void>;
  adminTogglePublishedRate: (rateItem: PublishedEprRate) => Promise<void>;
  adminDeletePublishedRate: (rateItem: PublishedEprRate) => Promise<void>;
  adminCreateStaffRecord: (params: {
    roleType: 'facilitator' | 'admin';
    uid?: string;
    name: string;
    email: string;
    employeeId?: string;
    department?: string;
    roleTitle?: string;
  }) => Promise<void>;
  adminToggleFacilitatorStatus: (params: {
    email: string;
    uid?: string;
    currentStatus: 'Active' | 'Inactive';
  }) => Promise<void>;
  adminDeleteAuthorizedFacilitator: (email: string, uid?: string) => Promise<void>;
  adminSavePlatformSettings: (settings: Omit<PlatformSettingsRecord, 'id' | 'updatedAt'>) => Promise<void>;
  recordPayment: (params: {
    order: MarketplaceOrder;
    partyType: 'Buyer Receivable' | 'Seller Payable';
    amount: number;
    paymentType: 'Advance' | 'Balance' | 'Settlement';
    paymentMethod: 'NEFT' | 'RTGS' | 'IMPS';
    referenceNumber: string;
    paymentDate: string;
  }) => Promise<void>;
  uploadDocumentFile: (
    category: DocumentRecord['category'],
    file: File,
    relatedId?: string
  ) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  retryFailedEmails: (notificationId?: string) => Promise<void>;
  adminSeedSeoPages: (forceSyncMissing?: boolean) => Promise<void>;
  adminSaveSeoPage: (params: {
    id?: string;
    slug: string;
    pageType: 'core' | 'legal' | 'custom';
    pageTitle: string;
    contentSummary: string;
    seoTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    robots?: 'index, follow' | 'noindex, nofollow';
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: 'summary_large_image' | 'summary';
    published: boolean;
    isSystemPage?: boolean;
    aiDraftSeoTitle?: string;
    aiDraftMetaDescription?: string;
    aiDraftApproved?: boolean;
  }) => Promise<void>;
  adminToggleSeoPagePublish: (page: SeoPageRecord) => Promise<void>;
  adminDeleteSeoPage: (page: SeoPageRecord) => Promise<void>;
  adminRegenerateSitemap: () => Promise<void>;
  adminRequestSeoSuggestion: (input: {
    pageTitle: string;
    slug: string;
    contentSummary: string;
    existingTitles: string[];
  }) => Promise<{
    aiDraftSeoTitle?: string;
    aiDraftMetaDescription?: string;
    usedAi?: boolean;
    error?: string;
  }>;
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

const DEFAULT_SETTINGS: PlatformSettingsRecord = {
  id: 'default',
  defaultBrokeragePercent: 2.5,
  gstPercent: 18,
  matchingRateTolerancePercent: 10,
};

const PUBLIC_PAGE_SLUGS: PublicPage[] = [
  'home',
  'marketplace',
  'market-rates',
  'category-details',
  'how-it-works',
  'buy-credits',
  'sell-credits',
  'about',
  'contact',
  'faq',
  'terms',
  'privacy',
  'refund',
  'disclaimer',
  'buyer-guidelines',
  'seller-guidelines',
  'grievance',
  'login',
  'login-error',
  'access-denied',
  'profile-completion',
  'password-reset',
];

function resolveRouteFromLocation(): {
  page: PublicPage;
  categoryId?: string;
  customSlug: string;
} {
  if (typeof window === 'undefined') return { page: 'home', customSlug: '/' };
  const params = new URLSearchParams(window.location.search);
  const queryPage = params.get('page') as PublicPage | null;
  if (queryPage && PUBLIC_PAGE_SLUGS.includes(queryPage)) {
    return { page: queryPage, customSlug: queryPage === 'home' ? '/' : `/${queryPage}` };
  }
  const cleanPathname = normalizeSlug(window.location.pathname);
  if (cleanPathname === '/') {
    return { page: 'home', customSlug: '/' };
  }
  if (cleanPathname.startsWith('/category/')) {
    const catId = decodeURIComponent(cleanPathname.slice('/category/'.length));
    return { page: 'category-details', categoryId: catId, customSlug: cleanPathname };
  }
  const rawSlug = cleanPathname.replace(/^\//, '') as PublicPage;
  if (PUBLIC_PAGE_SLUGS.includes(rawSlug)) {
    return { page: rawSlug, customSlug: cleanPathname };
  }
  return { page: 'custom-page', customSlug: cleanPathname };
}

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(firebaseConfigError);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const [pendingOnboardingRole, setPendingOnboardingRole] = useState<'buyer' | 'seller' | null>(null);
  const pendingAuthIntentRef = useRef<'buyer' | 'seller' | 'facilitator' | 'admin' | null>(null);

  const initialSearchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialListingParam = initialSearchParams?.get('listing') || null;
  const initialRoute = resolveRouteFromLocation();

  const [role, setRole] = useState<UserRole>('public');
  const [publicPage, setPublicPage] = useState<PublicPage>(() => initialRoute.page);
  const [activeCustomSlug, setActiveCustomSlug] = useState<string>(() => initialRoute.customSlug);
  const [pendingListingDeepLink, setPendingListingDeepLink] = useState<string | null>(initialListingParam);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => initialRoute.categoryId || '');
  const [buyerTab, setBuyerTabState] = useState<BuyerTab>('overview');
  const [sellerTab, setSellerTabState] = useState<SellerTab>('overview');
  const [facilitatorTab, setFacilitatorTabState] = useState<FacilitatorTab>('overview');
  const [adminTab, setAdminTab] = useState<AdminTab>('overview');

  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [currentBuyer, setCurrentBuyer] = useState<BuyerAccount | null>(null);
  const [currentSeller, setCurrentSeller] = useState<SellerAccount | null>(null);
  const [currentFacilitator, setCurrentFacilitator] = useState<FacilitatorAccount | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(null);

  const [categories, setCategories] = useState<EPRCategory[]>([]);
  const [subcategories, setSubcategories] = useState<EPRSubcategory[]>([]);
  const [marketRates, setMarketRates] = useState<MarketRateRecord[]>([]);
  const [publishedRates, setPublishedRates] = useState<PublishedEprRate[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [buyers, setBuyers] = useState<BuyerAccount[]>([]);
  const [sellers, setSellers] = useState<SellerAccount[]>([]);
  const [facilitators, setFacilitators] = useState<FacilitatorAccount[]>([]);
  const [authorizedFacilitators, setAuthorizedFacilitators] = useState<AuthorizedFacilitator[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [requirements, setRequirements] = useState<BuyerRequirement[]>([]);
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [publicListings, setPublicListings] = useState<SellerListing[]>([]);
  const [matches, setMatches] = useState<MatchOpportunity[]>([]);
  const [offers, setOffers] = useState<MarketplaceOffer[]>([]);
  const [negotiations, setNegotiations] = useState<NegotiationEntry[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [emailDeliveryLogs, setEmailDeliveryLogs] = useState<EmailDeliveryLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettingsRecord>(DEFAULT_SETTINGS);
  const [seoPages, setSeoPages] = useState<SeoPageRecord[]>([]);
  const [seoSettings, setSeoSettings] = useState<SeoSettingsRecord | null>(null);
  const [seoLogs, setSeoLogs] = useState<SeoChangeLog[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const navigatePublic = (page: PublicPage, categoryId?: string, customSlug?: string) => {
    if (role !== 'public' && page !== 'login') {
      setRole('public');
    }
    setPublicPage(page);
    if (categoryId) setSelectedCategoryId(categoryId);

    let nextPath = page === 'home' ? '/' : `/${page}`;
    if (page === 'category-details' && (categoryId || selectedCategoryId)) {
      nextPath = `/category/${encodeURIComponent(categoryId || selectedCategoryId)}`;
    } else if (page === 'custom-page' && customSlug) {
      nextPath = normalizeSlug(customSlug);
    }
    setActiveCustomSlug(nextPath);

    if (typeof window !== 'undefined') {
      if (window.location.pathname !== nextPath || window.location.search) {
        window.history.pushState({ publicPage: page, categoryId, customSlug: nextPath }, '', nextPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const next = resolveRouteFromLocation();
      setPublicPage(next.page);
      setActiveCustomSlug(next.customSlug);
      if (next.categoryId) setSelectedCategoryId(next.categoryId);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    let routePath = '/';
    if (role === 'buyer') routePath = '/buyer';
    else if (role === 'seller') routePath = '/seller';
    else if (role === 'facilitator') routePath = '/facilitator';
    else if (role === 'admin') routePath = '/admin';
    else if (publicPage === 'home') routePath = '/';
    else if (publicPage === 'category-details' && selectedCategoryId) {
      routePath = `/category/${encodeURIComponent(selectedCategoryId)}`;
    } else if (publicPage === 'custom-page') {
      routePath = activeCustomSlug || '/';
    } else {
      routePath = `/${publicPage}`;
    }

    const resolved = resolveMetadataForPath(
      routePath,
      seoPages.map(toSeoPageInput),
      categories.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        shortName: c.shortName,
        description: c.description,
        unit: c.unit,
        active: c.active,
      }))
    );
    applyResolvedSeoToDocument(resolved);
  }, [publicPage, activeCustomSlug, selectedCategoryId, role, seoPages, categories]);

  const setBuyerTab = (tab: BuyerTab, id?: string) => {
    setBuyerTabState(tab);
    if (id) {
      if (tab === 'requirement-details') setSelectedRequirementId(id);
      if (tab === 'offer-details') setSelectedOfferId(id);
      if (tab === 'order-details') setSelectedOrderId(id);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setSellerTab = (tab: SellerTab, id?: string) => {
    setSellerTabState(tab);
    if (id) {
      if (tab === 'listing-details') setSelectedListingId(id);
      if (tab === 'offer-details') setSelectedOfferId(id);
      if (tab === 'order-details') setSelectedOrderId(id);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setFacilitatorTab = (tab: FacilitatorTab, id?: string) => {
    setFacilitatorTabState(tab);
    if (id && tab === 'match-details') setSelectedMatchId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Boot Connection Test
  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await testFirestoreConnection();
      if (!mounted) return;
      if (!res.ok) {
        setConnectionError(res.error || 'Unable to connect to the trading platform.');
      } else {
        setConnectionError(null);
        setFirebaseReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Public Real-Time Listeners (categories, subcategories, market_rates, published_rates, transactions, anonymized active listings)
  useEffect(() => {
    if (!firebaseReady || !db) return;
    const unsubs: Unsubscribe[] = [];

    const onErr = (_path: string) => (err: unknown) => {
      setPermissionError('Unable to load marketplace data right now. Please refresh the page.');
      try {
        handleFirestoreError(err, OperationType.LIST, _path);
      } catch {
        // already logged internally
      }
    };

    if (role !== 'admin') {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'categories'), where('active', '==', true)),
          (snap) => {
            const list = snap.docs.map((d) => d.data() as EPRCategory);
            setCategories(list);
            if (list.length > 0 && !selectedCategoryId) {
              setSelectedCategoryId(list[0].id);
            }
          },
          onErr('categories')
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'subcategories'), where('active', '==', true)),
          (snap) => setSubcategories(snap.docs.map((d) => d.data() as EPRSubcategory)),
          onErr('subcategories')
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'published_rates'), where('published', '==', true)),
          (snap) => setPublishedRates(snap.docs.map((d) => d.data() as PublishedEprRate)),
          onErr('published_rates')
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'seo_pages'), where('published', '==', true)),
          (snap) => setSeoPages(snap.docs.map((d) => d.data() as SeoPageRecord)),
          onErr('seo_pages')
        )
      );

      unsubs.push(
        onSnapshot(
          doc(db, 'seo_settings', 'default'),
          (snap) => {
            if (snap.exists()) setSeoSettings(snap.data() as SeoSettingsRecord);
          },
          onErr('seo_settings/default')
        )
      );
    }

    unsubs.push(
      onSnapshot(
        collection(db, 'market_rates'),
        (snap) => setMarketRates(snap.docs.map((d) => d.data() as MarketRateRecord)),
        onErr('market_rates')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'transactions'),
        (snap) => setTransactions(snap.docs.map((d) => d.data() as TransactionRecord)),
        onErr('transactions')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'seller_listings'), where('status', 'in', ['Active', 'Partially Allocated'])),
        (snap) => setPublicListings(snap.docs.map((d) => d.data() as SellerListing)),
        onErr('seller_listings')
      )
    );

    return () => unsubs.forEach((u) => u());
  }, [firebaseReady, role]);

  const resolveOrBootstrapFacilitator = async (
    fbUser: FirebaseUser
  ): Promise<{ status: 'active'; facilitator: FacilitatorAccount } | { status: 'inactive' } | { status: 'none' }> => {
    const emailLower = (fbUser.email || '').trim().toLowerCase();
    const [facSnap, authFacSnap] = await Promise.all([
      getDoc(doc(db, 'facilitators', fbUser.uid)),
      emailLower ? getDoc(doc(db, 'authorized_facilitators', emailLower)) : Promise.resolve(null),
    ]);

    const authFac = authFacSnap?.exists() ? (authFacSnap.data() as AuthorizedFacilitator) : null;
    if (authFac && authFac.status !== 'Active') {
      return { status: 'inactive' };
    }

    if (facSnap.exists()) {
      const fac = facSnap.data() as FacilitatorAccount;
      if (fac.status !== 'Active') {
        return { status: 'inactive' };
      }
      if (authFac && authFac.linkedUid !== fbUser.uid) {
        await updateDoc(doc(db, 'authorized_facilitators', emailLower), {
          linkedUid: fbUser.uid,
          updatedAt: serverTimestamp(),
        });
      }
      return { status: 'active', facilitator: fac };
    }

    if (authFac && authFac.status === 'Active') {
      const newFac: FacilitatorAccount = {
        uid: fbUser.uid,
        employeeId: authFac.employeeId || `EMP-${Date.now().toString().slice(-4)}`,
        name: authFac.name || fbUser.displayName || 'EPR Bazaar Facilitator',
        email: emailLower,
        department: authFac.department || 'Trading Desk',
        status: 'Active',
      };
      await setDoc(doc(db, 'facilitators', fbUser.uid), {
        ...newFac,
        createdAt: serverTimestamp(),
      });
      if (authFac.linkedUid !== fbUser.uid) {
        await updateDoc(doc(db, 'authorized_facilitators', emailLower), {
          linkedUid: fbUser.uid,
          updatedAt: serverTimestamp(),
        });
      }
      return { status: 'active', facilitator: newFac };
    }

    return { status: 'none' };
  };

  // 3. Auth State Listener
  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setAuthLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setAuthUser(fbUser);
      setPermissionError(null);
      if (!fbUser) {
        setUserRecord(null);
        setCurrentBuyer(null);
        setCurrentSeller(null);
        setCurrentFacilitator(null);
        setCurrentAdmin(null);
        setRole('public');
        setAuthLoading(false);
        return;
      }

      if (!fbUser.emailVerified) {
        setPermissionError(
          'Your account email address is not verified yet. Please verify your email address before signing in.'
        );
        setRole('public');
        setAuthLoading(false);
        return;
      }

      try {
        const intent = pendingAuthIntentRef.current;

        // Check admin record or bootstrapped admin email (unless explicitly signing into facilitator login with dual role)
        const adminDoc = await getDoc(doc(db, 'admins', fbUser.uid));
        const isAdminUser =
          adminDoc.exists() || (fbUser.email === BOOTSTRAPPED_ADMIN_EMAIL && fbUser.emailVerified);

        if (isAdminUser && intent !== 'facilitator') {
          const adm: AdminAccount = adminDoc.exists()
            ? (adminDoc.data() as AdminAccount)
            : {
                uid: fbUser.uid,
                name: fbUser.displayName || 'Platform Administrator',
                email: fbUser.email || BOOTSTRAPPED_ADMIN_EMAIL,
                roleTitle: 'Super Administrator',
                status: 'Active',
              };
          setCurrentAdmin(adm);
          setRole('admin');
          setAuthLoading(false);
          return;
        }

        // Check facilitator record or authorised Google email allowlist
        if (intent !== 'buyer' && intent !== 'seller' && intent !== 'admin') {
          const facResult = await resolveOrBootstrapFacilitator(fbUser);
          if (facResult.status === 'inactive') {
            setPublicPage('access-denied');
            setRole('public');
            setAuthLoading(false);
            return;
          }
          if (facResult.status === 'active') {
            setCurrentFacilitator(facResult.facilitator);
            setRole('facilitator');
            setAuthLoading(false);
            return;
          }
        }

        if (intent === 'facilitator' || intent === 'admin') {
          setRole('public');
          setAuthLoading(false);
          return;
        }

        // Check user record (buyer or seller)
        const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
        if (!userSnap.exists()) {
          // Signed in via Google for first time -> require profile completion
          setUserRecord(null);
          setRole('public');
          setPublicPage('profile-completion');
          setAuthLoading(false);
          return;
        }

        const uRec = userSnap.data() as UserRecord;
        setUserRecord(uRec);
        if (!uRec.profileCompleted) {
          setPendingOnboardingRole(uRec.role === 'seller' ? 'seller' : 'buyer');
          setRole('public');
          setPublicPage('profile-completion');
          setAuthLoading(false);
          return;
        }

        if (uRec.role === 'buyer') {
          const bSnap = await getDoc(doc(db, 'buyers', fbUser.uid));
          setCurrentBuyer(bSnap.exists() ? (bSnap.data() as BuyerAccount) : null);
          setRole('buyer');
        } else if (uRec.role === 'seller') {
          const sSnap = await getDoc(doc(db, 'sellers', fbUser.uid));
          setCurrentSeller(sSnap.exists() ? (sSnap.data() as SellerAccount) : null);
          setRole('seller');
        } else {
          setPublicPage('access-denied');
          setRole('public');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setPermissionError(msg);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // 4. Role-Specific Real-Time Firestore Listeners (Only active when authenticated & role resolved!)
  useEffect(() => {
    if (!firebaseReady || !db || !authUser || role === 'public') return;
    setDataLoading(true);
    const uid = authUser.uid;
    const unsubs: Unsubscribe[] = [];

    const onErr = (path: string) => (err: unknown) => {
      setPermissionError('Unable to sync your account data right now. Please refresh or contact support.');
      setDataLoading(false);
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch {
        // logged
      }
    };

    const done = () => setDataLoading(false);

    if (role === 'buyer') {
      unsubs.push(
        onSnapshot(doc(db, 'buyers', uid), (s) => {
          if (s.exists()) setCurrentBuyer(s.data() as BuyerAccount);
          done();
        }, onErr(`buyers/${uid}`))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'buyer_requirements'), where('buyerUid', '==', uid)), (s) => {
          setRequirements(s.docs.map((d) => d.data() as BuyerRequirement));
        }, onErr('buyer_requirements'))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'matches'), where('buyerUid', '==', uid)), (s) => {
          setMatches(s.docs.map((d) => d.data() as MatchOpportunity));
        }, onErr('matches'))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'offers'), where('partyUid', '==', uid)), (s) => {
          setOffers(s.docs.map((d) => d.data() as MarketplaceOffer));
        }, onErr('offers'))
      );
      unsubs.push(
        onSnapshot(
          query(collection(db, 'negotiations'), where('buyerUid', '==', uid), where('visibleToBuyer', '==', true)),
          (s) => setNegotiations(s.docs.map((d) => d.data() as NegotiationEntry)),
          onErr('negotiations')
        )
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'orders'), where('buyerUid', '==', uid)), (s) => {
          setOrders(s.docs.map((d) => d.data() as MarketplaceOrder));
        }, onErr('orders'))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'payments'), where('buyerUid', '==', uid)), (s) => {
          setPayments(s.docs.map((d) => d.data() as PaymentRecord));
        }, onErr('payments'))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'invoices'), where('buyerUid', '==', uid)), (s) => {
          setInvoices(s.docs.map((d) => d.data() as InvoiceRecord));
        }, onErr('invoices'))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'documents'), where('ownerUid', '==', uid)), (s) => {
          setDocuments(s.docs.map((d) => d.data() as DocumentRecord));
        }, onErr('documents'))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'notifications'), where('recipientUid', '==', uid)), (s) => {
          setNotifications(s.docs.map((d) => d.data() as NotificationItem));
        }, onErr('notifications'))
      );
    } else if (role === 'seller') {
      unsubs.push(
        onSnapshot(doc(db, 'sellers', uid), (s) => {
          if (s.exists()) setCurrentSeller(s.data() as SellerAccount);
          done();
        }, onErr(`sellers/${uid}`))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'seller_listings'), where('sellerUid', '==', uid)), (s) => {
          setListings(s.docs.map((d) => d.data() as SellerListing));
        }, onErr('seller_listings'))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'matches'), where('sellerUid', '==', uid)), (s) => {
          setMatches(s.docs.map((d) => d.data() as MatchOpportunity));
        }, onErr('matches'))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'offers'), where('partyUid', '==', uid)), (s) => {
          setOffers(s.docs.map((d) => d.data() as MarketplaceOffer));
        }, onErr('offers'))
      );
      unsubs.push(
        onSnapshot(
          query(collection(db, 'negotiations'), where('sellerUid', '==', uid), where('visibleToSeller', '==', true)),
          (s) => setNegotiations(s.docs.map((d) => d.data() as NegotiationEntry)),
          onErr('negotiations')
        )
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'orders'), where('sellerUid', '==', uid)), (s) => {
          setOrders(s.docs.map((d) => d.data() as MarketplaceOrder));
        }, onErr('orders'))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'payments'), where('sellerUid', '==', uid)), (s) => {
          setPayments(s.docs.map((d) => d.data() as PaymentRecord));
        }, onErr('payments'))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'invoices'), where('sellerUid', '==', uid)), (s) => {
          setInvoices(s.docs.map((d) => d.data() as InvoiceRecord));
        }, onErr('invoices'))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'documents'), where('ownerUid', '==', uid)), (s) => {
          setDocuments(s.docs.map((d) => d.data() as DocumentRecord));
        }, onErr('documents'))
      );
      unsubs.push(
        onSnapshot(query(collection(db, 'notifications'), where('recipientUid', '==', uid)), (s) => {
          setNotifications(s.docs.map((d) => d.data() as NotificationItem));
        }, onErr('notifications'))
      );
    } else if (role === 'facilitator' || role === 'admin') {
      unsubs.push(onSnapshot(collection(db, 'buyers'), (s) => { setBuyers(s.docs.map((d) => d.data() as BuyerAccount)); done(); }, onErr('buyers')));
      unsubs.push(onSnapshot(collection(db, 'sellers'), (s) => setSellers(s.docs.map((d) => d.data() as SellerAccount)), onErr('sellers')));
      unsubs.push(onSnapshot(collection(db, 'buyer_requirements'), (s) => setRequirements(s.docs.map((d) => d.data() as BuyerRequirement)), onErr('buyer_requirements')));
      unsubs.push(onSnapshot(collection(db, 'seller_listings'), (s) => setListings(s.docs.map((d) => d.data() as SellerListing)), onErr('seller_listings')));
      unsubs.push(onSnapshot(collection(db, 'matches'), (s) => setMatches(s.docs.map((d) => d.data() as MatchOpportunity)), onErr('matches')));
      unsubs.push(onSnapshot(collection(db, 'offers'), (s) => setOffers(s.docs.map((d) => d.data() as MarketplaceOffer)), onErr('offers')));
      unsubs.push(onSnapshot(collection(db, 'negotiations'), (s) => setNegotiations(s.docs.map((d) => d.data() as NegotiationEntry)), onErr('negotiations')));
      unsubs.push(onSnapshot(collection(db, 'orders'), (s) => setOrders(s.docs.map((d) => d.data() as MarketplaceOrder)), onErr('orders')));
      unsubs.push(onSnapshot(collection(db, 'payments'), (s) => setPayments(s.docs.map((d) => d.data() as PaymentRecord)), onErr('payments')));
      unsubs.push(onSnapshot(collection(db, 'invoices'), (s) => setInvoices(s.docs.map((d) => d.data() as InvoiceRecord)), onErr('invoices')));
      unsubs.push(onSnapshot(collection(db, 'documents'), (s) => setDocuments(s.docs.map((d) => d.data() as DocumentRecord)), onErr('documents')));
      unsubs.push(onSnapshot(query(collection(db, 'notifications'), where('recipientUid', '==', uid)), (s) => setNotifications(s.docs.map((d) => d.data() as NotificationItem)), onErr('notifications')));
      unsubs.push(onSnapshot(collection(db, 'email_delivery_logs'), (s) => setEmailDeliveryLogs(s.docs.map((d) => d.data() as EmailDeliveryLog)), onErr('email_delivery_logs')));

      if (role === 'admin') {
        unsubs.push(onSnapshot(collection(db, 'categories'), (s) => setCategories(s.docs.map((d) => d.data() as EPRCategory)), onErr('categories')));
        unsubs.push(onSnapshot(collection(db, 'subcategories'), (s) => setSubcategories(s.docs.map((d) => d.data() as EPRSubcategory)), onErr('subcategories')));
        unsubs.push(onSnapshot(collection(db, 'published_rates'), (s) => setPublishedRates(s.docs.map((d) => d.data() as PublishedEprRate)), onErr('published_rates')));
        unsubs.push(onSnapshot(collection(db, 'facilitators'), (s) => setFacilitators(s.docs.map((d) => d.data() as FacilitatorAccount)), onErr('facilitators')));
        unsubs.push(onSnapshot(collection(db, 'authorized_facilitators'), (s) => setAuthorizedFacilitators(s.docs.map((d) => d.data() as AuthorizedFacilitator)), onErr('authorized_facilitators')));
        unsubs.push(onSnapshot(collection(db, 'admins'), (s) => setAdmins(s.docs.map((d) => d.data() as AdminAccount)), onErr('admins')));
        unsubs.push(onSnapshot(collection(db, 'audit_logs'), (s) => setAuditLogs(s.docs.map((d) => d.data() as AuditLogEntry)), onErr('audit_logs')));
        unsubs.push(
          onSnapshot(doc(db, 'platform_settings', 'default'), (s) => {
            if (s.exists()) setPlatformSettings(s.data() as PlatformSettingsRecord);
          }, onErr('platform_settings/default'))
        );
        unsubs.push(
          onSnapshot(collection(db, 'seo_pages'), (s) => {
            setSeoPages(s.docs.map((d) => d.data() as SeoPageRecord));
          }, onErr('seo_pages'))
        );
        unsubs.push(
          onSnapshot(doc(db, 'seo_settings', 'default'), (s) => {
            if (s.exists()) setSeoSettings(s.data() as SeoSettingsRecord);
          }, onErr('seo_settings/default'))
        );
        unsubs.push(
          onSnapshot(collection(db, 'seo_logs'), (s) => {
            setSeoLogs(s.docs.map((d) => d.data() as SeoChangeLog));
          }, onErr('seo_logs'))
        );
      }
    }

    return () => unsubs.forEach((u) => u());
  }, [firebaseReady, authUser, role]);

  // Handle post-login deep link (?listing=...)
  useEffect(() => {
    if (!pendingListingDeepLink || role === 'public') return;
    const refId = pendingListingDeepLink;
    if (role === 'buyer') {
      if (refId.startsWith('REQ-')) {
        setBuyerTabState('requirement-details');
        setSelectedRequirementId(refId);
      } else {
        setBuyerTabState('notifications');
      }
      setPendingListingDeepLink(null);
    } else if (role === 'seller') {
      if (refId.startsWith('LST-')) {
        setSellerTabState('listing-details');
        setSelectedListingId(refId);
      } else {
        setSellerTabState('notifications');
      }
      setPendingListingDeepLink(null);
    } else if (role === 'facilitator') {
      setFacilitatorTabState(refId.startsWith('REQ-') ? 'buyer-requirements' : 'seller-listings');
      setPendingListingDeepLink(null);
    } else if (role === 'admin') {
      setAdminTab(refId.startsWith('REQ-') ? 'requirement-approval' : 'listing-approval');
      setPendingListingDeepLink(null);
    }
  }, [pendingListingDeepLink, role]);

  const signInGoogleForRole = async (targetRole: 'buyer' | 'seller' | 'facilitator' | 'admin') => {
    if (!auth) throw new Error('Authentication service is unavailable right now. Please refresh.');
    if (targetRole === 'buyer' || targetRole === 'seller') {
      setPendingOnboardingRole(targetRole);
    }
    pendingAuthIntentRef.current = targetRole;
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (!cred.user.emailVerified) {
        await signOut(auth);
        throw new Error('Your Google account email is not verified.');
      }

      if (targetRole === 'admin') {
        const admDoc = await getDoc(doc(db, 'admins', cred.user.uid));
        if (!admDoc.exists() && cred.user.email !== BOOTSTRAPPED_ADMIN_EMAIL) {
          await signOut(auth);
          setPublicPage('access-denied');
          throw new Error('This Google account is not authorised for Admin access.');
        }
      } else if (targetRole === 'facilitator') {
        const facResult = await resolveOrBootstrapFacilitator(cred.user);
        if (facResult.status !== 'active') {
          await signOut(auth);
          setPublicPage('access-denied');
          throw new Error(
            facResult.status === 'inactive'
              ? 'This facilitator account has been deactivated by an administrator.'
              : 'This Google account is not authorised for Portal Facilitator access. Please contact your administrator.'
          );
        }
        setCurrentFacilitator(facResult.facilitator);
        setRole('facilitator');
        await writeAuditLog(
          cred.user.uid,
          cred.user.email || '',
          'Facilitator',
          'Facilitator Google Sign-In',
          facResult.facilitator.employeeId,
          `Signed in with authorised Google account ${cred.user.email}`
        );
        addToast({ type: 'success', title: `Welcome, ${facResult.facilitator.name}` });
      }
    } finally {
      pendingAuthIntentRef.current = null;
    }
  };

  const signInStaffEmailPassword = async (
    email: string,
    password: string,
    expectedRole: 'facilitator' | 'admin'
  ) => {
    if (!auth) throw new Error('Authentication service is unavailable right now. Please refresh.');
    pendingAuthIntentRef.current = expectedRole;
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.emailVerified) {
        await signOut(auth);
        throw new Error(
          'This staff account email is not verified yet. Please verify the email before signing in.'
        );
      }
      if (expectedRole === 'facilitator') {
        const facResult = await resolveOrBootstrapFacilitator(cred.user);
        if (facResult.status !== 'active') {
          await signOut(auth);
          setPublicPage('access-denied');
          throw new Error('No active facilitator record found for this account.');
        }
        setCurrentFacilitator(facResult.facilitator);
        setRole('facilitator');
      } else {
        const admSnap = await getDoc(doc(db, 'admins', cred.user.uid));
        if (!admSnap.exists() && cred.user.email !== BOOTSTRAPPED_ADMIN_EMAIL) {
          await signOut(auth);
          setPublicPage('access-denied');
          throw new Error('No active administrator record found for this account.');
        }
      }
    } finally {
      pendingAuthIntentRef.current = null;
    }
  };

  const sendFacilitatorPasswordReset = async (email: string) => {
    if (!auth) throw new Error('Authentication service is unavailable right now. Please refresh.');
    const cleanEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid authorised email address.');
    }
    await sendPasswordResetEmail(auth, cleanEmail);
    addToast({ type: 'success', title: 'Password reset instructions sent to your email' });
  };

  const submitOnboardingProfile = async (data: {
    companyName: string;
    contactPerson: string;
    mobile: string;
    gstin: string;
    cin?: string;
    eprRegNo: string;
    city: string;
    state: string;
    recyclerType?: string;
    dealingCategories?: string[];
  }) => {
    if (!authUser) throw new Error('Authenticated session required.');
    const chosenRole = pendingOnboardingRole || 'buyer';
    await completeCompanyOnboarding({
      uid: authUser.uid,
      email: authUser.email || '',
      displayName: authUser.displayName || data.contactPerson,
      role: chosenRole,
      ...data,
    });
    await writeAuditLog(
      authUser.uid,
      authUser.email || '',
      chosenRole,
      'Completed Onboarding Profile',
      data.companyName,
      `Registered ${chosenRole} account with GSTIN ${data.gstin}`
    );
    setRole(chosenRole);
    addToast({ type: 'success', title: 'Company profile completed' });
  };

  const logout = async () => {
    if (auth) await signOut(auth);
    setRole('public');
    setPublicPage('home');
    setPendingOnboardingRole(null);
    setBuyers([]);
    setSellers([]);
    setFacilitators([]);
    setAuthorizedFacilitators([]);
    setAdmins([]);
    setRequirements([]);
    setListings([]);
    setMatches([]);
    setOffers([]);
    setNegotiations([]);
    setOrders([]);
    setPayments([]);
    setInvoices([]);
    setDocuments([]);
    setNotifications([]);
    setEmailDeliveryLogs([]);
    setAuditLogs([]);
    setSeoLogs([]);
    addToast({ type: 'info', title: 'Signed out' });
  };

  const triggerListingEmailDispatch = async (
    listingId: string,
    notificationType: 'buyer_requirement' | 'seller_listing'
  ) => {
    if (!authUser) return;
    try {
      const idToken = await authUser.getIdToken();
      const emailRes = await dispatchCategoryEmailNotificationsApi(idToken, listingId, notificationType);
      if (emailRes.ok) {
        if ((emailRes.dispatchedCount || 0) > 0) {
          addToast({
            type: 'success',
            title: `Email alerts sent to ${emailRes.dispatchedCount} matched ${
              notificationType === 'buyer_requirement' ? 'seller(s)' : 'buyer(s)'
            }`,
          });
        } else if ((emailRes.failedCount || 0) > 0) {
          addToast({
            type: 'warning',
            title: `${emailRes.failedCount} email alert(s) failed & logged for retry`,
            description: emailRes.providerConfigured === false
              ? 'Email delivery is currently pending activation.'
              : undefined,
          });
        }
      } else if (emailRes.error) {
        addToast({
          type: 'warning',
          title: 'Email notification dispatch skipped',
          description: emailRes.error,
        });
      }
    } catch {
      // Do not block Firestore listing save if notification endpoint is unavailable
    }
  };

  const submitBuyerRequirement = async (
    params: {
      category: EPRCategory;
      subcategory: string;
      financialYear: string;
      requiredQty: number;
      maxBuyingRate: number;
      requiredDate?: string;
      additionalNotes?: string;
    },
    asDraft = false
  ) => {
    if (!authUser) throw new Error('Authentication required');
    const id = await createBuyerRequirementDoc(
      {
        buyerUid: authUser.uid,
        ...params,
        asDraft,
      },
      platformSettings.matchingRateTolerancePercent
    );
    await writeAuditLog(
      authUser.uid,
      authUser.email || '',
      'Buyer',
      asDraft ? 'Saved Requirement Draft' : 'Submitted Requirement',
      id,
      `${params.requiredQty} ${params.category.unit} ${params.category.name}`
    );
    addToast({
      type: 'success',
      title: asDraft ? `Draft ${id} saved` : `Requirement ${id} published`,
    });
    if (!asDraft) {
      await triggerListingEmailDispatch(id, 'buyer_requirement');
    }
    return id;
  };

  const withdrawRequirement = async (id: string) => {
    try {
      await updateDoc(doc(db, 'buyer_requirements', id), {
        status: 'Withdrawn',
        updatedAt: serverTimestamp(),
      });
      addToast({ type: 'warning', title: `Requirement ${id} withdrawn` });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `buyer_requirements/${id}`);
    }
  };

  const submitSellerListing = async (
    params: {
      category: EPRCategory;
      subcategory: string;
      financialYear: string;
      listedQty: number;
      askingRate: number;
      certificateRef?: string;
      additionalInfo?: string;
    },
    asDraft = false
  ) => {
    if (!authUser) throw new Error('Authentication required');
    const isVerifiedSeller = currentSeller?.verification === 'Verified';
    const { id, status } = await createSellerListingDoc(
      {
        sellerUid: authUser.uid,
        ...params,
        asDraft,
        isVerifiedSeller,
      },
      platformSettings.matchingRateTolerancePercent
    );
    await writeAuditLog(
      authUser.uid,
      authUser.email || '',
      'Seller',
      asDraft ? 'Saved Listing Draft' : status === 'Active' ? 'Published Active Listing' : 'Submitted Listing for Approval',
      id,
      `${params.listedQty} ${params.category.unit} ${params.category.name}`
    );
    addToast({
      type: 'success',
      title: asDraft
        ? `Draft ${id} saved`
        : status === 'Active'
          ? `Listing ${id} published live`
          : `Listing ${id} submitted for Admin approval`,
    });
    if (!asDraft && status === 'Active') {
      await triggerListingEmailDispatch(id, 'seller_listing');
    }
    return id;
  };

  const updateListingStatus = async (id: string, status: SellerListing['status']) => {
    try {
      await updateDoc(doc(db, 'seller_listings', id), {
        status,
        updatedAt: serverTimestamp(),
      });
      if (role === 'admin' || role === 'facilitator') {
        const targetListing = listings.find((l) => l.id === id);
        const cat = categories.find((c) => c.id === targetListing?.categoryId);
        if (cat && targetListing) {
          await recomputeMarketRate(cat, targetListing.financialYear);
        }
      }
      addToast({ type: 'info', title: `Listing ${id} updated to ${status}` });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `seller_listings/${id}`);
    }
  };

  const editListing = async (id: string, qty: number, askingRate: number, additionalInfo: string) => {
    const existing = listings.find((l) => l.id === id);
    if (!existing) return;
    try {
      await updateDoc(doc(db, 'seller_listings', id), {
        listedQty: qty,
        remainingQty: Math.max(0, qty - existing.allocatedQty),
        askingRate,
        additionalInfo: additionalInfo.slice(0, 1000),
        updatedAt: serverTimestamp(),
      });
      if (role === 'admin' || role === 'facilitator') {
        const cat = categories.find((c) => c.id === existing.categoryId);
        if (cat) await recomputeMarketRate(cat, existing.financialYear);
      }
      addToast({ type: 'success', title: `Listing ${id} updated` });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `seller_listings/${id}`);
    }
  };

  const respondToOffer = async (
    offer: MarketplaceOffer,
    action: 'accept' | 'reject' | 'counter',
    counterRate?: number,
    counterQty?: number,
    message?: string
  ) => {
    if (!authUser) return;
    const match = matches.find((m) => m.id === offer.matchId);
    if (!match) return;
    await respondToOfferDoc({
      offer,
      match,
      actorUid: authUser.uid,
      action,
      counterRate,
      counterQty,
      message,
    });
    if (match.assignedFacilitatorUid) {
      await createNotificationIfUnique(
        match.assignedFacilitatorUid,
        'facilitator',
        'Offers',
        `Offer ${offer.id} ${action.toUpperCase()}`,
        `${offer.targetParty} responded to offer ${offer.id} on match ${match.id}.`,
        `offer_resp_${offer.id}_${action}_${Date.now()}`
      );
    }
    addToast({ type: 'success', title: `Offer ${offer.id} response recorded` });
  };

  const facilitatorSendOffer = async (
    match: MatchOpportunity,
    targetParty: 'buyer' | 'seller',
    rate: number,
    qty: number,
    expiryDate: string,
    message: string
  ) => {
    if (!authUser) return;
    const offerId = await facilitatorSendOfferDoc({
      match,
      facilitatorUid: authUser.uid,
      targetParty,
      rate,
      quantity: qty,
      expiryDate,
      message,
      gstPercent: platformSettings.gstPercent,
    });
    await writeAuditLog(
      authUser.uid,
      authUser.email || '',
      'Facilitator',
      'Issued Offer',
      offerId,
      `Sent to ${targetParty} @ ₹${rate}/${match.unit}`
    );
    addToast({ type: 'success', title: `Offer ${offerId} sent to ${targetParty}` });
  };

  const facilitatorAddNote = async (match: MatchOpportunity, note: string) => {
    if (!authUser) return;
    const negId = `NEG-${Date.now()}`;
    try {
      await setDoc(doc(db, 'negotiations', negId), {
        id: negId,
        matchId: match.id,
        buyerUid: match.buyerUid,
        sellerUid: match.sellerUid,
        actor: 'Facilitator',
        actorUid: authUser.uid,
        actionType: 'Facilitator Note',
        message: note.slice(0, 1000),
        visibleToBuyer: false,
        visibleToSeller: false,
        createdAt: serverTimestamp(),
      });
      addToast({ type: 'info', title: 'Facilitator note recorded' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `negotiations/${negId}`);
    }
  };

  const facilitatorConfirmAgreement = async (match: MatchOpportunity, agreedRate: number) => {
    if (!authUser) return;
    const orderId = await confirmMatchAndCreateOrderDoc({
      match,
      facilitatorUid: authUser.uid,
      agreedRate,
      settings: platformSettings,
    });
    await writeAuditLog(
      authUser.uid,
      authUser.email || '',
      'Facilitator',
      'Confirmed Deal & Created Order',
      orderId,
      `Match ${match.id} agreed @ ₹${agreedRate}`
    );
    addToast({ type: 'success', title: `Order ${orderId} created` });
  };

  const updateOrderStatus = async (
    order: MarketplaceOrder,
    orderStatus: OrderStatus,
    paymentStatus?: MarketplaceOrder['paymentStatus'],
    transferStatus?: MarketplaceOrder['transferStatus']
  ) => {
    const cat = categories.find((c) => c.id === order.categoryId);
    await updateOrderStatusDoc({
      order,
      orderStatus,
      paymentStatus,
      transferStatus,
      category: cat,
    });
    addToast({ type: 'success', title: `Order ${order.id} updated to ${orderStatus}` });
  };

  const adminApproveListing = async (listing: SellerListing, decision: 'Active' | 'Rejected') => {
    if (!authUser) return;
    try {
      await updateDoc(doc(db, 'seller_listings', listing.id), {
        status: decision,
        updatedAt: serverTimestamp(),
      });
      const cat = categories.find((c) => c.id === listing.categoryId);
      if (cat) await recomputeMarketRate(cat, listing.financialYear);
      if (decision === 'Active') {
        await runMatchingForListing({ ...listing, status: 'Active' }, platformSettings.matchingRateTolerancePercent);
        await triggerListingEmailDispatch(listing.id, 'seller_listing');
      }
      await writeAuditLog(
        authUser.uid,
        authUser.email || '',
        'Admin',
        `Listing ${decision}`,
        listing.id,
        `${listing.categoryName} (${listing.listedQty} ${listing.unit})`
      );
      addToast({ type: decision === 'Active' ? 'success' : 'warning', title: `Listing ${listing.id} marked ${decision}` });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `seller_listings/${listing.id}`);
    }
  };

  const adminApproveRequirement = async (req: BuyerRequirement, decision: 'Active' | 'Rejected') => {
    if (!authUser) return;
    try {
      await updateDoc(doc(db, 'buyer_requirements', req.id), {
        status: decision,
        updatedAt: serverTimestamp(),
      });
      if (decision === 'Active') {
        await runMatchingForRequirement({ ...req, status: 'Active' }, platformSettings.matchingRateTolerancePercent);
        await triggerListingEmailDispatch(req.id, 'buyer_requirement');
      }
      await writeAuditLog(
        authUser.uid,
        authUser.email || '',
        'Admin',
        `Requirement ${decision}`,
        req.id,
        `${req.categoryName} (${req.requiredQty} ${req.unit})`
      );
      addToast({ type: decision === 'Active' ? 'success' : 'warning', title: `Requirement ${req.id} marked ${decision}` });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `buyer_requirements/${req.id}`);
    }
  };

  const adminVerifyUser = async (type: 'buyer' | 'seller', uid: string, verification: 'Verified' | 'Action Required') => {
    if (!authUser) return;
    const col = type === 'buyer' ? 'buyers' : 'sellers';
    try {
      await updateDoc(doc(db, col, uid), {
        verification,
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog(authUser.uid, authUser.email || '', 'Admin', `KYC ${verification}`, uid, `Updated ${type}`);
      addToast({ type: 'success', title: `Participant ${uid} marked ${verification}` });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${col}/${uid}`);
    }
  };

  const adminSaveCategory = async (params: {
    id?: string;
    code: string;
    name: string;
    shortName: string;
    description: string;
    unit: 'MT' | 'KL' | 'Units';
    financialYears: string[];
    subcategories: string[];
    active: boolean;
  }) => {
    await saveCategoryWithSubcategories(params);
    if (authUser) {
      try {
        const idToken = await authUser.getIdToken();
        await regenerateSitemapApi(idToken);
      } catch {
        // Sitemap cache refresh is best-effort after category mutation
      }
    }
    addToast({ type: 'success', title: `Category ${params.name} saved` });
  };

  const adminToggleCategory = async (cat: EPRCategory) => {
    try {
      await updateDoc(doc(db, 'categories', cat.id), { active: !cat.active });
      if (authUser) {
        try {
          const idToken = await authUser.getIdToken();
          await regenerateSitemapApi(idToken);
        } catch {
          // Best-effort sitemap refresh
        }
      }
      addToast({ type: 'info', title: `${cat.name} ${cat.active ? 'disabled' : 'enabled'}` });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${cat.id}`);
    }
  };

  const adminSavePublishedRate = async (params: {
    id?: string;
    categoryId: string;
    categoryName: string;
    financialYear: string;
    unit: 'MT' | 'KL' | 'Units';
    rate: number;
    trend?: 'Up' | 'Down' | 'Stable';
    published: boolean;
    notes?: string;
  }) => {
    if (!authUser) throw new Error('Authentication required.');
    await savePublishedRateDoc({
      ...params,
      updatedByUid: authUser.uid,
    });
    await writeAuditLog(
      authUser.uid,
      authUser.email || '',
      'Admin',
      params.id ? 'Updated EPR Rate' : 'Added EPR Rate',
      params.categoryName,
      `₹${params.rate}/${params.unit} (${params.financialYear}) · ${params.published ? 'Published' : 'Draft'}`
    );
    addToast({
      type: 'success',
      title: `${params.categoryName} rate ${params.published ? 'published' : 'saved as draft'}`,
    });
  };

  const adminTogglePublishedRate = async (rateItem: PublishedEprRate) => {
    if (!authUser) return;
    await togglePublishedRateStatusDoc({
      id: rateItem.id,
      published: !rateItem.published,
      updatedByUid: authUser.uid,
    });
    await writeAuditLog(
      authUser.uid,
      authUser.email || '',
      'Admin',
      !rateItem.published ? 'Published EPR Rate' : 'Unpublished EPR Rate',
      rateItem.categoryName,
      `${rateItem.financialYear} · ₹${rateItem.rate}/${rateItem.unit}`
    );
    addToast({
      type: 'info',
      title: `${rateItem.categoryName} rate ${!rateItem.published ? 'published to ticker' : 'unpublished'}`,
    });
  };

  const adminDeletePublishedRate = async (rateItem: PublishedEprRate) => {
    if (!authUser) return;
    await deletePublishedRateDoc(rateItem.id);
    await writeAuditLog(
      authUser.uid,
      authUser.email || '',
      'Admin',
      'Removed EPR Rate',
      rateItem.categoryName,
      `${rateItem.financialYear} · ₹${rateItem.rate}/${rateItem.unit}`
    );
    addToast({
      type: 'warning',
      title: `Removed rate for ${rateItem.categoryName} (${rateItem.financialYear})`,
    });
  };

  const adminCreateStaffRecord = async (params: {
    roleType: 'facilitator' | 'admin';
    uid?: string;
    name: string;
    email: string;
    employeeId?: string;
    department?: string;
    roleTitle?: string;
  }) => {
    if (!authUser) return;
    const cleanEmail = params.email.trim().toLowerCase();
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
      throw new Error('Please enter a valid authorised email address.');
    }
    const cleanUid = (params.uid || '').trim();
    if (cleanUid && !/^[a-zA-Z0-9_-]{1,128}$/.test(cleanUid)) {
      throw new Error('Staff Account ID must contain only letters, numbers, hyphens, or underscores.');
    }

    if (params.roleType === 'facilitator') {
      const empId = (params.employeeId || '').trim() || `EMP-${Date.now().toString().slice(-4)}`;
      const dept = (params.department || '').trim() || 'Trading Desk';
      const allowRef = doc(db, 'authorized_facilitators', cleanEmail);
      const existingAllow = await getDoc(allowRef);
      const linkedUid = cleanUid || (existingAllow.exists() ? (existingAllow.data() as AuthorizedFacilitator).linkedUid : undefined);

      try {
        if (existingAllow.exists()) {
          await updateDoc(allowRef, {
            name: params.name.trim(),
            employeeId: empId,
            department: dept,
            status: 'Active',
            ...(linkedUid ? { linkedUid } : {}),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(allowRef, {
            email: cleanEmail,
            name: params.name.trim(),
            employeeId: empId,
            department: dept,
            status: 'Active',
            ...(linkedUid ? { linkedUid } : {}),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        if (linkedUid) {
          await setDoc(doc(db, 'facilitators', linkedUid), {
            uid: linkedUid,
            employeeId: empId,
            name: params.name.trim(),
            email: cleanEmail,
            department: dept,
            status: 'Active',
            createdAt: serverTimestamp(),
          });
        }

        await writeAuditLog(
          authUser.uid,
          authUser.email || '',
          'Admin',
          'Authorised Facilitator',
          cleanEmail,
          `Provisioned facilitator Google & portal access (${empId})`
        );
        addToast({ type: 'success', title: `Facilitator access authorised for ${cleanEmail}` });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `authorized_facilitators/${cleanEmail}`);
      }
      return;
    }

    if (!cleanUid) {
      throw new Error('Staff Account ID is required when provisioning an administrator record.');
    }
    try {
      await setDoc(doc(db, 'admins', cleanUid), {
        uid: cleanUid,
        name: params.name.trim(),
        email: cleanEmail,
        roleTitle: params.roleTitle || 'Operations Admin',
        status: 'Active',
        createdAt: serverTimestamp(),
      });
      await writeAuditLog(authUser.uid, authUser.email || '', 'Admin', 'Created admin', cleanUid, cleanEmail);
      addToast({ type: 'success', title: 'Administrator access activated' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `admins/${cleanUid}`);
    }
  };

  const adminToggleFacilitatorStatus = async (params: {
    email: string;
    uid?: string;
    currentStatus: 'Active' | 'Inactive';
  }) => {
    if (!authUser) return;
    const cleanEmail = params.email.trim().toLowerCase();
    const nextStatus: 'Active' | 'Inactive' = params.currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const allowRef = doc(db, 'authorized_facilitators', cleanEmail);
      const allowSnap = await getDoc(allowRef);
      let linkedUid = params.uid;
      if (allowSnap.exists()) {
        const allowData = allowSnap.data() as AuthorizedFacilitator;
        linkedUid = linkedUid || allowData.linkedUid;
        await updateDoc(allowRef, {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
      }
      if (linkedUid) {
        const facRef = doc(db, 'facilitators', linkedUid);
        const facSnap = await getDoc(facRef);
        if (facSnap.exists()) {
          await updateDoc(facRef, { status: nextStatus });
        }
      }
      await writeAuditLog(
        authUser.uid,
        authUser.email || '',
        'Admin',
        `${nextStatus === 'Active' ? 'Activated' : 'Deactivated'} Facilitator`,
        cleanEmail,
        `Facilitator status changed to ${nextStatus}`
      );
      addToast({ type: 'info', title: `${cleanEmail} marked ${nextStatus}` });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `authorized_facilitators/${cleanEmail}`);
    }
  };

  const adminDeleteAuthorizedFacilitator = async (email: string, uid?: string) => {
    if (!authUser) return;
    const cleanEmail = email.trim().toLowerCase();
    try {
      const allowRef = doc(db, 'authorized_facilitators', cleanEmail);
      const allowSnap = await getDoc(allowRef);
      const linkedUid = uid || (allowSnap.exists() ? (allowSnap.data() as AuthorizedFacilitator).linkedUid : undefined);
      if (allowSnap.exists()) {
        await deleteDoc(allowRef);
      }
      if (linkedUid) {
        const facRef = doc(db, 'facilitators', linkedUid);
        const facSnap = await getDoc(facRef);
        if (facSnap.exists()) {
          await deleteDoc(facRef);
        }
      }
      await writeAuditLog(
        authUser.uid,
        authUser.email || '',
        'Admin',
        'Removed Facilitator Access',
        cleanEmail,
        'Revoked portal and Google facilitator access'
      );
      addToast({ type: 'warning', title: `Removed facilitator access for ${cleanEmail}` });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `authorized_facilitators/${cleanEmail}`);
    }
  };

  const adminSavePlatformSettings = async (settings: Omit<PlatformSettingsRecord, 'id' | 'updatedAt'>) => {
    try {
      await setDoc(doc(db, 'platform_settings', 'default'), {
        id: 'default',
        ...settings,
        updatedAt: serverTimestamp(),
      });
      addToast({ type: 'success', title: 'Platform settings saved' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'platform_settings/default');
    }
  };

  const recordPayment = async (params: {
    order: MarketplaceOrder;
    partyType: 'Buyer Receivable' | 'Seller Payable';
    amount: number;
    paymentType: 'Advance' | 'Balance' | 'Settlement';
    paymentMethod: 'NEFT' | 'RTGS' | 'IMPS';
    referenceNumber: string;
    paymentDate: string;
  }) => {
    const id = `PAY-${Date.now().toString().slice(-6)}`;
    try {
      await setDoc(doc(db, 'payments', id), {
        id,
        orderId: params.order.id,
        buyerUid: params.order.buyerUid,
        sellerUid: params.order.sellerUid,
        partyType: params.partyType,
        amount: params.amount,
        paymentType: params.paymentType,
        paymentDate: params.paymentDate,
        paymentMethod: params.paymentMethod,
        referenceNumber: params.referenceNumber,
        status: 'Verified',
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'orders', params.order.id), {
        paymentStatus: params.paymentType === 'Balance' ? 'Fully Paid' : 'Advance Paid',
        orderStatus: params.paymentType === 'Balance' ? 'Payment Completed' : 'Advance Received',
        updatedAt: serverTimestamp(),
      });
      addToast({ type: 'success', title: `Payment ${id} recorded` });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `payments/${id}`);
    }
  };

  const uploadDocumentFile = async (
    category: DocumentRecord['category'],
    file: File,
    relatedId?: string
  ) => {
    if (!authUser) throw new Error('Authentication required');
    const ownerRole: 'buyer' | 'seller' | 'admin' =
      role === 'seller' ? 'seller' : role === 'admin' ? 'admin' : 'buyer';
    await uploadProtectedDocument({
      ownerUid: authUser.uid,
      ownerRole,
      category,
      file,
      relatedId,
    });
    addToast({ type: 'success', title: `Uploaded ${file.name}` });
  };

  const markNotificationRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    addToast({ type: 'info', title: 'All notifications marked read' });
  };

  const retryFailedEmails = async (notificationId?: string) => {
    if (!authUser) return;
    const idToken = await authUser.getIdToken();
    const res = await retryFailedEmailsApi(idToken, notificationId);
    if (!res.ok) {
      addToast({ type: 'error', title: 'Retry failed', description: res.error || 'Unable to retry email delivery' });
      return;
    }
    addToast({
      type: (res.sentCount || 0) > 0 ? 'success' : (res.failedCount || 0) > 0 ? 'warning' : 'info',
      title: `Retried ${res.retriedCount || 0} email(s): ${res.sentCount || 0} sent, ${res.failedCount || 0} failed`,
    });
  };

  const refreshSitemapIndex = async (
    nextPages: SeoPageRecord[],
    nextCats: EPRCategory[] = categories
  ) => {
    if (!authUser) return;
    await syncSeoSettingsSummaryDoc({
      pages: nextPages,
      categories: nextCats,
      actorUid: authUser.uid,
    });
    const idToken = await authUser.getIdToken();
    await regenerateSitemapApi(idToken);
  };

  const adminSeedSeoPages = async (forceSyncMissing = false) => {
    if (!authUser) return;
    const { seededCount } = await seedInitialSeoPagesIfEmpty({
      actorUid: authUser.uid,
      actorEmail: authUser.email || '',
      categories,
      forceSyncMissing,
    });
    const idToken = await authUser.getIdToken();
    await regenerateSitemapApi(idToken);
    addToast({
      type: 'success',
      title: seededCount > 0 ? `Synchronized ${seededCount} public SEO page(s)` : 'All default pages are already synchronized',
    });
  };

  const adminSaveSeoPage = async (params: {
    id?: string;
    slug: string;
    pageType: 'core' | 'legal' | 'custom';
    pageTitle: string;
    contentSummary: string;
    seoTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    robots?: 'index, follow' | 'noindex, nofollow';
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: 'summary_large_image' | 'summary';
    published: boolean;
    isSystemPage?: boolean;
    aiDraftSeoTitle?: string;
    aiDraftMetaDescription?: string;
    aiDraftApproved?: boolean;
  }) => {
    if (!authUser) throw new Error('Administrator authentication required.');
    const { id, isNew } = await saveSeoPageDoc({
      ...params,
      actorUid: authUser.uid,
      actorEmail: authUser.email || '',
    });
    const simulatedUpdated: SeoPageRecord = {
      id,
      slug: normalizeSlug(params.slug),
      pageType: params.pageType,
      pageTitle: params.pageTitle,
      contentSummary: params.contentSummary,
      seoTitle: params.seoTitle || '',
      metaDescription: params.metaDescription || '',
      canonicalUrl: params.canonicalUrl || '',
      robots: params.published ? params.robots || 'index, follow' : 'noindex, nofollow',
      ogTitle: params.ogTitle || params.seoTitle || '',
      ogDescription: params.ogDescription || params.metaDescription || '',
      ogImage: params.ogImage || '',
      twitterCard: params.twitterCard || 'summary_large_image',
      published: params.published,
      isSystemPage: Boolean(params.isSystemPage),
      updatedByUid: authUser.uid,
    };
    const nextPages = isNew
      ? [...seoPages, simulatedUpdated]
      : seoPages.map((p) => (p.id === id ? { ...p, ...simulatedUpdated } : p));
    await refreshSitemapIndex(nextPages);
    addToast({
      type: 'success',
      title: isNew ? `Published SEO page ${simulatedUpdated.slug}` : `Updated SEO settings for ${simulatedUpdated.slug}`,
    });
  };

  const adminToggleSeoPagePublish = async (page: SeoPageRecord) => {
    if (!authUser) return;
    const nextPublished = !page.published;
    await toggleSeoPagePublishDoc({
      page,
      published: nextPublished,
      actorUid: authUser.uid,
      actorEmail: authUser.email || '',
    });
    const nextPages = seoPages.map((p) =>
      p.id === page.id
        ? {
            ...p,
            published: nextPublished,
            robots: (nextPublished ? 'index, follow' : 'noindex, nofollow') as 'index, follow' | 'noindex, nofollow',
          }
        : p
    );
    await refreshSitemapIndex(nextPages);
    addToast({
      type: nextPublished ? 'success' : 'warning',
      title: `${page.slug} ${nextPublished ? 'published to sitemap' : 'unpublished (excluded from search indexing)'}`,
    });
  };

  const adminDeleteSeoPage = async (page: SeoPageRecord) => {
    if (!authUser) return;
    await deleteSeoPageDoc({
      page,
      actorUid: authUser.uid,
      actorEmail: authUser.email || '',
    });
    const nextPages = seoPages.filter((p) => p.id !== page.id);
    await refreshSitemapIndex(nextPages);
    addToast({
      type: 'warning',
      title: `Deleted custom page ${page.slug} and updated sitemap`,
    });
  };

  const adminRegenerateSitemap = async () => {
    if (!authUser) return;
    await syncSeoSettingsSummaryDoc({
      pages: seoPages,
      categories,
      actorUid: authUser.uid,
    });
    const audit = auditSeoPages(
      seoPages.map(toSeoPageInput),
      categories.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        shortName: c.shortName,
        description: c.description,
        unit: c.unit,
        active: c.active,
      }))
    );
    await writeSeoLogDoc({
      action: 'Sitemap Regenerated',
      pageId: 'sitemap-index',
      slug: '/sitemap.xml',
      details: `Manual sitemap regeneration completed (${audit.totalUrlsInSitemap} indexable URLs · ${audit.sitemapStatus}).`,
      actorUid: authUser.uid,
      actorEmail: authUser.email || '',
    });
    const idToken = await authUser.getIdToken();
    const res = await regenerateSitemapApi(idToken);
    if (!res.ok && res.error) {
      addToast({ type: 'warning', title: 'Sitemap metadata updated', description: res.error });
      return;
    }
    addToast({
      type: 'success',
      title: `Sitemap regenerated (${audit.totalUrlsInSitemap} URLs indexed)`,
    });
  };

  const adminRequestSeoSuggestion = async (input: {
    pageTitle: string;
    slug: string;
    contentSummary: string;
    existingTitles: string[];
  }) => {
    if (!authUser) {
      return { error: 'Administrator sign-in required.' };
    }
    const idToken = await authUser.getIdToken();
    const res = await requestSeoSuggestionApi(idToken, input);
    if (res.ok && authUser) {
      await writeSeoLogDoc({
        action: 'Draft Generated',
        pageId: normalizeSlug(input.slug),
        slug: normalizeSlug(input.slug),
        details: 'Generated unapproved SEO title & description suggestion for Admin review.',
        actorUid: authUser.uid,
        actorEmail: authUser.email || '',
      });
    }
    return res;
  };

  return (
    <MarketplaceContext.Provider
      value={{
        firebaseReady,
        connectionError,
        permissionError,
        authLoading,
        dataLoading,
        authUser,
        userRecord,
        pendingOnboardingRole,
        role,
        publicPage,
        activeCustomSlug,
        selectedCategoryId,
        buyerTab,
        sellerTab,
        facilitatorTab,
        adminTab,
        selectedRequirementId,
        selectedListingId,
        selectedMatchId,
        selectedOfferId,
        selectedOrderId,
        currentBuyer,
        currentSeller,
        currentFacilitator,
        currentAdmin,
        categories,
        subcategories,
        marketRates,
        publishedRates,
        transactions,
        buyers,
        sellers,
        facilitators,
        authorizedFacilitators,
        admins,
        requirements,
        listings,
        publicListings,
        matches,
        offers,
        negotiations,
        orders,
        payments,
        invoices,
        documents,
        notifications,
        emailDeliveryLogs,
        auditLogs,
        platformSettings,
        seoPages,
        seoSettings,
        seoLogs,
        toasts,
        navigatePublic,
        setBuyerTab,
        setSellerTab,
        setFacilitatorTab,
        setAdminTab,
        signInGoogleForRole,
        signInStaffEmailPassword,
        sendFacilitatorPasswordReset,
        submitOnboardingProfile,
        logout,
        addToast,
        dismissToast,
        submitBuyerRequirement,
        withdrawRequirement,
        submitSellerListing,
        updateListingStatus,
        editListing,
        respondToOffer,
        facilitatorSendOffer,
        facilitatorAddNote,
        facilitatorConfirmAgreement,
        updateOrderStatus,
        adminApproveListing,
        adminApproveRequirement,
        adminVerifyUser,
        adminSaveCategory,
        adminToggleCategory,
        adminSavePublishedRate,
        adminTogglePublishedRate,
        adminDeletePublishedRate,
        adminCreateStaffRecord,
        adminToggleFacilitatorStatus,
        adminDeleteAuthorizedFacilitator,
        adminSavePlatformSettings,
        recordPayment,
        uploadDocumentFile,
        markNotificationRead,
        markAllNotificationsRead,
        retryFailedEmails,
        adminSeedSeoPages,
        adminSaveSeoPage,
        adminToggleSeoPagePublish,
        adminDeleteSeoPage,
        adminRegenerateSitemap,
        adminRequestSeoSuggestion,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = () => {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error('useMarketplace must be used within MarketplaceProvider');
  return ctx;
};
