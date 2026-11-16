import { Timestamp } from 'firebase/firestore';

export type UserRole = 'public' | 'buyer' | 'seller' | 'facilitator' | 'admin';

export type PublicPage =
  | 'home'
  | 'marketplace'
  | 'market-rates'
  | 'category-details'
  | 'how-it-works'
  | 'buy-credits'
  | 'sell-credits'
  | 'about'
  | 'contact'
  | 'faq'
  | 'terms'
  | 'privacy'
  | 'refund'
  | 'disclaimer'
  | 'buyer-guidelines'
  | 'seller-guidelines'
  | 'grievance'
  | 'login'
  | 'login-error'
  | 'access-denied'
  | 'profile-completion'
  | 'password-reset'
  | 'custom-page';

export type BuyerTab =
  | 'overview'
  | 'company-profile'
  | 'verification'
  | 'submit-requirement'
  | 'my-requirements'
  | 'requirement-details'
  | 'matching-opportunities'
  | 'offers-received'
  | 'offer-details'
  | 'negotiation-history'
  | 'my-orders'
  | 'order-details'
  | 'payments'
  | 'documents'
  | 'notifications'
  | 'settings';

export type SellerTab =
  | 'overview'
  | 'company-profile'
  | 'verification'
  | 'create-listing'
  | 'my-listings'
  | 'listing-details'
  | 'matching-opportunities'
  | 'offers-received'
  | 'offer-details'
  | 'negotiation-history'
  | 'my-orders'
  | 'order-details'
  | 'payments'
  | 'documents'
  | 'notifications'
  | 'settings';

export type FacilitatorTab =
  | 'overview'
  | 'buyers'
  | 'sellers'
  | 'buyer-requirements'
  | 'seller-listings'
  | 'matching-opportunities'
  | 'match-details'
  | 'negotiations'
  | 'offers'
  | 'orders'
  | 'payments'
  | 'transaction-tracking'
  | 'notifications'
  | 'profile';

export type AdminTab =
  | 'overview'
  | 'buyers'
  | 'sellers'
  | 'facilitators'
  | 'admin-users'
  | 'categories'
  | 'listing-approval'
  | 'requirement-approval'
  | 'inventory'
  | 'rate-board'
  | 'matching-engine'
  | 'negotiations'
  | 'orders'
  | 'payments'
  | 'gst-invoices'
  | 'brokerage'
  | 'documents'
  | 'reports'
  | 'audit-logs'
  | 'notifications'
  | 'seo'
  | 'settings'
  | 'permissions';

export type FirestoreTime = Timestamp | string | null | undefined;

