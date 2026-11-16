import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  CreditCard,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Globe,
  Handshake,
  IndianRupee,
  LayoutDashboard,
  Lock,
  Mail,
  MessageSquare,
  PackageCheck,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { PortalShell, SidebarNavItem } from './PortalShell';
import {
  Button,
  ConfirmModal,
  CsvExportButton,
  EmptyState,
  EprRateTickerBar,
  formatINR,
  MetricCard,
  Modal,
  SimpleBarChart,
  StatusBadge,
} from '../ui/DesignSystem';
import { DocumentsView, NotificationsView, PaymentsView } from './SharedPortalViews';
import {
  AdminTab,
  BuyerRequirement,
  EPRCategory,
  EmailDeliveryLog,
  PublishedEprRate,
  SellerListing,
  SeoPageRecord,
  formatTime,
} from '../../types';
import {
  auditSeoPages,
  buildCanonicalUrl,
  CANONICAL_ORIGIN,
  DEFAULT_OG_IMAGE_URL,
  DEFAULT_PUBLIC_SEO_PAGES,
  normalizeSlug,
  validateCanonicalUrl,
} from '../../../shared/seoEngine';
import { toSeoPageInput } from '../../services/seoService';

export const AdminPortal: React.FC = () => {
  const {
    adminTab,
    setAdminTab,
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
    matches,
    negotiations,
    orders,
    payments,
    auditLogs,
    notifications,
    emailDeliveryLogs,
    platformSettings,
    seoPages,
    seoSettings,
    seoLogs,
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
    retryFailedEmails,
    adminSeedSeoPages,
    adminSaveSeoPage,
    adminToggleSeoPagePublish,
    adminDeleteSeoPage,
    adminRegenerateSitemap,
    adminRequestSeoSuggestion,
    addToast,
  } = useMarketplace();

  const unreadNotifs = notifications.filter((n) => n.targetRole === 'admin' && !n.read).length;

  const [approvalConfirm, setApprovalConfirm] = useState<{
    kind: 'listing' | 'requirement';
    listing?: SellerListing;
    requirement?: BuyerRequirement;
    id: string;
    decision: 'Active' | 'Rejected';
  } | null>(null);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editCat, setEditCat] = useState<EPRCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catShortName, setCatShortName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catUnit, setCatUnit] = useState<'MT' | 'KL' | 'Units'>('MT');
  const [catSubcats, setCatSubcats] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  const [staffModalRole, setStaffModalRole] = useState<'facilitator' | 'admin' | null>(null);
  const [staffUid, setStaffUid] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffExtra, setStaffExtra] = useState('');
  const [savingStaff, setSavingStaff] = useState(false);
  const [removeFacTarget, setRemoveFacTarget] = useState<{ email: string; uid?: string; name: string } | null>(null);

  const [reportType, setReportType] = useState('Order-wise');
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payOrderId, setPayOrderId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payType, setPayType] = useState<'Advance' | 'Balance' | 'Settlement'>('Balance');
  const [payMethod, setPayMethod] = useState<'NEFT' | 'RTGS' | 'IMPS'>('RTGS');

  const [brokeragePct, setBrokeragePct] = useState(String(platformSettings.defaultBrokeragePercent));
  const [gstPct, setGstPct] = useState(String(platformSettings.gstPercent));
  const [tolerancePct, setTolerancePct] = useState(String(platformSettings.matchingRateTolerancePercent));
  const [savingSettings, setSavingSettings] = useState(false);
  const [emailLogFilter, setEmailLogFilter] = useState<'ALL' | 'sent' | 'failed' | 'pending'>('ALL');
  const [retryingEmails, setRetryingEmails] = useState(false);

  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [editRateItem, setEditRateItem] = useState<PublishedEprRate | null>(null);
  const [rateCatId, setRateCatId] = useState('');
  const [rateCustomName, setRateCustomName] = useState('');
  const [rateUnit, setRateUnit] = useState<'MT' | 'KL' | 'Units'>('MT');
  const [rateFy, setRateFy] = useState('FY 2025-26');
  const [rateValue, setRateValue] = useState('');
  const [rateTrend, setRateTrend] = useState<'Up' | 'Down' | 'Stable'>('Stable');
  const [rateNotes, setRateNotes] = useState('');
  const [ratePublished, setRatePublished] = useState(true);
  const [savingRate, setSavingRate] = useState(false);
  const [deleteRateConfirm, setDeleteRateConfirm] = useState<PublishedEprRate | null>(null);

  const [seoSearch, setSeoSearch] = useState('');
  const [seoFilter, setSeoFilter] = useState<'ALL' | 'PUBLISHED' | 'UNPUBLISHED' | 'ISSUES'>('ALL');
  const [regeneratingSitemap, setRegeneratingSitemap] = useState(false);
  const [seedingSeo, setSeedingSeo] = useState(false);
  const [seoModalOpen, setSeoModalOpen] = useState(false);
  const [editSeoPage, setEditSeoPage] = useState<SeoPageRecord | null>(null);
  const [seoSlug, setSeoSlug] = useState('');
  const [seoPageType, setSeoPageType] = useState<'core' | 'legal' | 'custom'>('custom');
  const [seoPageTitle, setSeoPageTitle] = useState('');
  const [seoContentSummary, setSeoContentSummary] = useState('');
  const [seoMetaTitle, setSeoMetaTitle] = useState('');
  const [seoMetaDesc, setSeoMetaDesc] = useState('');
  const [seoCanonical, setSeoCanonical] = useState('');
  const [seoRobots, setSeoRobots] = useState<'index, follow' | 'noindex, nofollow'>('index, follow');
  const [seoOgTitle, setSeoOgTitle] = useState('');
  const [seoOgDesc, setSeoOgDesc] = useState('');
  const [seoOgImage, setSeoOgImage] = useState(DEFAULT_OG_IMAGE_URL);
  const [seoTwitterCard, setSeoTwitterCard] = useState<'summary_large_image' | 'summary'>('summary_large_image');
  const [seoPublished, setSeoPublished] = useState(true);
  const [savingSeo, setSavingSeo] = useState(false);
  const [generatingSeoDraft, setGeneratingSeoDraft] = useState(false);
  const [unapprovedDraft, setUnapprovedDraft] = useState<{
    seoTitle: string;
    metaDescription: string;
    usedAi?: boolean;
  } | null>(null);
  const [draftApprovedFlag, setDraftApprovedFlag] = useState<boolean | undefined>(undefined);
  const [deleteSeoConfirm, setDeleteSeoConfirm] = useState<SeoPageRecord | null>(null);

  const openSeoEditor = (existing?: SeoPageRecord) => {
    setUnapprovedDraft(null);
    if (existing) {
      setEditSeoPage(existing);
      setSeoSlug(existing.slug);
      setSeoPageType(existing.pageType);
      setSeoPageTitle(existing.pageTitle);
      setSeoContentSummary(existing.contentSummary);
      setSeoMetaTitle(existing.seoTitle || '');
      setSeoMetaDesc(existing.metaDescription || '');
      setSeoCanonical(existing.canonicalUrl || buildCanonicalUrl(existing.slug));
      setSeoRobots(existing.robots || 'index, follow');
      setSeoOgTitle(existing.ogTitle || '');
      setSeoOgDesc(existing.ogDescription || '');
      setSeoOgImage(existing.ogImage || DEFAULT_OG_IMAGE_URL);
      setSeoTwitterCard(existing.twitterCard || 'summary_large_image');
      setSeoPublished(existing.published);
      setDraftApprovedFlag(existing.aiDraftApproved);
    } else {
      setEditSeoPage(null);
      setSeoSlug('/epr-compliance-guide');
      setSeoPageType('custom');
      setSeoPageTitle('');
      setSeoContentSummary('');
      setSeoMetaTitle('');
      setSeoMetaDesc('');
      setSeoCanonical(buildCanonicalUrl('/epr-compliance-guide'));
      setSeoRobots('index, follow');
      setSeoOgTitle('');
      setSeoOgDesc('');
      setSeoOgImage(DEFAULT_OG_IMAGE_URL);
      setSeoTwitterCard('summary_large_image');
      setSeoPublished(true);
      setDraftApprovedFlag(undefined);
    }
    setSeoModalOpen(true);
  };

  const openRateEditor = (existing?: PublishedEprRate) => {
    if (existing) {
      setEditRateItem(existing);
      const matchedCat = categories.find((c) => c.id === existing.categoryId);
      setRateCatId(matchedCat ? matchedCat.id : 'CUSTOM');
      setRateCustomName(existing.categoryName);
      setRateUnit(existing.unit);
      setRateFy(existing.financialYear);
      setRateValue(String(existing.rate));
      setRateTrend(existing.trend || 'Stable');
      setRateNotes(existing.notes || '');
      setRatePublished(existing.published);
    } else {
      const firstCat = categories[0];
      setEditRateItem(null);
      setRateCatId(firstCat ? firstCat.id : 'CUSTOM');
      setRateCustomName(firstCat ? firstCat.name : '');
      setRateUnit(firstCat ? firstCat.unit : 'MT');
      setRateFy('FY 2025-26');
      setRateValue('');
      setRateTrend('Stable');
      setRateNotes('');
      setRatePublished(true);
    }
    setRateModalOpen(true);
  };

  useEffect(() => {
    setBrokeragePct(String(platformSettings.defaultBrokeragePercent));
    setGstPct(String(platformSettings.gstPercent));
    setTolerancePct(String(platformSettings.matchingRateTolerancePercent));
  }, [platformSettings]);

  const getBuyerName = (uid: string) => buyers.find((b) => b.uid === uid)?.companyName || uid;
  const getSellerName = (uid: string) => sellers.find((s) => s.uid === uid)?.companyName || uid;
  const getCategoryAvailQty = (catId: string) =>
    marketRates.filter((r) => r.categoryId === catId).reduce((s, r) => s + r.availableQty, 0);

  const totalAvailQty = marketRates.reduce((s, r) => s + r.availableQty, 0);
  const totalRevenue = orders.reduce((s, o) => s + o.brokerageAmount, 0);

  const txByCategory = categories
    .map((c) => ({
      label: c.shortName || c.name,
      value: transactions.filter((t) => t.categoryId === c.id).reduce((s, t) => s + t.quantity, 0),
    }))
    .filter((d) => d.value > 0);

  const navItems: SidebarNavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'buyers', label: 'Buyers', icon: Users },
    { id: 'sellers', label: 'Sellers', icon: Building2 },
    { id: 'facilitators', label: 'Facilitators', icon: UserCheck },
    { id: 'admin-users', label: 'Admin Users', icon: Shield },
    { id: 'categories', label: 'Categories', icon: FolderKanban },
    {
      id: 'listing-approval',
      label: 'Listing Approval',
      icon: ClipboardCheck,
      badge: listings.filter((l) => l.status === 'Pending Approval').length,
    },
    {
      id: 'requirement-approval',
      label: 'Requirement Approval',
      icon: CheckCircle2,
      badge: requirements.filter((r) => r.status === 'Pending Approval').length,
    },
    { id: 'inventory', label: 'Marketplace Inventory', icon: PackageCheck },
    { id: 'rate-board', label: 'Rate Management', icon: TrendingUp },
    { id: 'matching-engine', label: 'Matching Engine', icon: Cpu },
    { id: 'negotiations', label: 'Negotiations', icon: MessageSquare },
    { id: 'orders', label: 'Order Management', icon: Handshake },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'gst-invoices', label: 'GST & Invoices', icon: Receipt },
    { id: 'brokerage', label: 'Brokerage & Revenue', icon: IndianRupee },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileSpreadsheet },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
    { id: 'seo', label: 'SEO Management', icon: Globe },
    { id: 'settings', label: 'Platform Settings', icon: Settings },
    { id: 'permissions', label: 'Permissions', icon: Lock },
  ];

  const openCategoryEditor = (c?: EPRCategory) => {
    if (c) {
      setEditCat(c);
      setCatName(c.name);
      setCatShortName(c.shortName || c.name);
      setCatCode(c.code);
      setCatDesc(c.description || '');
      setCatUnit(c.unit);
      const existingSubs = subcategories.filter((s) => s.categoryId === c.id).map((s) => s.name);
      setCatSubcats(existingSubs.join(', '));
    } else {
      setEditCat(null);
      setCatName('');
      setCatShortName('');
      setCatCode('');
      setCatDesc('');
      setCatUnit('MT');
      setCatSubcats('Category I, Category II');
    }
    setCatModalOpen(true);
  };

  const buildReportDataset = (): { headers: string[]; rows: (string | number)[][] } => {
    switch (reportType) {
      case 'Buyer-wise':
        return {
          headers: ['Account ID', 'Company', 'Contact', 'Mobile', 'Email', 'GSTIN', 'Verification', 'Status'],
          rows: buyers.map((b) => [b.uid, b.companyName, b.contactPerson, b.mobile, b.email, b.gstin, b.verification, b.status]),
        };
      case 'Seller-wise':
        return {
          headers: ['Account ID', 'Company', 'Type', 'Mobile', 'Email', 'GSTIN', 'Verification', 'Status'],
          rows: sellers.map((s) => [s.uid, s.companyName, s.recyclerType, s.mobile, s.email, s.gstin, s.verification, s.status]),
        };
      case 'Category-wise':
        return {
          headers: ['Category Code', 'Category Name', 'Unit', 'Available Qty', 'Active'],
          rows: categories.map((c) => [c.code, c.name, c.unit, getCategoryAvailQty(c.id), c.active ? 'Yes' : 'No']),
        };
      case 'Listing-wise':
        return {
          headers: ['Listing ID', 'Seller', 'Category', 'Subcategory', 'FY', 'Listed Qty', 'Remaining Qty', 'Asking Rate', 'Status'],
          rows: listings.map((l) => [l.id, getSellerName(l.sellerUid), l.categoryName, l.subcategory, l.financialYear, l.listedQty, l.remainingQty, l.askingRate, l.status]),
        };
      case 'Requirement-wise':
        return {
          headers: ['Req ID', 'Buyer', 'Category', 'Subcategory', 'FY', 'Required Qty', 'Remaining Qty', 'Max Rate', 'Status'],
          rows: requirements.map((r) => [r.id, getBuyerName(r.buyerUid), r.categoryName, r.subcategory, r.financialYear, r.requiredQty, r.remainingQty, r.maxBuyingRate, r.status]),
        };
      case 'Match-wise':
        return {
          headers: ['Match ID', 'Category', 'FY', 'Qty', 'Buyer Rate', 'Seller Rate', 'Indicative Rate', 'Status'],
          rows: matches.map((m) => [m.id, m.categoryName, m.financialYear, m.matchingQty, m.buyerTargetRate, m.sellerAskingRate, m.indicativeRate, m.status]),
        };
      case 'Negotiation-wise':
        return {
          headers: ['Entry ID', 'Match ID', 'Actor', 'Action', 'Rate', 'Quantity', 'Message'],
          rows: negotiations.map((n) => [n.id, n.matchId, n.actor, n.actionType, n.rate ?? '', n.quantity ?? '', n.message]),
        };
      case 'Payment-wise':
        return {
          headers: ['Payment ID', 'Order ID', 'Party Type', 'Amount INR', 'Type', 'Method', 'Ref', 'Date', 'Status'],
          rows: payments.map((p) => [p.id, p.orderId, p.partyType, p.amount, p.paymentType, p.paymentMethod, p.referenceNumber, p.paymentDate, p.status]),
        };
      case 'Monthly transaction report':
      case 'Financial year-wise':
        return {
          headers: ['Transaction ID', 'Order ID', 'Category', 'FY', 'Qty', 'Unit', 'Traded Rate', 'Total Value INR'],
          rows: transactions.map((t) => [t.id, t.orderId, t.categoryName, t.financialYear, t.quantity, t.unit, t.tradedRate, t.totalValue]),
        };
      default:
        return {
          headers: ['Order ID', 'Invoice', 'Buyer', 'Seller', 'Category', 'FY', 'Qty', 'Agreed Rate', 'Total INR', 'Brokerage'],
          rows: orders.map((o) => [
            o.id,
            o.invoiceNumber,
            getBuyerName(o.buyerUid),
            getSellerName(o.sellerUid),
            o.categoryName,
            o.financialYear,
            o.quantity,
            o.agreedRate,
            o.totalAmount,
            o.brokerageAmount,
          ]),
        };
    }
  };

  const activeReport = buildReportDataset();

  return (
    <PortalShell
      portalTitle="Super Admin Portal"
      userTitle={currentAdmin?.name || 'Platform Administrator'}
      userSubtitle={
        currentAdmin ? `${currentAdmin.roleTitle} · ${currentAdmin.email}` : 'Administrator Portal'
      }
      navItems={navItems}
      activeTab={adminTab}
      onSelectTab={(t) => setAdminTab(t as AdminTab)}
      onOpenNotifications={() => setAdminTab('notifications')}
    >
      {adminTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#0A172A]">Marketplace Control Tower</h1>
              <p className="text-xs text-[#64748B]">
                Centralized governance across participants, approvals, inventory, matching, and revenue.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setAdminTab('reports')}>
              Open Reports & CSV Export
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <MetricCard label="Total Buyers" value={buyers.length} onClick={() => setAdminTab('buyers')} />
            <MetricCard label="Total Sellers" value={sellers.length} onClick={() => setAdminTab('sellers')} />
            <MetricCard
              label="Active Listings"
              value={listings.filter((l) => l.status === 'Active' || l.status === 'Partially Allocated').length}
              onClick={() => setAdminTab('inventory')}
            />
            <MetricCard
              label="Available EPR Qty"
              value={totalAvailQty.toLocaleString('en-IN')}
              accent="emerald"
              onClick={() => setAdminTab('inventory')}
            />
            <MetricCard
              label="Active Requirements"
              value={requirements.filter((r) => r.status === 'Active' || r.status === 'Partially Matched').length}
              onClick={() => setAdminTab('requirement-approval')}
            />
            <MetricCard label="Matching Opps" value={matches.length} onClick={() => setAdminTab('matching-engine')} />
            <MetricCard
              label="Active Negotiations"
              value={matches.filter((m) => m.status !== 'Order Created' && m.status !== 'Closed').length}
              accent="amber"
              onClick={() => setAdminTab('negotiations')}
            />
            <MetricCard
              label="Active Orders"
              value={orders.filter((o) => o.orderStatus !== 'Transaction Completed').length}
              onClick={() => setAdminTab('orders')}
            />
            <MetricCard
              label="Completed Txns"
              value={transactions.length}
              accent="emerald"
              onClick={() => setAdminTab('orders')}
            />
            <MetricCard
              label="Pending Payments"
              value={orders.filter((o) => o.paymentStatus !== 'Fully Paid').length}
              accent="amber"
              onClick={() => setAdminTab('payments')}
            />
            <MetricCard
              label="Brokerage Revenue"
              value={formatINR(totalRevenue)}
              accent="emerald"
              onClick={() => setAdminTab('brokerage')}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-[#0A172A]">
                  Category-Wise Available Inventory
                </h2>
                <span className="font-mono text-[11px] text-[#64748B]">Live Inventory</span>
              </div>
              <SimpleBarChart
                data={categories
                  .map((c) => ({ label: c.shortName || c.name, value: getCategoryAvailQty(c.id) }))
                  .filter((d) => d.value > 0)}
                color="#10233F"
              />
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-[#0A172A]">
                  Completed Traded Volume by Category
                </h2>
                <span className="font-mono text-[11px] text-[#16A36A]">Verified Transactions</span>
              </div>
              <SimpleBarChart data={txByCategory} color="#16A36A" />
            </div>
          </div>
        </div>
      )}

      {adminTab === 'buyers' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Buyer Account Management</h1>
          {buyers.length === 0 ? (
            <EmptyState
              title="No buyer accounts registered yet."
              description="Buyers who complete Google Sign-In and company onboarding will appear here."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Mobile / Email</th>
                      <th className="py-3 px-4">GSTIN</th>
                      <th className="py-3 px-4">Registered</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {buyers.map((b) => (
                      <tr key={b.uid} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-medium text-[#0A172A]">{b.companyName}</td>
                        <td className="py-3 px-4 font-mono text-[#475569]">
                          <div>{b.mobile}</div>
                          <div>{b.email}</div>
                        </td>
                        <td className="py-3 px-4 font-mono">{b.gstin}</td>
                        <td className="py-3 px-4 font-mono">{formatTime(b.createdAt)}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={b.verification} />
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <Button
                            variant="emerald"
                            size="sm"
                            onClick={() => void adminVerifyUser('buyer', b.uid, 'Verified')}
                          >
                            Verify
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void adminVerifyUser('buyer', b.uid, 'Action Required')}
                          >
                            Flag
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {adminTab === 'sellers' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Seller Account Management</h1>
          {sellers.length === 0 ? (
            <EmptyState
              title="No seller accounts registered yet."
              description="Sellers who complete Google Sign-In and company onboarding will appear here."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Mobile / Email</th>
                      <th className="py-3 px-4">GSTIN</th>
                      <th className="py-3 px-4">Registered</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {sellers.map((s) => (
                      <tr key={s.uid} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-medium text-[#0A172A]">{s.companyName}</td>
                        <td className="py-3 px-4 font-mono text-[#475569]">
                          <div>{s.mobile}</div>
                          <div>{s.email}</div>
                        </td>
                        <td className="py-3 px-4 font-mono">{s.gstin}</td>
                        <td className="py-3 px-4 font-mono">{formatTime(s.createdAt)}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={s.verification} />
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <Button
                            variant="emerald"
                            size="sm"
                            onClick={() => void adminVerifyUser('seller', s.uid, 'Verified')}
                          >
                            Verify
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void adminVerifyUser('seller', s.uid, 'Action Required')}
                          >
                            Flag
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {adminTab === 'facilitators' && (() => {
        const byEmail = new Map<
          string,
          {
            email: string;
            uid?: string;
            employeeId: string;
            name: string;
            department: string;
            status: 'Active' | 'Inactive';
            googleLinked: boolean;
          }
        >();
        authorizedFacilitators.forEach((af) => {
          const key = af.email.trim().toLowerCase();
          const matchedFac = facilitators.find((f) => f.email.trim().toLowerCase() === key);
          byEmail.set(key, {
            email: af.email,
            uid: af.linkedUid || matchedFac?.uid,
            employeeId: af.employeeId,
            name: af.name,
            department: af.department || 'Trading Desk',
            status: af.status,
            googleLinked: Boolean(af.linkedUid || matchedFac?.uid),
          });
        });
        facilitators.forEach((f) => {
          const key = f.email.trim().toLowerCase();
          if (!byEmail.has(key)) {
            byEmail.set(key, {
              email: f.email,
              uid: f.uid,
              employeeId: f.employeeId,
              name: f.name,
              department: f.department || 'Trading Desk',
              status: f.status,
              googleLinked: true,
            });
          }
        });
        const combinedFacilitators = Array.from(byEmail.values());

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-xl font-bold text-[#0A172A]">Facilitator Staff Management</h1>
                <p className="text-xs text-[#64748B]">
                  Only authorised Google or company email accounts provisioned here can access the Portal Facilitator desk.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setStaffUid('');
                  setStaffName('');
                  setStaffEmail('');
                  setStaffExtra('Trading Desk');
                  setStaffModalRole('facilitator');
                }}
              >
                + Authorise Facilitator Email
              </Button>
            </div>
            {combinedFacilitators.length === 0 ? (
              <EmptyState
                title="No facilitators provisioned yet."
                description="Authorise a staff Google or company email address above to enable Portal Facilitator Sign-In."
              />
            ) : (
              <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        <th className="py-3 px-4">Employee ID</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Authorised Email</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Google Sign-In</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] text-sm">
                      {combinedFacilitators.map((f) => (
                        <tr key={f.email} className="hover:bg-[#F8FAFC]">
                          <td className="py-3 px-4 font-mono text-xs font-semibold">{f.employeeId}</td>
                          <td className="py-3 px-4 font-medium">{f.name}</td>
                          <td className="py-3 px-4 font-mono text-xs">{f.email}</td>
                          <td className="py-3 px-4 text-xs">{f.department}</td>
                          <td className="py-3 px-4 text-xs">
                            <span className={f.googleLinked ? 'font-medium text-[#15803D]' : 'text-[#64748B]'}>
                              {f.googleLinked ? 'Linked' : 'Awaiting First Sign-In'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={f.status} />
                          </td>
                          <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                void adminToggleFacilitatorStatus({
                                  email: f.email,
                                  uid: f.uid,
                                  currentStatus: f.status,
                                })
                              }
                            >
                              {f.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setRemoveFacTarget({
                                  email: f.email,
                                  uid: f.uid,
                                  name: f.name,
                                })
                              }
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {adminTab === 'admin-users' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-xl font-bold text-[#0A172A]">Admin User Management</h1>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setStaffUid('');
                setStaffName('');
                setStaffEmail('');
                setStaffExtra('Operations Administrator');
                setStaffModalRole('admin');
              }}
            >
              + Add Admin Access
            </Button>
          </div>
          {admins.length === 0 ? (
            <EmptyState
              title="No additional administrator accounts configured."
              description="The primary platform administrator is active via verified email; add co-administrators here."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Staff Account ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {admins.map((a) => (
                      <tr key={a.uid} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono font-semibold">{a.uid}</td>
                        <td className="py-3 px-4 font-medium text-[#0A172A]">{a.name}</td>
                        <td className="py-3 px-4 font-mono">{a.email}</td>
                        <td className="py-3 px-4 text-[#475569]">{a.roleTitle}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={a.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {adminTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-xl font-bold text-[#0A172A]">EPR Category & Subcategory Management</h1>
            <Button variant="primary" size="sm" onClick={() => openCategoryEditor()}>
              + Add Category
            </Button>
          </div>
          {categories.length === 0 ? (
            <EmptyState
              title="No EPR categories configured yet."
              description="Add EPR categories and subcategories so buyers and sellers can submit real requirements and credit listings."
              actionLabel="+ Add Category"
              onAction={() => openCategoryEditor()}
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Category Name</th>
                      <th className="py-3 px-4">Subcategories</th>
                      <th className="py-3 px-4">Unit</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {categories.map((c) => {
                      const subs = subcategories.filter((s) => s.categoryId === c.id).map((s) => s.name);
                      return (
                        <tr key={c.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-3 px-4 font-mono font-semibold">{c.code}</td>
                          <td className="py-3 px-4 font-semibold text-[#0A172A]">{c.name}</td>
                          <td className="py-3 px-4 text-[#475569]">{subs.join(', ') || '—'}</td>
                          <td className="py-3 px-4 font-mono">{c.unit}</td>
                          <td className="py-3 px-4">
                            <StatusBadge status={c.active ? 'Active' : 'Paused'} />
                          </td>
                          <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                            <Button variant="ghost" size="sm" onClick={() => openCategoryEditor(c)}>
                              Edit
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => void adminToggleCategory(c)}>
                              {c.active ? 'Disable' : 'Enable'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Modal
            open={catModalOpen}
            onClose={() => setCatModalOpen(false)}
            title={editCat ? `Edit Category — ${editCat.name}` : 'Add New EPR Category'}
          >
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setSavingCat(true);
                try {
                  await adminSaveCategory({
                    id: editCat?.id,
                    code: catCode,
                    name: catName,
                    shortName: catShortName || catName.slice(0, 24),
                    description: catDesc || `${catName} EPR credit category.`,
                    unit: catUnit,
                    financialYears: ['FY 2024-25', 'FY 2025-26', 'FY 2026-27'],
                    subcategories: catSubcats
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                    active: editCat?.active ?? true,
                  });
                  setCatModalOpen(false);
                } finally {
                  setSavingCat(false);
                }
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Category Name *</label>
                  <input
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Plastic Packaging EPR"
                    className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Code *</label>
                  <input
                    required
                    value={catCode}
                    onChange={(e) => setCatCode(e.target.value)}
                    placeholder="e.g. PWM-01"
                    className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Short Label</label>
                  <input
                    value={catShortName}
                    onChange={(e) => setCatShortName(e.target.value)}
                    placeholder="e.g. Plastic EPR"
                    className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Unit</label>
                  <select
                    value={catUnit}
                    onChange={(e) => setCatUnit(e.target.value as 'MT' | 'KL' | 'Units')}
                    className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    <option value="MT">MT</option>
                    <option value="KL">KL</option>
                    <option value="Units">Units</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Subcategories (comma-separated)</label>
                <input
                  value={catSubcats}
                  onChange={(e) => setCatSubcats(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full p-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setCatModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingCat}>
                  {savingCat ? 'Saving...' : 'Save Category'}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {adminTab === 'listing-approval' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Seller Listing Approval Queue</h1>
          {listings.length === 0 ? (
            <EmptyState
              title="No seller listings available."
              description="Seller EPR credit listings submitted for approval will appear here."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Listing ID</th>
                      <th className="py-3 px-4">Seller</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                      <th className="py-3 px-4 text-right">Rate</th>
                      <th className="py-3 px-4">FY</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {listings.map((l) => (
                      <tr key={l.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono font-semibold">{l.id}</td>
                        <td className="py-3 px-4">{getSellerName(l.sellerUid)}</td>
                        <td className="py-3 px-4 font-medium">{l.categoryName}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {l.listedQty} {l.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(l.askingRate)}</td>
                        <td className="py-3 px-4 font-mono">{l.financialYear}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={l.status} />
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <Button
                            variant="emerald"
                            size="sm"
                            onClick={() =>
                              setApprovalConfirm({ kind: 'listing', listing: l, id: l.id, decision: 'Active' })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              setApprovalConfirm({ kind: 'listing', listing: l, id: l.id, decision: 'Rejected' })
                            }
                          >
                            Reject
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {adminTab === 'requirement-approval' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Buyer Requirement Governance</h1>
          {requirements.length === 0 ? (
            <EmptyState
              title="No buyer requirements yet."
              description="Buyer EPR requirements will appear here once submitted."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Requirement ID</th>
                      <th className="py-3 px-4">Buyer</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                      <th className="py-3 px-4 text-right">Target Rate</th>
                      <th className="py-3 px-4">FY</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {requirements.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono font-semibold">{r.id}</td>
                        <td className="py-3 px-4">{getBuyerName(r.buyerUid)}</td>
                        <td className="py-3 px-4 font-medium">{r.categoryName}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {r.requiredQty} {r.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(r.maxBuyingRate)}</td>
                        <td className="py-3 px-4 font-mono">{r.financialYear}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <Button
                            variant="emerald"
                            size="sm"
                            onClick={() =>
                              setApprovalConfirm({
                                kind: 'requirement',
                                requirement: r,
                                id: r.id,
                                decision: 'Active',
                              })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              setApprovalConfirm({
                                kind: 'requirement',
                                requirement: r,
                                id: r.id,
                                decision: 'Rejected',
                              })
                            }
                          >
                            Reject
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {adminTab === 'rate-board' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-xl font-bold text-[#0A172A]">Published EPR Rate Board &amp; Header Ticker</h1>
              <p className="text-xs text-[#64748B]">
                Add, edit, publish, unpublish, or remove official EPR category rates displayed in the header ticker and public rate board.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => openRateEditor()}>
              + Add Category Rate
            </Button>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#0A172A]">Live Website Header Ticker Preview</span>
              <span className="text-[#64748B] font-mono">
                {publishedRates.filter((r) => r.published).length} published rate(s)
              </span>
            </div>
            <EprRateTickerBar rates={publishedRates} />
          </div>

          {publishedRates.length === 0 ? (
            <EmptyState
              title="No EPR category rates published yet."
              description="Click '+ Add Category Rate' to publish approved ₹/MT reference rates to the scrolling website header."
              actionLabel="+ Add Category Rate"
              onAction={() => openRateEditor()}
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Financial Year</th>
                      <th className="py-3 px-4 text-right">Approved Rate</th>
                      <th className="py-3 px-4">Trend</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4">Visibility</th>
                      <th className="py-3 px-4">Updated</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {publishedRates.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-semibold text-[#0A172A]">{item.categoryName}</td>
                        <td className="py-3 px-4 font-mono text-[#475569]">{item.financialYear}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#10233F] tabular-nums">
                          {formatINR(item.rate)}/{item.unit}
                        </td>
                        <td className="py-3 px-4 font-medium">{item.trend || 'Stable'}</td>
                        <td className="py-3 px-4 text-[#64748B] max-w-[200px] truncate">{item.notes || '—'}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={item.published ? 'Active' : 'Paused'} />
                        </td>
                        <td className="py-3 px-4 font-mono text-[#64748B]">{formatTime(item.updatedAt)}</td>
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={() => openRateEditor(item)}>
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void adminTogglePublishedRate(item)}
                          >
                            {item.published ? 'Unpublish' : 'Publish'}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteRateConfirm(item)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Modal
            open={rateModalOpen}
            onClose={() => setRateModalOpen(false)}
            title={editRateItem ? `Edit Rate — ${editRateItem.categoryName}` : 'Add Published EPR Category Rate'}
            maxWidth="max-w-md"
          >
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const parsedRate = Number(rateValue);
                if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
                  addToast({ type: 'error', title: 'Enter a valid positive rate in INR' });
                  return;
                }
                const selectedCat = categories.find((c) => c.id === rateCatId);
                const finalCatId =
                  rateCatId === 'CUSTOM'
                    ? rateCustomName
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '') || `cat-${Date.now()}`
                    : selectedCat?.id || rateCatId;
                const finalCatName =
                  rateCatId === 'CUSTOM' ? rateCustomName.trim() : selectedCat?.name || rateCustomName.trim();
                const finalUnit =
                  rateCatId === 'CUSTOM' ? rateUnit : selectedCat?.unit || rateUnit;
                if (!finalCatName) {
                  addToast({ type: 'error', title: 'Category name is required' });
                  return;
                }
                setSavingRate(true);
                try {
                  await adminSavePublishedRate({
                    id: editRateItem?.id,
                    categoryId: finalCatId,
                    categoryName: finalCatName,
                    financialYear: rateFy,
                    unit: finalUnit,
                    rate: parsedRate,
                    trend: rateTrend,
                    published: ratePublished,
                    notes: rateNotes.trim(),
                  });
                  setRateModalOpen(false);
                } finally {
                  setSavingRate(false);
                }
              }}
            >
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">EPR Category *</label>
                <select
                  value={rateCatId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRateCatId(val);
                    const found = categories.find((c) => c.id === val);
                    if (found) {
                      setRateCustomName(found.name);
                      setRateUnit(found.unit);
                    }
                  }}
                  className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.unit})
                    </option>
                  ))}
                  <option value="CUSTOM">Custom Category Name</option>
                </select>
              </div>

              {rateCatId === 'CUSTOM' && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Category Name *</label>
                    <input
                      required
                      value={rateCustomName}
                      onChange={(e) => setRateCustomName(e.target.value)}
                      placeholder="e.g. Plastic Cat-I"
                      className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Unit</label>
                    <select
                      value={rateUnit}
                      onChange={(e) => setRateUnit(e.target.value as 'MT' | 'KL' | 'Units')}
                      className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                    >
                      <option value="MT">MT</option>
                      <option value="KL">KL</option>
                      <option value="Units">Units</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Financial Year *</label>
                  <select
                    value={rateFy}
                    onChange={(e) => setRateFy(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    <option value="FY 2024-25">FY 2024-25</option>
                    <option value="FY 2025-26">FY 2025-26</option>
                    <option value="FY 2026-27">FY 2026-27</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Trend</label>
                  <select
                    value={rateTrend}
                    onChange={(e) => setRateTrend(e.target.value as 'Up' | 'Down' | 'Stable')}
                    className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    <option value="Stable">Stable</option>
                    <option value="Up">Up</option>
                    <option value="Down">Down</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Rate (₹ / {rateUnit}) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step="any"
                  value={rateValue}
                  onChange={(e) => setRateValue(e.target.value)}
                  placeholder="e.g. 1250"
                  className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Desk Notes (Optional)</label>
                <input
                  value={rateNotes}
                  onChange={(e) => setRateNotes(e.target.value)}
                  placeholder="e.g. Indicative spot reference"
                  className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-[#0A172A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={ratePublished}
                  onChange={(e) => setRatePublished(e.target.checked)}
                />
                <span>Publish immediately to public website header ticker &amp; rate board</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setRateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingRate}>
                  {savingRate ? 'Saving...' : editRateItem ? 'Update Rate' : 'Save Rate'}
                </Button>
              </div>
            </form>
          </Modal>

          <ConfirmModal
            open={deleteRateConfirm !== null}
            onClose={() => setDeleteRateConfirm(null)}
            onConfirm={() => {
              if (deleteRateConfirm) void adminDeletePublishedRate(deleteRateConfirm);
            }}
            title="Remove Published Rate"
            description={`Remove the rate entry for ${deleteRateConfirm?.categoryName} (${deleteRateConfirm?.financialYear}) from the website ticker and rate board?`}
            confirmLabel="Remove Rate"
            variant="danger"
          />
        </div>
      )}

      {adminTab === 'inventory' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Marketplace Inventory Summary</h1>
          {marketRates.length === 0 ? (
            <EmptyState
              title="No marketplace inventory summaries yet."
              description="Inventory volumes and seller asking ranges appear automatically from active seller listings."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">FY</th>
                      <th className="py-3 px-4 text-right">Available Qty</th>
                      <th className="py-3 px-4 text-right">Lowest Ask</th>
                      <th className="py-3 px-4 text-right">Highest Ask</th>
                      <th className="py-3 px-4 text-right">Indicative Rate</th>
                      <th className="py-3 px-4 text-right">Last Traded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {marketRates.map((mr) => (
                      <tr key={mr.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-semibold">{mr.categoryName}</td>
                        <td className="py-3 px-4 font-mono text-xs">{mr.financialYear}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {mr.availableQty.toLocaleString('en-IN')} {mr.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {mr.lowestAskingRate ? formatINR(mr.lowestAskingRate) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {mr.highestAskingRate ? formatINR(mr.highestAskingRate) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[#1E3A8A] tabular-nums">
                          {mr.indicativeRate ? formatINR(mr.indicativeRate) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#16A36A] tabular-nums">
                          {mr.lastTradedRate ? formatINR(mr.lastTradedRate) : 'No Trades'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {(adminTab === 'matching-engine' || adminTab === 'negotiations') && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">
            {adminTab === 'matching-engine' ? 'ETP Matching Engine Monitor' : 'Negotiation Overview'}
          </h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label="Requirements" value={requirements.length} />
            <MetricCard label="Listings" value={listings.length} />
            <MetricCard label="Total Matches" value={matches.length} accent="emerald" />
            <MetricCard label="Orders Confirmed" value={orders.length} accent="emerald" />
          </div>
          {matches.length === 0 ? (
            <EmptyState
              title="No matching opportunities found."
              description="Valid matches between compatible buyer requirements and seller listings will appear here."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Match ID</th>
                      <th className="py-3 px-4">Buyer</th>
                      <th className="py-3 px-4">Seller</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                      <th className="py-3 px-4 text-right">Buyer Rate</th>
                      <th className="py-3 px-4 text-right">Seller Rate</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {matches.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono font-semibold">{m.id}</td>
                        <td className="py-3 px-4">{getBuyerName(m.buyerUid)}</td>
                        <td className="py-3 px-4">{getSellerName(m.sellerUid)}</td>
                        <td className="py-3 px-4 font-medium">{m.categoryName}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {m.matchingQty} {m.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(m.buyerTargetRate)}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(m.sellerAskingRate)}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={m.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {(adminTab === 'orders' || adminTab === 'gst-invoices' || adminTab === 'brokerage') && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-xl font-bold text-[#0A172A]">
              {adminTab === 'gst-invoices'
                ? 'GST & Tax Invoice Management'
                : adminTab === 'brokerage'
                ? 'Brokerage & Revenue Ledger'
                : 'Order Management'}
            </h1>
            {orders.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setPayOrderId(orders[0].id);
                  setPayAmount(String(orders[0].totalAmount));
                  setPayModalOpen(true);
                }}
              >
                + Record Payment Entry
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <MetricCard
              label="Total Transaction Value"
              value={formatINR(orders.reduce((s, o) => s + o.totalAmount, 0))}
            />
            <MetricCard
              label={`Total GST (${platformSettings.gstPercent}%)`}
              value={formatINR(orders.reduce((s, o) => s + o.gstAmount, 0))}
            />
            <MetricCard label="Brokerage Revenue" value={formatINR(totalRevenue)} accent="emerald" />
            <MetricCard label="Verified Payments" value={payments.length} />
          </div>

          {orders.length === 0 ? (
            <EmptyState
              title="No orders available."
              description="Orders confirmed by facilitators will appear here with GST and brokerage breakdowns."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Order / Invoice</th>
                      <th className="py-3 px-4">Buyer</th>
                      <th className="py-3 px-4">Seller</th>
                      <th className="py-3 px-4 text-right">Basic</th>
                      <th className="py-3 px-4 text-right">GST</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">Brokerage</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono">
                          <div className="font-semibold text-[#0A172A]">{o.id}</div>
                          <div className="text-[#64748B]">{o.invoiceNumber}</div>
                        </td>
                        <td className="py-3 px-4">{getBuyerName(o.buyerUid)}</td>
                        <td className="py-3 px-4">{getSellerName(o.sellerUid)}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(o.basicAmount)}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(o.gstAmount)}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                          {formatINR(o.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[#16A36A] tabular-nums">
                          {formatINR(o.brokerageAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={o.orderStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Modal
            open={payModalOpen}
            onClose={() => setPayModalOpen(false)}
            title="Record Advance / Balance Payment"
            maxWidth="max-w-md"
          >
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const ord = orders.find((o) => o.id === payOrderId) || orders[0];
                if (!ord) return;
                await recordPayment({
                  order: ord,
                  partyType: 'Buyer Receivable',
                  amount: Number(payAmount),
                  paymentType: payType,
                  paymentMethod: payMethod,
                  referenceNumber: payRef,
                  paymentDate: new Date().toISOString().slice(0, 10),
                });
                setPayModalOpen(false);
              }}
            >
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Order</label>
                <select
                  value={payOrderId}
                  onChange={(e) => setPayOrderId(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} — {getBuyerName(o.buyerUid)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Payment Type</label>
                  <select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as 'Advance' | 'Balance' | 'Settlement')}
                    className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    <option value="Advance">Advance</option>
                    <option value="Balance">Balance</option>
                    <option value="Settlement">Settlement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as 'NEFT' | 'RTGS' | 'IMPS')}
                    className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    <option value="RTGS">RTGS</option>
                    <option value="NEFT">NEFT</option>
                    <option value="IMPS">IMPS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Amount (INR)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">UTR / Bank Reference *</label>
                <input
                  required
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Enter NEFT/RTGS UTR number"
                  className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setPayModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Verify & Save
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {adminTab === 'reports' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-xl font-bold text-[#0A172A]">Reports & Analytics</h1>
              <p className="text-xs text-[#64748B]">
                Export live marketplace datasets to CSV / Excel-compatible formats.
              </p>
            </div>
            <CsvExportButton
              label="Export CSV Report"
              filename={`EPR_Bazaar_${reportType.replace(/\s+/g, '_')}_Report.csv`}
              headers={activeReport.headers}
              rows={activeReport.rows}
              onExported={() => addToast({ type: 'success', title: `${reportType} CSV exported` })}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              'Buyer-wise',
              'Seller-wise',
              'Category-wise',
              'Financial year-wise',
              'Listing-wise',
              'Requirement-wise',
              'Match-wise',
              'Negotiation-wise',
              'Order-wise',
              'Payment-wise',
              'Brokerage-wise',
              'Monthly transaction report',
            ].map((rt) => (
              <button
                key={rt}
                type="button"
                onClick={() => setReportType(rt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                  reportType === rt
                    ? 'bg-[#10233F] text-white border-[#10233F]'
                    : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                }`}
              >
                {rt}
              </button>
            ))}
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
            <div className="text-sm font-semibold text-[#0A172A]">
              {reportType} Preview ({activeReport.rows.length} records)
            </div>
            {activeReport.rows.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#64748B]">
                No records found for {reportType} yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      {activeReport.headers.map((h) => (
                        <th key={h} className="py-2.5 px-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {activeReport.rows.slice(0, 15).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC]">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-2.5 px-3 font-mono text-[#334155]">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {adminTab === 'audit-logs' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Platform Audit Logs</h1>
          {auditLogs.length === 0 ? (
            <EmptyState
              title="No audit logs recorded yet."
              description="System actions across onboarding, approvals, offers, and orders are recorded here."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Log ID</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono font-semibold">{log.id}</td>
                        <td className="py-3 px-4 font-mono text-[#64748B]">{formatTime(log.createdAt)}</td>
                        <td className="py-3 px-4 font-medium">
                          {log.actorEmail} ({log.role})
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={log.action} />
                        </td>
                        <td className="py-3 px-4 font-mono">{log.target}</td>
                        <td className="py-3 px-4 text-[#475569]">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {(adminTab === 'settings' || adminTab === 'permissions') && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 max-w-2xl space-y-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#10233F]" />
            <h1 className="font-display text-xl font-bold text-[#0A172A]">
              {adminTab === 'permissions' ? 'Role & Permission Matrix' : 'Platform Configuration'}
            </h1>
          </div>
          {adminTab === 'settings' ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Default Brokerage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={brokeragePct}
                    onChange={(e) => setBrokeragePct(e.target.value)}
                    className="w-full h-10 px-3 font-mono border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Applicable GST (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={gstPct}
                    onChange={(e) => setGstPct(e.target.value)}
                    className="w-full h-10 px-3 font-mono border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Match Rate Tolerance (%)</label>
                  <input
                    type="number"
                    step="1"
                    min={0}
                    max={50}
                    value={tolerancePct}
                    onChange={(e) => setTolerancePct(e.target.value)}
                    className="w-full h-10 px-3 font-mono border border-[#CBD5E1] rounded-lg"
                  />
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={savingSettings}
                onClick={async () => {
                  setSavingSettings(true);
                  try {
                    await adminSavePlatformSettings({
                      defaultBrokeragePercent: Number(brokeragePct) || 2.5,
                      gstPercent: Number(gstPct) || 18,
                      matchingRateTolerancePercent: Number(tolerancePct) || 10,
                    });
                  } finally {
                    setSavingSettings(false);
                  }
                }}
              >
                {savingSettings ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {[
                ['Buyer', 'Google Login Only · Submit Requirements · View Anonymized Matches · Respond to Offers'],
                ['Seller', 'Google Login Only · Create Listings · Manage Inventory · Respond to Offers'],
                [
                  'Facilitator',
                  'Authorised Google Account or Email/Password Login · View Private Buyer/Seller Panels · Dispatch Bilateral Offers · Confirm Deals',
                ],
                ['Super Admin', 'Protected Access · Approvals · Category/Rate Control · Staff Provisioning · Audit Logs'],
              ].map(([roleName, perms]) => (
                <div key={roleName} className="p-3 bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg">
                  <div className="font-semibold text-[#0A172A]">{roleName}</div>
                  <div className="text-[#475569] mt-0.5">{perms}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {adminTab === 'payments' && <PaymentsView />}
      {adminTab === 'documents' && <DocumentsView ownerFilterRole="admin" />}
      {adminTab === 'notifications' && (
        <div className="space-y-8">
          <NotificationsView />

          <div className="space-y-4 pt-4 border-t border-[#E2E8F0]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0A172A] flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#1E3A8A]" /> Two-Way Email Delivery Logs
                </h2>
                <p className="text-xs text-[#64748B]">
                  Audit trail of category-matched buyer/seller email notifications dispatched by the notification service.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={emailLogFilter}
                  onChange={(e) => setEmailLogFilter(e.target.value as 'ALL' | 'sent' | 'failed' | 'pending')}
                  className="h-9 px-3 text-xs border border-[#CBD5E1] rounded-lg bg-white"
                >
                  <option value="ALL">All Statuses ({emailDeliveryLogs.length})</option>
                  <option value="sent">Sent ({emailDeliveryLogs.filter((l) => l.status === 'sent').length})</option>
                  <option value="failed">Failed ({emailDeliveryLogs.filter((l) => l.status === 'failed').length})</option>
                  <option value="pending">Pending ({emailDeliveryLogs.filter((l) => l.status === 'pending').length})</option>
                </select>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={retryingEmails || emailDeliveryLogs.filter((l) => l.status === 'failed').length === 0}
                  onClick={async () => {
                    setRetryingEmails(true);
                    try {
                      await retryFailedEmails();
                    } finally {
                      setRetryingEmails(false);
                    }
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> {retryingEmails ? 'Retrying...' : 'Retry All Failed'}
                </Button>
              </div>
            </div>

            {emailDeliveryLogs.length === 0 ? (
              <EmptyState
                title="No email delivery logs yet."
                description="When buyers publish requirements or sellers publish offers, email dispatches will be logged here."
              />
            ) : (
              <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        <th className="py-3 px-4">Notification ID</th>
                        <th className="py-3 px-4">Listing</th>
                        <th className="py-3 px-4">Direction</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Recipient</th>
                        <th className="py-3 px-4">Provider</th>
                        <th className="py-3 px-4">Attempts</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Details</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] text-xs">
                      {[...emailDeliveryLogs]
                        .filter((l) => emailLogFilter === 'ALL' || l.status === emailLogFilter)
                        .sort((a, b) => {
                          const toMs = (t: EmailDeliveryLog['createdAt']) => {
                            if (!t) return 0;
                            if (typeof t === 'string') return Date.parse(t) || 0;
                            if (typeof (t as { toDate?: () => Date }).toDate === 'function') {
                              return (t as { toDate: () => Date }).toDate().getTime();
                            }
                            return 0;
                          };
                          return toMs(b.lastAttemptAt || b.createdAt) - toMs(a.lastAttemptAt || a.createdAt);
                        })
                        .map((log) => (
                          <tr key={log.notificationId} className="hover:bg-[#F8FAFC]">
                            <td className="py-3 px-4 font-mono font-semibold text-[#0A172A]">{log.notificationId}</td>
                            <td className="py-3 px-4 font-mono text-[#1E3A8A]">{log.listingId}</td>
                            <td className="py-3 px-4">
                              {log.notificationType === 'buyer_requirement' ? 'Buyer → Sellers' : 'Seller → Buyers'}
                            </td>
                            <td className="py-3 px-4 font-medium">{log.category}</td>
                            <td className="py-3 px-4 font-mono">
                              <span className="uppercase text-[10px] text-[#64748B] mr-1">{log.recipientRole}</span>
                              {log.recipientEmail}
                            </td>
                            <td className="py-3 px-4 font-mono uppercase">{log.provider}</td>
                            <td className="py-3 px-4 font-mono">{log.attemptCount}</td>
                            <td className="py-3 px-4">
                              <StatusBadge
                                status={log.status === 'sent' ? 'Sent' : log.status === 'failed' ? 'Failed' : 'Pending'}
                              />
                            </td>
                            <td className="py-3 px-4 font-mono text-[#64748B]">
                              {formatTime(log.sentAt || log.lastAttemptAt || log.createdAt)}
                            </td>
                            <td className="py-3 px-4 max-w-[240px] truncate text-[#475569]">
                              {log.errorMessage || log.providerMessageId || log.providerResponse || '—'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {log.status === 'failed' && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={retryingEmails}
                                  onClick={async () => {
                                    setRetryingEmails(true);
                                    try {
                                      await retryFailedEmails(log.notificationId);
                                    } finally {
                                      setRetryingEmails(false);
                                    }
                                  }}
                                >
                                  Retry
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {adminTab === 'seo' && (() => {
        const effectivePages: SeoPageRecord[] =
          seoPages.length > 0
            ? seoPages
            : DEFAULT_PUBLIC_SEO_PAGES.map((p) => ({
                id: p.id,
                slug: p.slug,
                pageType: p.pageType,
                pageTitle: p.pageTitle,
                contentSummary: p.contentSummary,
                seoTitle: p.seoTitle || '',
                metaDescription: p.metaDescription || '',
                canonicalUrl: p.canonicalUrl || buildCanonicalUrl(p.slug),
                robots: p.robots || 'index, follow',
                ogTitle: p.ogTitle || p.seoTitle || '',
                ogDescription: p.ogDescription || p.metaDescription || '',
                ogImage: p.ogImage || DEFAULT_OG_IMAGE_URL,
                twitterCard: p.twitterCard || 'summary_large_image',
                published: p.published,
                isSystemPage: p.isSystemPage,
                updatedByUid: 'system',
              }));

        const audit = auditSeoPages(
          effectivePages.map(toSeoPageInput),
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

        const filteredSeoPages = effectivePages.filter((p) => {
          const v = audit.perPageValidation[p.id];
          if (seoFilter === 'PUBLISHED' && !p.published) return false;
          if (seoFilter === 'UNPUBLISHED' && p.published) return false;
          if (seoFilter === 'ISSUES' && (!v || v.issues.length === 0)) return false;
          if (seoSearch.trim()) {
            const q = seoSearch.trim().toLowerCase();
            return (
              p.slug.toLowerCase().includes(q) ||
              p.pageTitle.toLowerCase().includes(q) ||
              (p.seoTitle || '').toLowerCase().includes(q)
            );
          }
          return true;
        });

        const sortedSeoLogs = [...seoLogs].sort((a, b) => {
          const toMs = (t: unknown) => {
            if (!t) return 0;
            if (typeof t === 'string') return Date.parse(t) || 0;
            if (typeof (t as { toDate?: () => Date }).toDate === 'function') {
              return (t as { toDate: () => Date }).toDate().getTime();
            }
            return 0;
          };
          return toMs(b.createdAt) - toMs(a.createdAt);
        });

        const activeCats = categories.filter((c) => c.active);
        const modalCanonicalCheck = validateCanonicalUrl(seoCanonical, seoSlug || '/');

        return (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-xl font-bold text-[#0A172A]">
                  Search Indexing &amp; SEO Management
                </h1>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Manage canonical URLs, meta titles, descriptions, social share tags, and dynamic XML sitemaps for{' '}
                  <span className="font-mono text-[#0A172A]">{CANONICAL_ORIGIN}</span>.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#CBD5E1] bg-white text-xs font-medium text-[#0A172A] hover:bg-[#F8FAFC] whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#475569]" />
                  View Sitemap XML
                </a>
                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#CBD5E1] bg-white text-xs font-medium text-[#0A172A] hover:bg-[#F8FAFC] whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#475569]" />
                  View robots.txt
                </a>
                {(seoPages.length === 0 || seoPages.length < DEFAULT_PUBLIC_SEO_PAGES.length) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={seedingSeo}
                    onClick={async () => {
                      setSeedingSeo(true);
                      try {
                        await adminSeedSeoPages(true);
                      } finally {
                        setSeedingSeo(false);
                      }
                    }}
                  >
                    {seedingSeo ? 'Syncing Pages...' : 'Sync Default Pages'}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={regeneratingSitemap}
                  onClick={async () => {
                    setRegeneratingSitemap(true);
                    try {
                      await adminRegenerateSitemap();
                    } finally {
                      setRegeneratingSitemap(false);
                    }
                  }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSitemap ? 'animate-spin' : ''}`} />
                  {regeneratingSitemap ? 'Regenerating...' : 'Regenerate Sitemap'}
                </Button>
                <Button variant="primary" size="sm" onClick={() => openSeoEditor()}>
                  <Plus className="w-3.5 h-3.5" />
                  Add Public Page
                </Button>
              </div>
            </div>

            {seoPages.length === 0 && (
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 text-xs text-[#92400E]">
                  <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Default public routes are active without saved overrides</div>
                    <p className="mt-0.5">
                      Click <strong>Sync Default Pages</strong> to initialize persistent records for all 16 public marketplace and policy pages before editing individual metadata.
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={seedingSeo}
                  onClick={async () => {
                    setSeedingSeo(true);
                    try {
                      await adminSeedSeoPages(true);
                    } finally {
                      setSeedingSeo(false);
                    }
                  }}
                >
                  {seedingSeo ? 'Initializing...' : 'Sync Default Pages'}
                </Button>
              </div>
            )}

            {/* SEO Overview KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
              <MetricCard label="Total Public Pages" value={audit.totalPublicPages} />
              <MetricCard
                label="Sitemap Status"
                value={audit.sitemapStatus}
                accent={audit.sitemapStatus === 'Healthy' ? 'emerald' : 'amber'}
              />
              <MetricCard
                label="URLs in Sitemap"
                value={audit.totalUrlsInSitemap}
                accent="emerald"
              />
              <MetricCard
                label="Missing Titles"
                value={audit.pagesMissingTitles}
                accent={audit.pagesMissingTitles > 0 ? 'amber' : 'slate'}
              />
              <MetricCard
                label="Missing Descriptions"
                value={audit.pagesMissingDescriptions}
                accent={audit.pagesMissingDescriptions > 0 ? 'amber' : 'slate'}
              />
              <MetricCard
                label="Duplicate Warnings"
                value={audit.duplicateWarnings}
                accent={audit.duplicateWarnings > 0 ? 'amber' : 'slate'}
              />
              <MetricCard
                label="Canonical Errors"
                value={audit.canonicalErrors}
                accent={audit.canonicalErrors > 0 ? 'amber' : 'slate'}
              />
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 flex flex-col justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Last Sitemap Update
                </div>
                <div className="font-mono text-xs font-semibold text-[#0A172A] mt-2 tabular-nums">
                  {seoSettings?.lastRegeneratedAt || seoSettings?.updatedAt
                    ? formatTime(seoSettings.lastRegeneratedAt || seoSettings.updatedAt)
                    : 'Not synced yet'}
                </div>
              </div>
            </div>

            {/* Validation Alerts */}
            {audit.issues.length > 0 && (
              <div className="bg-white border border-[#FCD34D] rounded-lg p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#92400E]">
                  <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                  Metadata &amp; Canonical Diagnostics ({audit.issues.length} issue{audit.issues.length === 1 ? '' : 's'})
                </div>
                <div className="divide-y divide-[#FEF3C7]">
                  {audit.issues.map((issue, idx) => {
                    const targetPage = effectivePages.find((p) => p.id === issue.pageId);
                    return (
                      <div key={`${issue.pageId}-${idx}`} className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold text-[#0A172A]">{issue.slug}</span>
                          <span className="text-[#475569]">— {issue.message}</span>
                        </div>
                        {targetPage && (
                          <Button variant="secondary" size="sm" onClick={() => openSeoEditor(targetPage)}>
                            Fix Metadata
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Public Pages Metadata Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="p-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFC]">
                <div>
                  <h2 className="font-display text-sm font-semibold text-[#0A172A]">
                    Public Pages Metadata &amp; Canonical Index ({filteredSeoPages.length})
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Restricted portals, sign-in, and private dashboards are permanently excluded from search indexing.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={seoSearch}
                      onChange={(e) => setSeoSearch(e.target.value)}
                      placeholder="Filter slug or title..."
                      className="h-8.5 pl-8 pr-3 text-xs border border-[#CBD5E1] rounded-lg bg-white"
                    />
                  </div>
                  <select
                    value={seoFilter}
                    onChange={(e) =>
                      setSeoFilter(e.target.value as 'ALL' | 'PUBLISHED' | 'UNPUBLISHED' | 'ISSUES')
                    }
                    className="h-8.5 px-2.5 text-xs border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    <option value="ALL">All Pages ({effectivePages.length})</option>
                    <option value="PUBLISHED">Published ({effectivePages.filter((p) => p.published).length})</option>
                    <option value="UNPUBLISHED">Unpublished ({effectivePages.filter((p) => !p.published).length})</option>
                    <option value="ISSUES">With Warnings ({audit.issues.length})</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Slug &amp; Page</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">SEO Title</th>
                      <th className="py-3 px-4">Meta Description</th>
                      <th className="py-3 px-4">Canonical URL</th>
                      <th className="py-3 px-4">Indexing</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {filteredSeoPages.map((pg) => {
                      const val = audit.perPageValidation[pg.id];
                      const hasIssues = Boolean(val && val.issues.length > 0);
                      return (
                        <tr key={pg.id} className={hasIssues ? 'bg-[#FFFBEB]/60 hover:bg-[#FEF3C7]/40' : 'hover:bg-[#F8FAFC]'}>
                          <td className="py-3 px-4">
                            <div className="font-mono font-semibold text-[#10233F]">{pg.slug}</div>
                            <div className="text-[#475569] mt-0.5">{pg.pageTitle}</div>
                          </td>
                          <td className="py-3 px-4 uppercase font-mono text-[11px] text-[#64748B]">{pg.pageType}</td>
                          <td className="py-3 px-4 max-w-[220px]">
                            <div className="truncate font-medium text-[#0A172A]">
                              {pg.seoTitle || <span className="text-[#DC2626]">Missing title</span>}
                            </div>
                            <div className="font-mono text-[10px] text-[#64748B] tabular-nums">
                              {(pg.seoTitle || '').length} chars
                              {val?.hasDuplicateTitle ? ' · Duplicate' : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-[240px]">
                            <div className="truncate text-[#475569]">
                              {pg.metaDescription || <span className="text-[#DC2626]">Missing description</span>}
                            </div>
                            <div className="font-mono text-[10px] text-[#64748B] tabular-nums">
                              {(pg.metaDescription || '').length} chars
                              {val?.hasDuplicateDescription ? ' · Duplicate' : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-[220px]">
                            <div className="truncate font-mono text-[11px] text-[#334155]">
                              {pg.canonicalUrl}
                            </div>
                            {val && !val.canonicalValid && (
                              <div className="text-[10px] font-semibold text-[#DC2626]">Canonical mismatch</div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-[#475569] whitespace-nowrap">
                            {pg.published ? pg.robots : 'noindex, nofollow'}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={pg.published ? 'Published' : 'Draft'} />
                          </td>
                          <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                            <Button variant="secondary" size="sm" onClick={() => openSeoEditor(pg)}>
                              Edit
                            </Button>
                            {seoPages.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void adminToggleSeoPagePublish(pg)}
                              >
                                {pg.published ? 'Unpublish' : 'Publish'}
                              </Button>
                            )}
                            {!pg.isSystemPage && seoPages.length > 0 && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setDeleteSeoConfirm(pg)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Category URLs included in Category Sitemap */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="p-4 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFC]">
                <div>
                  <h2 className="font-display text-sm font-semibold text-[#0A172A]">
                    Active Category Index URLs ({activeCats.length})
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Published automatically in <span className="font-mono">/sitemap-categories.xml</span> whenever categories are added or updated.
                  </p>
                </div>
                <a
                  href="/sitemap-categories.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1E3A8A] hover:underline"
                >
                  Open Category Sitemap <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {activeCats.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#64748B]">
                  No active EPR categories configured yet. Active categories will appear here and enter the category sitemap automatically.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        <th className="py-2.5 px-4">Code</th>
                        <th className="py-2.5 px-4">Category Name</th>
                        <th className="py-2.5 px-4">Canonical URL</th>
                        <th className="py-2.5 px-4">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] text-xs">
                      {activeCats.map((cat) => (
                        <tr key={cat.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-4 font-mono font-semibold">{cat.code}</td>
                          <td className="py-2.5 px-4 font-medium text-[#0A172A]">{cat.name}</td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-[#1E3A8A]">
                            {buildCanonicalUrl(`/category/${encodeURIComponent(cat.id)}`)}
                          </td>
                          <td className="py-2.5 px-4 font-mono">{cat.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SEO Change History */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <h2 className="font-display text-sm font-semibold text-[#0A172A]">
                  SEO &amp; Sitemap Change Log ({sortedSeoLogs.length})
                </h2>
              </div>
              {sortedSeoLogs.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#64748B]">
                  No SEO updates recorded yet. Metadata edits, page publishing actions, and manual sitemap regenerations are logged here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        <th className="py-2.5 px-4">Timestamp</th>
                        <th className="py-2.5 px-4">Action</th>
                        <th className="py-2.5 px-4">Page Slug</th>
                        <th className="py-2.5 px-4">Updated By</th>
                        <th className="py-2.5 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] text-xs">
                      {sortedSeoLogs.slice(0, 25).map((log) => (
                        <tr key={log.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-2.5 px-4 font-mono text-[#64748B] whitespace-nowrap">
                            {formatTime(log.createdAt)}
                          </td>
                          <td className="py-2.5 px-4">
                            <StatusBadge status={log.action} />
                          </td>
                          <td className="py-2.5 px-4 font-mono font-medium text-[#0A172A]">{log.slug}</td>
                          <td className="py-2.5 px-4 font-mono text-[#475569]">{log.actorEmail}</td>
                          <td className="py-2.5 px-4 text-[#475569]">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Create / Edit SEO Page Modal */}
            <Modal
              open={seoModalOpen}
              onClose={() => setSeoModalOpen(false)}
              title={editSeoPage ? `Edit SEO Metadata — ${editSeoPage.slug}` : 'Create & Publish Public SEO Page'}
              maxWidth="max-w-2xl"
            >
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSavingSeo(true);
                  try {
                    await adminSaveSeoPage({
                      id: editSeoPage?.id,
                      slug: seoSlug,
                      pageType: editSeoPage ? editSeoPage.pageType : seoPageType,
                      pageTitle: seoPageTitle,
                      contentSummary: seoContentSummary,
                      seoTitle: seoMetaTitle,
                      metaDescription: seoMetaDesc,
                      canonicalUrl: seoCanonical,
                      robots: seoRobots,
                      ogTitle: seoOgTitle,
                      ogDescription: seoOgDesc,
                      ogImage: seoOgImage,
                      twitterCard: seoTwitterCard,
                      published: seoPublished,
                      isSystemPage: editSeoPage?.isSystemPage ?? false,
                      ...(unapprovedDraft
                        ? {
                            aiDraftSeoTitle: unapprovedDraft.seoTitle,
                            aiDraftMetaDescription: unapprovedDraft.metaDescription,
                            aiDraftApproved: Boolean(draftApprovedFlag),
                          }
                        : draftApprovedFlag !== undefined
                          ? { aiDraftApproved: draftApprovedFlag }
                          : {}),
                    });
                    setSeoModalOpen(false);
                  } catch (err) {
                    addToast({
                      type: 'error',
                      title: 'Unable to save SEO settings',
                      description: err instanceof Error ? err.message : 'Check canonical URL and fields.',
                    });
                  } finally {
                    setSavingSeo(false);
                  }
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Page Title *</label>
                    <input
                      required
                      value={seoPageTitle}
                      onChange={(e) => setSeoPageTitle(e.target.value)}
                      placeholder="e.g. Plastic EPR Compliance Guide"
                      className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Public URL Path *</label>
                    <input
                      required
                      disabled={Boolean(editSeoPage?.isSystemPage)}
                      value={seoSlug}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSeoSlug(val);
                        setSeoCanonical(buildCanonicalUrl(val));
                      }}
                      placeholder="/epr-compliance-guide"
                      className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg disabled:bg-[#F1F5F9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Page Content Summary *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={seoContentSummary}
                    onChange={(e) => setSeoContentSummary(e.target.value)}
                    placeholder="Concise business description displayed on custom pages and used to generate metadata suggestions..."
                    className="w-full p-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                  />
                </div>

                {/* Unapproved Metadata Draft Generator (Requires Explicit Admin Approval) */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
                  <div className="text-xs text-[#475569]">
                    Generate a metadata draft from page content. Drafts require your explicit review before saving or publishing.
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={generatingSeoDraft || !seoPageTitle.trim()}
                    onClick={async () => {
                      setGeneratingSeoDraft(true);
                      try {
                        const res = await adminRequestSeoSuggestion({
                          pageTitle: seoPageTitle,
                          slug: seoSlug || '/',
                          contentSummary: seoContentSummary,
                          existingTitles: effectivePages
                            .filter((p) => p.id !== editSeoPage?.id)
                            .map((p) => p.seoTitle)
                            .filter(Boolean),
                        });
                        if (res.error) {
                          addToast({ type: 'error', title: 'Draft generation failed', description: res.error });
                        } else if (res.aiDraftSeoTitle && res.aiDraftMetaDescription) {
                          setUnapprovedDraft({
                            seoTitle: res.aiDraftSeoTitle,
                            metaDescription: res.aiDraftMetaDescription,
                            usedAi: res.usedAi,
                          });
                          setDraftApprovedFlag(false);
                        }
                      } finally {
                        setGeneratingSeoDraft(false);
                      }
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {generatingSeoDraft ? 'Drafting...' : 'Generate Draft Suggestion'}
                  </Button>
                </div>

                {unapprovedDraft && (
                  <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-lg p-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#92400E]">
                        Unapproved Draft Suggestion — Review Before Applying
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="emerald"
                          size="sm"
                          onClick={() => {
                            setSeoMetaTitle(unapprovedDraft.seoTitle);
                            setSeoMetaDesc(unapprovedDraft.metaDescription);
                            if (!seoOgTitle) setSeoOgTitle(unapprovedDraft.seoTitle);
                            if (!seoOgDesc) setSeoOgDesc(unapprovedDraft.metaDescription);
                            setDraftApprovedFlag(true);
                            setUnapprovedDraft(null);
                            addToast({ type: 'success', title: 'Draft applied to editor for your final save' });
                          }}
                        >
                          Approve &amp; Apply Draft
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUnapprovedDraft(null);
                            setDraftApprovedFlag(false);
                          }}
                        >
                          Discard
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-[#78350F]">
                      <div>
                        <strong>Suggested Title:</strong> {unapprovedDraft.seoTitle}
                      </div>
                      <div className="mt-1">
                        <strong>Suggested Description:</strong> {unapprovedDraft.metaDescription}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#334155]">SEO Meta Title</label>
                      <span className="font-mono text-[11px] text-[#64748B] tabular-nums">
                        {seoMetaTitle.length} / 65 chars
                      </span>
                    </div>
                    <input
                      maxLength={120}
                      value={seoMetaTitle}
                      onChange={(e) => setSeoMetaTitle(e.target.value)}
                      placeholder="Unique page title | ETP – EPR Bazaar"
                      className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#334155]">Meta Description</label>
                      <span className="font-mono text-[11px] text-[#64748B] tabular-nums">
                        {seoMetaDesc.length} / 160 chars
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={320}
                      value={seoMetaDesc}
                      onChange={(e) => setSeoMetaDesc(e.target.value)}
                      placeholder="Clear factual summary for search engine snippets (120–160 characters recommended)."
                      className="w-full p-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#334155] mb-1">
                        Canonical URL (HTTPS)
                      </label>
                      <input
                        required
                        value={seoCanonical}
                        onChange={(e) => setSeoCanonical(e.target.value)}
                        className="w-full h-10 px-3 text-xs font-mono border border-[#CBD5E1] rounded-lg"
                      />
                      {!modalCanonicalCheck.valid && (
                        <p className="text-[11px] text-[#DC2626] mt-1">{modalCanonicalCheck.reason}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#334155] mb-1">
                        Search Indexing Directive
                      </label>
                      <select
                        value={seoPublished ? seoRobots : 'noindex, nofollow'}
                        disabled={!seoPublished}
                        onChange={(e) =>
                          setSeoRobots(e.target.value as 'index, follow' | 'noindex, nofollow')
                        }
                        className="w-full h-10 px-3 text-xs font-mono border border-[#CBD5E1] rounded-lg bg-white disabled:bg-[#F1F5F9]"
                      >
                        <option value="index, follow">index, follow</option>
                        <option value="noindex, nofollow">noindex, nofollow</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#334155] mb-1">Open Graph Title</label>
                      <input
                        maxLength={120}
                        value={seoOgTitle}
                        onChange={(e) => setSeoOgTitle(e.target.value)}
                        placeholder="Defaults to SEO Title"
                        className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#334155] mb-1">Social Share Card</label>
                      <select
                        value={seoTwitterCard}
                        onChange={(e) =>
                          setSeoTwitterCard(e.target.value as 'summary_large_image' | 'summary')
                        }
                        className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                      >
                        <option value="summary_large_image">Large Summary Card</option>
                        <option value="summary">Compact Summary Card</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Open Graph Description</label>
                    <input
                      maxLength={320}
                      value={seoOgDesc}
                      onChange={(e) => setSeoOgDesc(e.target.value)}
                      placeholder="Defaults to Meta Description"
                      className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Open Graph Image URL</label>
                    <input
                      maxLength={400}
                      value={seoOgImage}
                      onChange={(e) => setSeoOgImage(e.target.value)}
                      className="w-full h-10 px-3 text-xs font-mono border border-[#CBD5E1] rounded-lg"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 text-xs font-medium text-[#0A172A] pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seoPublished}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSeoPublished(checked);
                        setSeoRobots(checked ? 'index, follow' : 'noindex, nofollow');
                      }}
                      className="w-4 h-4 rounded border-[#CBD5E1]"
                    />
                    Publish page publicly and include canonical URL in sitemap.xml
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                  <Button variant="secondary" onClick={() => setSeoModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingSeo || !modalCanonicalCheck.valid}
                  >
                    {savingSeo ? 'Saving & Updating Sitemap...' : 'Save & Refresh Sitemap'}
                  </Button>
                </div>
              </form>
            </Modal>

            <ConfirmModal
              open={deleteSeoConfirm !== null}
              onClose={() => setDeleteSeoConfirm(null)}
              onConfirm={() => {
                if (!deleteSeoConfirm) return;
                void adminDeleteSeoPage(deleteSeoConfirm);
                setDeleteSeoConfirm(null);
              }}
              title="Delete Public Page & Remove From Sitemap"
              description={
                deleteSeoConfirm
                  ? `Permanently delete custom public page "${deleteSeoConfirm.pageTitle}" (${deleteSeoConfirm.slug}) and remove its canonical URL from the XML sitemap?`
                  : ''
              }
              confirmLabel="Delete Page"
              variant="danger"
            />
          </div>
        );
      })()}

      <Modal
        open={staffModalRole !== null}
        onClose={() => setStaffModalRole(null)}
        title={staffModalRole === 'facilitator' ? 'Authorise Facilitator Access' : 'Provision Administrator Access'}
        maxWidth="max-w-md"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!staffModalRole) return;
            setSavingStaff(true);
            try {
              await adminCreateStaffRecord({
                roleType: staffModalRole,
                uid: staffUid.trim() || undefined,
                name: staffName.trim(),
                email: staffEmail.trim(),
                department: staffExtra.trim(),
                roleTitle: staffExtra.trim(),
              });
              setStaffModalRole(null);
            } catch (err) {
              addToast({
                type: 'error',
                title: 'Provisioning failed',
                description: err instanceof Error ? err.message : 'Check the email format and fields.',
              });
            } finally {
              setSavingStaff(false);
            }
          }}
        >
          <p className="text-xs text-[#475569]">
            {staffModalRole === 'facilitator'
              ? 'Enter the staff member’s full name and authorised Google email address. Account linking completes automatically on their first Google Sign-In.'
              : 'Enter the authorised administrator’s Account ID and verified email below to grant portal access.'}
          </p>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Full Name *</label>
            <input
              required
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Staff full name"
              className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">
              {staffModalRole === 'facilitator' ? 'Authorised Google / Company Email *' : 'Administrator Email *'}
            </label>
            <input
              type="email"
              required
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder={staffModalRole === 'facilitator' ? 'facilitator@eprbazaar.com or name@gmail.com' : 'admin@company.com'}
              className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">
              {staffModalRole === 'facilitator' ? 'Trading Desk / Department' : 'Admin Role Title'}
            </label>
            <input
              value={staffExtra}
              onChange={(e) => setStaffExtra(e.target.value)}
              className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">
              {staffModalRole === 'facilitator'
                ? 'Staff Account ID (Optional — auto-linked on Google Sign-In)'
                : 'Staff Account ID *'}
            </label>
            <input
              required={staffModalRole === 'admin'}
              value={staffUid}
              onChange={(e) => setStaffUid(e.target.value)}
              placeholder={
                staffModalRole === 'facilitator'
                  ? 'Leave blank for Google Sign-In facilitators'
                  : 'Enter Staff Account ID'
              }
              className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStaffModalRole(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={savingStaff}>
              {savingStaff ? 'Saving...' : 'Grant Access'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={removeFacTarget !== null}
        onClose={() => setRemoveFacTarget(null)}
        onConfirm={() => {
          if (!removeFacTarget) return;
          void adminDeleteAuthorizedFacilitator(removeFacTarget.email, removeFacTarget.uid);
          setRemoveFacTarget(null);
        }}
        title="Remove Facilitator Access"
        description={
          removeFacTarget
            ? `Revoke Portal Facilitator login access for ${removeFacTarget.name} (${removeFacTarget.email})? They will no longer be able to sign in with Google or company credentials.`
            : ''
        }
        confirmLabel="Revoke Access"
        variant="danger"
      />

      <ConfirmModal
        open={approvalConfirm !== null}
        onClose={() => setApprovalConfirm(null)}
        onConfirm={() => {
          if (!approvalConfirm) return;
          if (approvalConfirm.kind === 'listing' && approvalConfirm.listing) {
            void adminApproveListing(approvalConfirm.listing, approvalConfirm.decision);
          } else if (approvalConfirm.kind === 'requirement' && approvalConfirm.requirement) {
            void adminApproveRequirement(approvalConfirm.requirement, approvalConfirm.decision);
          }
        }}
        title={`Confirm ${approvalConfirm?.decision === 'Active' ? 'Approval' : 'Rejection'}`}
        description={`Proceed with marking ${approvalConfirm?.id} as ${approvalConfirm?.decision}?`}
        confirmLabel={approvalConfirm?.decision === 'Active' ? 'Approve & Activate' : 'Confirm Reject'}
        variant={approvalConfirm?.decision === 'Active' ? 'emerald' : 'danger'}
      />
    </PortalShell>
  );
};
