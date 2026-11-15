import React, { useEffect, useState } from 'react';
import {
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  FilePlus2,
  FileText,
  Handshake,
  History,
  LayoutDashboard,
  ListChecks,
  PackageCheck,
  Plus,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { PortalShell, SidebarNavItem } from './PortalShell';
import {
  Button,
  ConfirmModal,
  EmptyState,
  formatINR,
  MetricCard,
  Modal,
  SkeletonTable,
  StatusBadge,
} from '../ui/DesignSystem';
import { CompanyProfileView, DocumentsView, NotificationsView, PaymentsView } from './SharedPortalViews';
import { SellerListing, SellerTab, formatTime } from '../../types';

export const SellerPortal: React.FC = () => {
  const {
    sellerTab,
    setSellerTab,
    currentSeller,
    categories,
    subcategories,
    publishedRates,
    listings,
    matches,
    offers,
    negotiations,
    orders,
    notifications,
    dataLoading,
    selectedListingId,
    selectedOfferId,
    selectedOrderId,
    submitSellerListing,
    updateListingStatus,
    editListing,
    respondToOffer,
    uploadDocumentFile,
    addToast,
  } = useMarketplace();

  const activeCategories = categories.filter((c) => c.active);
  const unreadNotifs = notifications.filter((n) => n.targetRole === 'seller' && !n.read).length;

  const [catId, setCatId] = useState('');
  const selectedCat = activeCategories.find((c) => c.id === catId) || activeCategories[0];
  const catSubcats = subcategories.filter((s) => s.categoryId === selectedCat?.id && s.active);

  const [subcat, setSubcat] = useState('');
  const [fy, setFy] = useState('FY 2025-26');
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [certRef, setCertRef] = useState('');
  const [info, setInfo] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedListingId, setSubmittedListingId] = useState<string | null>(null);

  const [editingListing, setEditingListing] = useState<SellerListing | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editRate, setEditRate] = useState('');
  const [editInfo, setEditInfo] = useState('');
  const [withdrawId, setWithdrawId] = useState<string | null>(null);

  const [offerActionModal, setOfferActionModal] = useState<'accept' | 'reject' | null>(null);
  const [counterRate, setCounterRate] = useState('');
  const [counterQty, setCounterQty] = useState('');
  const [counterMsg, setCounterMsg] = useState('');
  const [showCounterForm, setShowCounterForm] = useState(false);

  useEffect(() => {
    if (activeCategories.length > 0 && !catId) {
      const first = activeCategories[0];
      setCatId(first.id);
      const firstSubs = subcategories.filter((s) => s.categoryId === first.id && s.active);
      setSubcat(firstSubs[0]?.name || 'Standard');
      const fyList = first.financialYears?.length ? first.financialYears : ['FY 2025-26'];
      setFy(fyList[0]);
    }
  }, [activeCategories, subcategories, catId]);

  useEffect(() => {
    if (selectedCat) {
      const subs = subcategories.filter((s) => s.categoryId === selectedCat.id && s.active);
      if (subs.length > 0 && !subs.some((s) => s.name === subcat)) {
        setSubcat(subs[0].name);
      } else if (subs.length === 0 && !subcat) {
        setSubcat('Standard');
      }
      const fyList = selectedCat.financialYears?.length ? selectedCat.financialYears : ['FY 2025-26'];
      if (!fyList.includes(fy)) {
        setFy(fyList[0]);
      }
    }
  }, [selectedCat, subcategories, subcat, fy]);

  const totalAvailableQty = listings
    .filter((l) => l.status === 'Active' || l.status === 'Partially Allocated')
    .reduce((s, l) => s + l.remainingQty, 0);

  const navItems: SidebarNavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'company-profile', label: 'Company Profile', icon: Building2 },
    { id: 'verification', label: 'Verification', icon: ShieldCheck },
    { id: 'create-listing', label: 'Create Listing', icon: FilePlus2 },
    { id: 'my-listings', label: 'My Listings', icon: ListChecks },
    { id: 'matching-opportunities', label: 'Matching Opportunities', icon: Handshake, badge: matches.length },
    {
      id: 'offers-received',
      label: 'Offers Received',
      icon: FileCheck2,
      badge: offers.filter((o) => o.status === 'Pending Response').length,
    },
    { id: 'negotiation-history', label: 'Negotiation History', icon: History },
    { id: 'my-orders', label: 'My Orders', icon: PackageCheck },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const activeListingDetail = listings.find((l) => l.id === selectedListingId) || listings[0];
  const activeOfferDetail = offers.find((o) => o.id === selectedOfferId) || offers[0];
  const activeOrderDetail = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const selectedPublishedRate = publishedRates.find(
    (m) => m.published && m.categoryId === selectedCat?.id && m.financialYear === fy
  );

  const handleSubmitListing = async (asDraft: boolean) => {
    if (!selectedCat) {
      setFormError('No active EPR category selected.');
      return;
    }
    const q = Number(qty);
    const r = Number(rate);
    if (!Number.isFinite(q) || q <= 0) {
      setFormError('Please enter a valid available quantity greater than 0.');
      return;
    }
    if (!Number.isFinite(r) || r <= 0) {
      setFormError('Please enter a valid expected selling rate greater than 0.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const id = await submitSellerListing(
        {
          category: selectedCat,
          subcategory: subcat || 'Standard',
          financialYear: fy,
          listedQty: q,
          askingRate: r,
          certificateRef: certRef,
          additionalInfo: info,
        },
        asDraft
      );
      if (certFile) {
        await uploadDocumentFile('EPR Certificates', certFile, id);
      }
      setSubmittedListingId(id);
      setQty('');
      setRate('');
      setCertRef('');
      setInfo('');
      setCertFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save listing.';
      setFormError(msg);
      addToast({ type: 'error', title: 'Listing error', description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalShell
      portalTitle="Seller Portal"
      userTitle={currentSeller?.companyName || 'Verified Seller Account'}
      userSubtitle={currentSeller ? `${currentSeller.companyId} · ${currentSeller.eprRegNo}` : 'Seller Session'}
      navItems={navItems}
      activeTab={sellerTab}
      onSelectTab={(t) => {
        setSubmittedListingId(null);
        setFormError(null);
        setSellerTab(t as SellerTab);
      }}
      onOpenNotifications={() => setSellerTab('notifications')}
      headerAction={
        <Button
          variant="emerald"
          size="sm"
          onClick={() => {
            setSubmittedListingId(null);
            setFormError(null);
            setSellerTab('create-listing');
          }}
        >
          <Plus className="w-3.5 h-3.5" /> List EPR Credits
        </Button>
      }
    >
      {sellerTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#0A172A]">Seller Inventory Overview</h1>
              <p className="text-xs text-[#64748B]">
                Manage listed EPR credit lots, monitor buyer matches, and review facilitated offers.
              </p>
            </div>
            <Button
              variant="emerald"
              onClick={() => {
                setSubmittedListingId(null);
                setSellerTab('create-listing');
              }}
            >
              <Plus className="w-4 h-4" /> List EPR Credits
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard
              label="Active Listings"
              value={listings.filter((l) => l.status === 'Active' || l.status === 'Partially Allocated').length}
              onClick={() => setSellerTab('my-listings')}
            />
            <MetricCard
              label="Available Quantity"
              value={`${totalAvailableQty.toLocaleString('en-IN')}`}
              accent="emerald"
              onClick={() => setSellerTab('my-listings')}
            />
            <MetricCard
              label="Matching Enquiries"
              value={matches.length}
              onClick={() => setSellerTab('matching-opportunities')}
            />
            <MetricCard
              label="Offers Received"
              value={offers.length}
              accent="amber"
              onClick={() => setSellerTab('offers-received')}
            />
            <MetricCard
              label="Active Orders"
              value={orders.filter((o) => o.orderStatus !== 'Transaction Completed').length}
              onClick={() => setSellerTab('my-orders')}
            />
            <MetricCard
              label="Completed Deals"
              value={orders.filter((o) => o.orderStatus === 'Transaction Completed').length}
              accent="emerald"
              onClick={() => setSellerTab('my-orders')}
            />
          </div>

          {dataLoading ? (
            <SkeletonTable rows={4} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                <div className="h-12 px-4 border-b border-[#F1F5F9] flex items-center justify-between">
                  <h2 className="font-display text-sm font-semibold text-[#0A172A]">Recent EPR Credit Listings</h2>
                  <button
                    type="button"
                    onClick={() => setSellerTab('my-listings')}
                    className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
                  >
                    Manage All
                  </button>
                </div>
                {listings.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#64748B]">
                    No seller listings available. Create a listing to publish verified EPR inventory.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                          <th className="py-2.5 px-4">Listing ID</th>
                          <th className="py-2.5 px-4">Category</th>
                          <th className="py-2.5 px-4 text-right">Remaining</th>
                          <th className="py-2.5 px-4 text-right">Asking Rate</th>
                          <th className="py-2.5 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] text-xs">
                        {listings.slice(0, 6).map((l) => (
                          <tr
                            key={l.id}
                            onClick={() => setSellerTab('listing-details', l.id)}
                            className="hover:bg-[#F8FAFC] cursor-pointer"
                          >
                            <td className="py-3 px-4 font-mono font-semibold text-[#10233F]">{l.id}</td>
                            <td className="py-3 px-4 font-medium text-[#0A172A]">{l.categoryName}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums">
                              {l.remainingQty} {l.unit}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(l.askingRate)}</td>
                            <td className="py-3 px-4">
                              <StatusBadge status={l.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-lg p-4 space-y-3">
                <h2 className="font-display text-sm font-semibold text-[#0A172A] pb-2 border-b border-[#F1F5F9]">
                  Latest Buyer Matches
                </h2>
                {matches.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#64748B]">No matching opportunities found.</div>
                ) : (
                  matches.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSellerTab('matching-opportunities')}
                      className="p-3 bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg hover:border-[#10233F] cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-[#10233F]">{m.id}</span>
                        <StatusBadge status={m.status} />
                      </div>
                      <div className="text-sm font-semibold text-[#0A172A]">
                        {m.categoryName} · {m.matchingQty} {m.unit}
                      </div>
                      <div className="text-xs text-[#64748B]">
                        Buyer identity withheld · Coordinated by EPR Bazaar
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="lg:col-span-12 bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                <div className="h-12 px-4 border-b border-[#F1F5F9] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#16A36A]" />
                    <h2 className="font-display text-sm font-semibold text-[#0A172A]">Notification History</h2>
                    {unreadNotifs > 0 && (
                      <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] text-[11px] font-semibold">
                        {unreadNotifs} unread
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSellerTab('notifications')}
                    className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
                  >
                    Open Notification Centre
                  </button>
                </div>
                {notifications.filter((n) => n.targetRole === 'seller').length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#64748B]">
                    No category email or marketplace notifications yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F1F5F9]">
                    {notifications
                      .filter((n) => n.targetRole === 'seller')
                      .slice(0, 5)
                      .map((n) => (
                        <div
                          key={n.id}
                          onClick={() => setSellerTab('notifications')}
                          className={`px-4 py-3 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-[#F8FAFC] ${
                            n.read ? 'bg-white' : 'bg-[#F8FAFF]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-[#0A172A] truncate">{n.title}</div>
                            <div className="text-[11px] text-[#64748B] mt-0.5 flex flex-wrap items-center gap-2">
                              <span>{n.categoryName || n.category}</span>
                              {n.listingId && (
                                <span className="font-mono font-semibold text-[#1E3A8A]">{n.listingId}</span>
                              )}
                              <span>·</span>
                              <span>{formatTime(n.sentAt || n.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {n.emailStatus && <StatusBadge status={n.emailStatus === 'sent' ? 'Sent' : n.emailStatus === 'failed' ? 'Failed' : 'Pending'} />}
                            <StatusBadge status={n.read ? 'Read' : 'Unread'} />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {sellerTab === 'create-listing' && (
        <div className="max-w-3xl">
          {submittedListingId ? (
            <div className="bg-white border border-[#86EFAC] rounded-lg p-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-[#16A36A] mx-auto" />
              <h1 className="font-display text-2xl font-bold text-[#0A172A]">Listing Recorded</h1>
              <p className="text-sm text-[#475569]">
                Listing <span className="font-mono font-bold text-[#0A172A]">{submittedListingId}</span> has been recorded.{' '}
                {currentSeller?.verification === 'Verified'
                  ? 'As a verified seller, your listing is live and matching buyers in this category are being notified.'
                  : 'Submitted listings enter the Admin approval queue before entering active matching and buyer alerts.'}
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Button variant="primary" onClick={() => setSellerTab('my-listings')}>
                  Go to My Listings
                </Button>
                <Button variant="secondary" onClick={() => setSubmittedListingId(null)}>
                  Create Another Listing
                </Button>
              </div>
            </div>
          ) : activeCategories.length === 0 ? (
            <EmptyState
              title="No Active EPR Categories Published"
              description="EPR categories must be configured by the platform administrator before creating credit listings."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-6">
              <div className="border-b border-[#E2E8F0] pb-4">
                <h1 className="font-display text-xl font-bold text-[#0A172A]">Create EPR Credit Listing</h1>
                <p className="text-xs text-[#64748B] mt-1">
                  Enter available credit tonnage, financial year, and expected selling rate.
                </p>
              </div>

              {formError && (
                <div className="p-3 bg-[#FFE4E6] border border-[#FECDD3] rounded-lg text-xs text-[#BE123C]">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">EPR Category *</label>
                  <select
                    value={selectedCat?.id || ''}
                    onChange={(e) => {
                      const next = activeCategories.find((c) => c.id === e.target.value);
                      if (!next) return;
                      setCatId(next.id);
                      const subs = subcategories.filter((s) => s.categoryId === next.id && s.active);
                      setSubcat(subs[0]?.name || 'Standard');
                      const fyList = next.financialYears?.length ? next.financialYears : ['FY 2025-26'];
                      setFy(fyList[0]);
                    }}
                    className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    {activeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Subcategory *</label>
                  {catSubcats.length > 0 ? (
                    <select
                      value={subcat}
                      onChange={(e) => setSubcat(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                    >
                      {catSubcats.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={subcat}
                      onChange={(e) => setSubcat(e.target.value)}
                      placeholder="e.g. Category I Rigid Plastic"
                      className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Financial Year *</label>
                  <select
                    value={fy}
                    onChange={(e) => setFy(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    {(selectedCat?.financialYears?.length
                      ? selectedCat.financialYears
                      : ['FY 2024-25', 'FY 2025-26', 'FY 2026-27']
                    ).map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Available Quantity ({selectedCat?.unit || 'MT'}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="any"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="Enter available tonnage/units"
                    className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Expected Selling Rate (INR / {selectedCat?.unit || 'MT'}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="any"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder={
                      selectedPublishedRate
                        ? `Reference: ${selectedPublishedRate.rate}`
                        : 'Enter asking rate in INR'
                    }
                    className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Certificate Reference Number (if applicable)
                  </label>
                  <input
                    value={certRef}
                    onChange={(e) => setCertRef(e.target.value)}
                    placeholder="Optional certificate reference"
                    className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Attach EPR Certificate / Credit Snapshot (Optional · PDF/PNG/JPEG max 10 MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#334155] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-[#CBD5E1] file:bg-[#F8FAFC] file:text-xs file:font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Additional Information</label>
                <textarea
                  rows={3}
                  value={info}
                  onChange={(e) => setInfo(e.target.value)}
                  className="w-full p-3 text-sm border border-[#CBD5E1] rounded-lg"
                  placeholder="Describe plant batch, processing period, or transfer readiness..."
                />
              </div>
              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <Button variant="ghost" onClick={() => setSellerTab('overview')}>
                  Cancel
                </Button>
                <Button variant="secondary" disabled={submitting} onClick={() => void handleSubmitListing(true)}>
                  Save Draft
                </Button>
                <Button variant="emerald" disabled={submitting} onClick={() => void handleSubmitListing(false)}>
                  {submitting ? 'Submitting...' : 'Submit for Approval'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {sellerTab === 'my-listings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-xl font-bold text-[#0A172A]">My EPR Credit Listings</h1>
            <Button
              variant="emerald"
              size="sm"
              onClick={() => {
                setSubmittedListingId(null);
                setSellerTab('create-listing');
              }}
            >
              + New Listing
            </Button>
          </div>
          {dataLoading ? (
            <SkeletonTable />
          ) : listings.length === 0 ? (
            <EmptyState
              title="No seller listings available."
              description="Create your first EPR credit listing to enter the Admin approval and matching workflow."
              actionLabel="Create Listing"
              onAction={() => setSellerTab('create-listing')}
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Listing ID</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">FY</th>
                      <th className="py-3 px-4 text-right">Listed</th>
                      <th className="py-3 px-4 text-right">Allocated</th>
                      <th className="py-3 px-4 text-right">Remaining</th>
                      <th className="py-3 px-4 text-right">Asking Rate</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {listings.map((l) => (
                      <tr key={l.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-[#10233F]">{l.id}</td>
                        <td className="py-3 px-4 font-medium">{l.categoryName}</td>
                        <td className="py-3 px-4 font-mono text-xs">{l.financialYear}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {l.listedQty} {l.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#16A36A]">{l.allocatedQty}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{l.remainingQty}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(l.askingRate)}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={l.status} />
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={() => setSellerTab('listing-details', l.id)}>
                            View
                          </Button>
                          {l.status !== 'Withdrawn' && l.status !== 'Rejected' && l.status !== 'Allocated' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingListing(l);
                                setEditQty(String(l.listedQty));
                                setEditRate(String(l.askingRate));
                                setEditInfo(l.additionalInfo || '');
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          {l.status === 'Active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void updateListingStatus(l.id, 'Paused')}
                            >
                              Pause
                            </Button>
                          )}
                          {l.status === 'Paused' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void updateListingStatus(l.id, 'Active')}
                            >
                              Resume
                            </Button>
                          )}
                          {l.status !== 'Withdrawn' && l.status !== 'Rejected' && l.status !== 'Allocated' && (
                            <Button variant="ghost" size="sm" onClick={() => setWithdrawId(l.id)}>
                              Withdraw
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

          <Modal
            open={editingListing !== null}
            onClose={() => setEditingListing(null)}
            title={`Edit Listing ${editingListing?.id}`}
            maxWidth="max-w-md"
          >
            {editingListing && (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void editListing(editingListing.id, Number(editQty), Number(editRate), editInfo);
                  setEditingListing(null);
                }}
              >
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Listed Quantity ({editingListing.unit})
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Asking Rate (INR)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={editInfo}
                    onChange={(e) => setEditInfo(e.target.value)}
                    className="w-full p-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setEditingListing(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Save Changes
                  </Button>
                </div>
              </form>
            )}
          </Modal>

          <ConfirmModal
            open={withdrawId !== null}
            onClose={() => setWithdrawId(null)}
            onConfirm={() => {
              if (withdrawId) void updateListingStatus(withdrawId, 'Withdrawn');
            }}
            title="Withdraw Listing"
            description={`Are you sure you want to withdraw listing ${withdrawId}? Active matching on remaining credits will stop.`}
            confirmLabel="Withdraw Listing"
            variant="danger"
          />
        </div>
      )}

      {sellerTab === 'listing-details' && (
        activeListingDetail ? (
          <div className="space-y-4 max-w-3xl">
            <button
              type="button"
              onClick={() => setSellerTab('my-listings')}
              className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
            >
              ← Back to My Listings
            </button>
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5">
              <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
                <div>
                  <div className="font-mono text-xs text-[#64748B]">
                    {activeListingDetail.id}
                    {activeListingDetail.certificateRef ? ` · Cert: ${activeListingDetail.certificateRef}` : ''}
                  </div>
                  <h1 className="font-display text-xl font-bold text-[#0A172A] mt-0.5">
                    {activeListingDetail.categoryName}
                  </h1>
                  <div className="text-xs text-[#475569]">
                    {activeListingDetail.subcategory} · {activeListingDetail.financialYear}
                  </div>
                </div>
                <StatusBadge status={activeListingDetail.status} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Original Quantity</div>
                  <div className="font-mono font-bold mt-1">
                    {activeListingDetail.listedQty} {activeListingDetail.unit}
                  </div>
                </div>
                <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Allocated</div>
                  <div className="font-mono font-bold text-[#16A36A] mt-1">
                    {activeListingDetail.allocatedQty} {activeListingDetail.unit}
                  </div>
                </div>
                <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Remaining</div>
                  <div className="font-mono font-bold mt-1">
                    {activeListingDetail.remainingQty} {activeListingDetail.unit}
                  </div>
                </div>
                <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Asking Rate</div>
                  <div className="font-mono font-bold mt-1">
                    {formatINR(activeListingDetail.askingRate)}/{activeListingDetail.unit}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="No seller listings available." description="Select a listing to view details." />
        )
      )}

      {sellerTab === 'matching-opportunities' && (
        <div className="space-y-4">
          <div>
            <h1 className="font-display text-xl font-bold text-[#0A172A]">Matching Buyer Requirements</h1>
            <div className="mt-2 p-3.5 bg-[#DCFCE7] border border-[#86EFAC] rounded-lg text-xs text-[#15803D]">
              A buyer requirement matches your listed EPR credits. EPR Bazaar will coordinate the negotiation and communicate the offer.
            </div>
          </div>
          {matches.length === 0 ? (
            <EmptyState
              title="No matching opportunities found."
              description="Once buyers submit matching requirements, they will appear here without exposing buyer identity."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Match ID</th>
                      <th className="py-3 px-4">EPR Category</th>
                      <th className="py-3 px-4">FY</th>
                      <th className="py-3 px-4 text-right">Requested Qty</th>
                      <th className="py-3 px-4 text-right">Indicative Matching Rate</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {matches.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono text-xs font-semibold">{m.id}</td>
                        <td className="py-3 px-4 font-medium">{m.categoryName}</td>
                        <td className="py-3 px-4 font-mono text-xs">{m.financialYear}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {m.matchingQty} {m.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                          {formatINR(m.indicativeRate)}/{m.unit}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="secondary" size="sm" onClick={() => setSellerTab('offers-received')}>
                            Review Offers
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

      {sellerTab === 'offers-received' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Offers Received</h1>
          {offers.length === 0 ? (
            <EmptyState
              title="No offers received."
              description="Offers shared by EPR Bazaar facilitators for your matched inventory will appear here."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Offer ID</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Quantity</th>
                      <th className="py-3 px-4 text-right">Proposed Rate</th>
                      <th className="py-3 px-4">Validity</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {offers.map((o) => (
                      <tr key={o.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono text-xs font-semibold">{o.id}</td>
                        <td className="py-3 px-4 font-medium">{o.categoryName}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {o.quantity} {o.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                          {formatINR(o.offeredRate)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">{o.expiryDate}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setShowCounterForm(false);
                              setSellerTab('offer-details', o.id);
                            }}
                          >
                            Open Offer
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

      {sellerTab === 'offer-details' && (
        activeOfferDetail ? (
          <div className="space-y-4 max-w-3xl">
            <button
              type="button"
              onClick={() => setSellerTab('offers-received')}
              className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
            >
              ← Back to Offers Received
            </button>
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5">
              <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
                <div>
                  <div className="font-mono text-xs text-[#64748B]">
                    {activeOfferDetail.id} · {activeOfferDetail.matchId}
                  </div>
                  <h1 className="font-display text-xl font-bold text-[#0A172A] mt-0.5">
                    {activeOfferDetail.categoryName}
                  </h1>
                  <div className="text-xs text-[#64748B]">Buyer identity withheld · Facilitated by EPR Bazaar</div>
                </div>
                <StatusBadge status={activeOfferDetail.status} />
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Quantity</div>
                  <div className="font-mono font-bold mt-1">
                    {activeOfferDetail.quantity} {activeOfferDetail.unit}
                  </div>
                </div>
                <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Proposed Rate</div>
                  <div className="font-mono font-bold mt-1">{formatINR(activeOfferDetail.offeredRate)}</div>
                </div>
                <div className="p-3 bg-[#DCFCE7] rounded-lg border border-[#86EFAC]">
                  <div className="text-xs text-[#15803D]">Basic Value</div>
                  <div className="font-mono font-bold text-[#15803D] mt-1">
                    {formatINR(activeOfferDetail.quantity * activeOfferDetail.offeredRate)}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm">
                {activeOfferDetail.facilitatorMessage}
              </div>

              {activeOfferDetail.status === 'Pending Response' && (
                <div className="flex flex-wrap gap-3">
                  <Button variant="emerald" onClick={() => setOfferActionModal('accept')}>
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCounterRate(String(activeOfferDetail.offeredRate));
                      setCounterQty(String(activeOfferDetail.quantity));
                      setShowCounterForm((v) => !v);
                    }}
                  >
                    Submit Counteroffer
                  </Button>
                  <Button variant="danger" onClick={() => setOfferActionModal('reject')}>
                    Reject
                  </Button>
                </div>
              )}

              {showCounterForm && (
                <form
                  className="p-4 bg-[#F4F7FB] border border-[#CBD5E1] rounded-lg space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void respondToOffer(
                      activeOfferDetail,
                      'counter',
                      Number(counterRate),
                      Number(counterQty),
                      counterMsg
                    );
                    setShowCounterForm(false);
                  }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#334155] mb-1">
                        Revised Asking Rate (INR)
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={counterRate}
                        onChange={(e) => setCounterRate(e.target.value)}
                        className="w-full h-9 px-3 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#334155] mb-1">
                        Quantity ({activeOfferDetail.unit})
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={counterQty}
                        onChange={(e) => setCounterQty(e.target.value)}
                        className="w-full h-9 px-3 text-sm font-mono bg-white border border-[#CBD5E1] rounded-lg"
                      />
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={counterMsg}
                    onChange={(e) => setCounterMsg(e.target.value)}
                    className="w-full p-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg"
                    placeholder="Notes for EPR Bazaar facilitator..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowCounterForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm">
                      Submit Counteroffer
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <ConfirmModal
              open={offerActionModal !== null}
              onClose={() => setOfferActionModal(null)}
              onConfirm={() => {
                if (offerActionModal) void respondToOffer(activeOfferDetail, offerActionModal);
              }}
              title={offerActionModal === 'accept' ? 'Accept Facilitated Offer' : 'Reject Facilitated Offer'}
              description={
                offerActionModal === 'accept'
                  ? `Confirm readiness to allocate ${activeOfferDetail.quantity} ${activeOfferDetail.unit} at ${formatINR(activeOfferDetail.offeredRate)}/${activeOfferDetail.unit}.`
                  : `Reject offer ${activeOfferDetail.id}?`
              }
              confirmLabel={offerActionModal === 'accept' ? 'Confirm Acceptance' : 'Reject Offer'}
              variant={offerActionModal === 'accept' ? 'emerald' : 'danger'}
            />
          </div>
        ) : (
          <EmptyState title="No offers received." description="Select an offer to inspect its details." />
        )
      )}

      {sellerTab === 'negotiation-history' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Negotiation History</h1>
          {matches.length === 0 ? (
            <EmptyState
              title="No negotiations yet."
              description="Negotiation updates for your matched listings will appear here."
            />
          ) : (
            matches.map((m) => {
              const entries = negotiations.filter((e) => e.matchId === m.id && e.visibleToSeller);
              return (
                <div key={m.id} className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                    <div className="text-sm font-semibold text-[#0A172A]">
                      <span className="font-mono text-[#10233F] mr-2">{m.id}</span>
                      {m.categoryName} ({m.matchingQty} {m.unit})
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                  {entries.length === 0 ? (
                    <div className="text-xs text-[#64748B]">Awaiting facilitator offer dispatch.</div>
                  ) : (
                    <div className="space-y-2">
                      {entries.map((e) => (
                        <div
                          key={e.id}
                          className="p-3 bg-[#F4F7FB] rounded border border-[#E2E8F0] text-xs flex justify-between gap-4"
                        >
                          <div>
                            <span className="font-semibold">
                              {e.actor} · {e.actionType}
                            </span>
                            <p className="text-[#475569] mt-0.5">{e.message}</p>
                          </div>
                          <span className="font-mono text-[#64748B] shrink-0">{formatTime(e.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {sellerTab === 'my-orders' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">My Orders</h1>
          {orders.length === 0 ? (
            <EmptyState
              title="No orders available."
              description="Confirmed EPR credit allocations and orders will appear here."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                      <th className="py-3 px-4 text-right">Agreed Rate</th>
                      <th className="py-3 px-4 text-right">Basic Amount</th>
                      <th className="py-3 px-4">Transfer Status</th>
                      <th className="py-3 px-4">Order Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono text-xs font-semibold">{o.id}</td>
                        <td className="py-3 px-4 font-medium">{o.categoryName}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {o.quantity} {o.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(o.agreedRate)}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                          {formatINR(o.basicAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={o.transferStatus} />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={o.orderStatus} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSellerTab('order-details', o.id)}>
                            Details
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

      {sellerTab === 'order-details' && (
        activeOrderDetail ? (
          <div className="space-y-4 max-w-3xl">
            <button
              type="button"
              onClick={() => setSellerTab('my-orders')}
              className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
            >
              ← Back to My Orders
            </button>
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
              <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
                <div>
                  <div className="font-mono text-xs text-[#64748B]">{activeOrderDetail.id}</div>
                  <h1 className="font-display text-xl font-bold text-[#0A172A]">{activeOrderDetail.categoryName}</h1>
                </div>
                <StatusBadge status={activeOrderDetail.orderStatus} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-xs text-[#64748B]">Allocated Qty</div>
                  <div className="font-mono font-bold mt-1">
                    {activeOrderDetail.quantity} {activeOrderDetail.unit}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B]">Agreed Rate</div>
                  <div className="font-mono font-bold mt-1">{formatINR(activeOrderDetail.agreedRate)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B]">Payable Value</div>
                  <div className="font-mono font-bold text-[#16A36A] mt-1">
                    {formatINR(activeOrderDetail.totalAmount - activeOrderDetail.brokerageAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B]">Transfer Status</div>
                  <div className="mt-1">
                    <StatusBadge status={activeOrderDetail.transferStatus} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="No orders available." description="Select an order to view details." />
        )
      )}

      {sellerTab === 'company-profile' && (
        <CompanyProfileView account={currentSeller} accountType="seller" mode="profile" />
      )}
      {sellerTab === 'verification' && (
        <CompanyProfileView account={currentSeller} accountType="seller" mode="verification" />
      )}
      {sellerTab === 'settings' && (
        <CompanyProfileView account={currentSeller} accountType="seller" mode="settings" />
      )}
      {sellerTab === 'payments' && <PaymentsView />}
      {sellerTab === 'documents' && <DocumentsView ownerFilterRole="seller" />}
      {sellerTab === 'notifications' && (
        <NotificationsView
          onViewListing={(n) => {
            if (n.listingId?.startsWith('LST-')) {
              setSellerTab('listing-details', n.listingId);
            } else {
              setSellerTab('matching-opportunities');
            }
          }}
        />
      )}
    </PortalShell>
  );
};