export function formatTime(val: FirestoreTime): string {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  if (typeof (val as Timestamp).toDate === 'function') {
    return (val as Timestamp).toDate().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return '—';
}

export interface UserRecord {
  uid: string;
  email: string;
  displayName?: string;
  role: Exclude<UserRole, 'public'>;
  companyId?: string;
  profileCompleted: boolean;
  status: 'Active' | 'Suspended' | 'Pending';
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export interface CompanyRecord {
  id: string;
  ownerUid: string;
  companyName: string;
  gstin: string;
  cin?: string;
  eprRegNo: string;
  city: string;
  state: string;
  createdAt?: FirestoreTime;
}

export interface EPRCategory {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  unit: 'MT' | 'KL' | 'Units';
  financialYears?: string[];
  active: boolean;
  createdAt?: FirestoreTime;
}

export interface EPRSubcategory {
  id: string;
  categoryId: string;
  name: string;
  active: boolean;
  createdAt?: FirestoreTime;
}

export interface MarketRateRecord {
  id: string;
  categoryId: string;
  categoryName: string;
  financialYear: string;
  unit: string;
  lowestAskingRate?: number;
  highestAskingRate?: number;
  indicativeRate?: number;
  lastTradedRate?: number;
  availableQty: number;
  updatedAt?: FirestoreTime;
}

export interface PublishedEprRate {
  id: string;
  categoryId: string;
  categoryName: string;
  financialYear: string;
  unit: 'MT' | 'KL' | 'Units';
  rate: number;
  trend?: 'Up' | 'Down' | 'Stable';
  published: boolean;
  notes?: string;
  updatedByUid: string;
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export interface BuyerAccount {
  uid: string;
  companyId: string;
  companyName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  gstin: string;
  cin?: string;
  eprRegNo: string;
  city?: string;
  state?: string;
  dealingCategories?: string[];
  emailNotificationsEnabled?: boolean;
  verification: 'Verified' | 'Pending Review' | 'Action Required';
  status: 'Active' | 'Suspended' | 'Pending';
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export interface SellerAccount {
  uid: string;
  companyId: string;
  companyName: string;
  contactPerson: string;
  email: string;
  mobile: string;
  gstin: string;
  cin?: string;
  eprRegNo: string;
  recyclerType: string;
  city?: string;
  state?: string;
  dealingCategories?: string[];
  emailNotificationsEnabled?: boolean;
  verification: 'Verified' | 'Pending Review' | 'Action Required';
  status: 'Active' | 'Suspended' | 'Pending';
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export interface FacilitatorAccount {
  uid: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  status: 'Active' | 'Inactive';
  createdAt?: FirestoreTime;
}

export interface AuthorizedFacilitator {
  email: string;
  name: string;
  employeeId: string;
  department?: string;
  status: 'Active' | 'Inactive';
  linkedUid?: string;
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export interface AdminAccount {
  uid: string;
  name: string;
  email: string;
  roleTitle: string;
  status: 'Active' | 'Inactive';
  createdAt?: FirestoreTime;
}

export type RequirementStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Active'
  | 'Partially Matched'
  | 'Matched'
  | 'Order Confirmed'
  | 'Rejected'
  | 'Withdrawn';

export interface BuyerRequirement {
  id: string;
  buyerUid: string;
  categoryId: string;
  categoryName: string;
  subcategory: string;
  financialYear: string;
  requiredQty: number;
  matchedQty: number;
  remainingQty: number;
  unit: string;
  maxBuyingRate: number;
  requiredDate?: string;
  additionalNotes?: string;
  status: RequirementStatus;
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export type ListingStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Active'
  | 'Paused'
  | 'Partially Allocated'
  | 'Allocated'
  | 'Rejected'
  | 'Withdrawn';

export interface SellerListing {
  id: string;
  sellerUid: string;
  categoryId: string;
  categoryName: string;
  subcategory: string;
  financialYear: string;
  listedQty: number;
  allocatedQty: number;
  remainingQty: number;
  unit: string;
  askingRate: number;
  certificateRef?: string;
  additionalInfo?: string;
  status: ListingStatus;
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export type MatchStatus =
  | 'New Match'
  | 'Under Facilitator Review'
  | 'Offer Shared'
  | 'Negotiation In Progress'
  | 'Agreed'
  | 'Order Created'
  | 'Closed';

export interface MatchOpportunity {
  id: string;
  matchKey: string;
  requirementId: string;
  listingId: string;
  buyerUid: string;
  sellerUid: string;
  categoryId: string;
  categoryName: string;
  subcategory: string;
  financialYear: string;
  matchingQty: number;
  unit: string;
  buyerTargetRate: number;
  sellerAskingRate: number;
  indicativeRate: number;
  status: MatchStatus;
  assignedFacilitatorUid?: string;
  buyerAgreed: boolean;
  sellerAgreed: boolean;
  finalAgreedRate?: number;
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export interface NegotiationEntry {
  id: string;
  matchId: string;
  buyerUid: string;
  sellerUid: string;
  actor: 'Buyer' | 'Seller' | 'Facilitator';
  actorUid: string;
  actionType: 'Offer Sent' | 'Counteroffer' | 'Accepted' | 'Rejected' | 'Facilitator Note';
  rate?: number;
  quantity?: number;
  message: string;
  visibleToBuyer: boolean;
  visibleToSeller: boolean;
  createdAt?: FirestoreTime;
}

export type OfferStatus = 'Pending Response' | 'Accepted' | 'Rejected' | 'Countered' | 'Expired';

export interface MarketplaceOffer {
  id: string;
  matchId: string;
  targetParty: 'buyer' | 'seller';
  partyUid: string;
  categoryName: string;
  subcategory: string;
  financialYear: string;
  quantity: number;
  unit: string;
  offeredRate: number;
  gstPercent: number;
  expiryDate: string;
  facilitatorMessage: string;
  status: OfferStatus;
  createdByUid: string;
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export type OrderStatus =
  | 'Deal Confirmed'
  | 'Payment Pending'
  | 'Advance Received'
  | 'Payment Completed'
  | 'EPR Credit Transfer Pending'
  | 'Transfer Verification Pending'
  | 'Transaction Completed';

export interface MarketplaceOrder {
  id: string;
  matchId: string;
  buyerUid: string;
  sellerUid: string;
  categoryId: string;
  categoryName: string;
  subcategory: string;
  financialYear: string;
  quantity: number;
  unit: string;
  agreedRate: number;
  basicAmount: number;
  gstAmount: number;
  totalAmount: number;
  brokerageAmount: number;
  paymentStatus: 'Unpaid' | 'Advance Paid' | 'Fully Paid';
  transferStatus: 'Not Started' | 'Pending Transfer' | 'Verification Pending' | 'Transferred';
  orderStatus: OrderStatus;
  invoiceNumber: string;
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  buyerUid: string;
  sellerUid: string;
  partyType: 'Buyer Receivable' | 'Seller Payable';
  amount: number;
  paymentType: 'Advance' | 'Balance' | 'Settlement';
  paymentDate: string;
  paymentMethod: 'NEFT' | 'RTGS' | 'IMPS';
  referenceNumber: string;
  status: 'Verified' | 'Pending Verification' | 'Scheduled';
  createdAt?: FirestoreTime;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  orderId: string;
  buyerUid: string;
  sellerUid: string;
  basicAmount: number;
  gstAmount: number;
  totalAmount: number;
  storageUrl?: string;
  createdAt?: FirestoreTime;
}

export interface TransactionRecord {
  id: string;
  orderId: string;
  categoryId: string;
  categoryName: string;
  financialYear: string;
  quantity: number;
  unit: string;
  tradedRate: number;
  totalValue: number;
  completedAt?: FirestoreTime;
}

export interface DocumentRecord {
  id: string;
  ownerUid: string;
  ownerRole: 'buyer' | 'seller' | 'admin';
  category:
    | 'Company Registration'
    | 'GST Certificates'
    | 'EPR Registration Details'
    | 'EPR Certificates'
    | 'Supporting Documents'
    | 'Invoices'
    | 'Payment Proofs';
  fileName: string;
  storagePath: string;
  downloadUrl: string;
  contentType?: string;
  fileSizeBytes: number;
  verificationStatus: 'Verified' | 'Pending Review' | 'Rejected';
  relatedId?: string;
  createdAt?: FirestoreTime;
}

export interface NotificationItem {
  id: string;
  notificationId?: string;
  recipientUid: string;
  targetRole: Exclude<UserRole, 'public'>;
  category:
    | 'Requirement Updates'
    | 'Listing Updates'
    | 'Matching Notifications'
    | 'Offers'
    | 'Negotiations'
    | 'Orders'
    | 'Payments'
    | 'Documents'
    | 'Account Updates';
  title: string;
  message: string;
  dedupeKey: string;
  listingId?: string;
  categoryId?: string;
  categoryName?: string;
  notificationType?: 'buyer_requirement' | 'seller_listing';
  emailStatus?: 'pending' | 'sent' | 'failed';
  sentAt?: FirestoreTime;
  errorMessage?: string;
  read: boolean;
  createdAt?: FirestoreTime;
}

export interface EmailDeliveryLog {
  notificationId: string;
  listingId: string;
  recipientUserId: string;
  recipientEmail: string;
  recipientRole: 'buyer' | 'seller';
  categoryId: string;
  category: string;
  notificationType: 'buyer_requirement' | 'seller_listing';
  subject: string;
  status: 'pending' | 'sent' | 'failed';
  attemptCount: number;
  provider: 'resend' | 'sendgrid' | 'smtp' | 'none';
  providerMessageId?: string;
  providerResponse?: string;
  errorMessage?: string;
  createdAt?: FirestoreTime;
  sentAt?: FirestoreTime;
  lastAttemptAt?: FirestoreTime;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  role: string;
  action: string;
  target: string;
  details: string;
  createdAt?: FirestoreTime;
}

export interface PlatformSettingsRecord {
  id: string;
  defaultBrokeragePercent: number;
  gstPercent: number;
  matchingRateTolerancePercent: number;
  updatedAt?: FirestoreTime;
}

export interface SeoPageRecord {
  id: string;
  slug: string;
  pageType: 'core' | 'legal' | 'custom';
  pageTitle: string;
  contentSummary: string;
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  robots: 'index, follow' | 'noindex, nofollow';
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: 'summary_large_image' | 'summary';
  published: boolean;
  isSystemPage: boolean;
  aiDraftSeoTitle?: string;
  aiDraftMetaDescription?: string;
  aiDraftApproved?: boolean;
  updatedByUid: string;
  createdAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export interface SeoSettingsRecord {
  id: string;
  canonicalDomain: string;
  sitemapStatus: 'Healthy' | 'Needs Attention';
  totalUrls: number;
  lastRegeneratedByUid: string;
  lastRegeneratedAt?: FirestoreTime;
  updatedAt?: FirestoreTime;
}

export interface SeoChangeLog {
  id: string;
  action:
    | 'Seeded'
    | 'Published'
    | 'Edited'
    | 'Unpublished'
    | 'Deleted'
    | 'Sitemap Regenerated'
    | 'Draft Generated';
  pageId: string;
  slug: string;
  details: string;
  actorUid: string;
  actorEmail: string;
  createdAt?: FirestoreTime;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
}
