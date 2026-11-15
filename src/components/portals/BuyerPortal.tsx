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
import { BuyerTab, formatTime } from '../../types';

export const BuyerPortal: React.FC = () => {
  const {
    buyerTab,
    setBuyerTab,
    currentBuyer,
    categories,
    subcategories,
    publishedRates,
    requirements,
    matches,
    offers,
    negotiations,
    orders,
    documents,
    notifications,
    dataLoading,
    selectedRequirementId,
    selectedOfferId,
    selectedOrderId,
    submitBuyerRequirement,
    withdrawRequirement,
    respondToOffer,
    uploadDocumentFile,
    addToast,
  } = useMarketplace();

  const activeCategories = categories.filter((c) => c.active);
  const unreadNotifs = notifications.filter((n) => n.targetRole === 'buyer' && !n.read).length;

  const [reqCatId, setReqCatId] = useState('');
  const selectedCatObj = activeCategories.find((c) => c.id === reqCatId) || activeCategories[0];
  const catSubcats = subcategories.filter((s) => s.categoryId === selectedCatObj?.id && s.active);

  const [reqSubcat, setReqSubcat] = useState('');
  const [reqFy, setReqFy] = useState('FY 2025-26');
  const [reqQty, setReqQty] = useState('');
  const [reqRate, setReqRate] = useState('');
  const [reqDate, setReqDate] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [reqFile, setReqFile] = useState<File | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedReqId, setSubmittedReqId] = useState<string | null>(null);
  const [withdrawConfirmId, setWithdrawConfirmId] = useState<string | null>(null);

  const [matchCatFilter, setMatchCatFilter] = useState('ALL');
  const [matchFyFilter, setMatchFyFilter] = useState('ALL');

  const [offerActionModal, setOfferActionModal] = useState<'accept' | 'reject' | null>(null);
  const [counterRate, setCounterRate] = useState('');
  const [counterQty, setCounterQty] = useState('');
  const [counterMsg, setCounterMsg] = useState('');
  const [showCounterForm, setShowCounterForm] = useState(false);

  useEffect(() => {
    if (activeCategories.length > 0 && !reqCatId) {
      const first = activeCategories[0];
      setReqCatId(first.id);
      const firstSubs = subcategories.filter((s) => s.categoryId === first.id && s.active);
      setReqSubcat(firstSubs[0]?.name || 'Standard');
      const fyList = first.financialYears?.length ? first.financialYears : ['FY 2025-26'];
      setReqFy(fyList[0]);
    }
  }, [activeCategories, subcategories, reqCatId]);

  useEffect(() => {
    if (selectedCatObj) {
      const subs = subcategories.filter((s) => s.categoryId === selectedCatObj.id && s.active);
      if (subs.length > 0 && !subs.some((s) => s.name === reqSubcat)) {
        setReqSubcat(subs[0].name);
      } else if (subs.length === 0 && !reqSubcat) {
        setReqSubcat('Standard');
      }
      const fyList = selectedCatObj.financialYears?.length ? selectedCatObj.financialYears : ['FY 2025-26'];
      if (!fyList.includes(reqFy)) {
        setReqFy(fyList[0]);
      }
    }
  }, [selectedCatObj, subcategories, reqSubcat, reqFy]);

  const navItems: SidebarNavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'company-profile', label: 'Company Profile', icon: Building2 },
    { id: 'verification', label: 'Verification', icon: ShieldCheck },
    { id: 'submit-requirement', label: 'Submit Requirement', icon: FilePlus2 },
    { id: 'my-requirements', label: 'My Requirements', icon: ListChecks },
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

  const activeReqDetail = requirements.find((r) => r.id === selectedRequirementId) || requirements[0];
  const activeOfferDetail = offers.find((o) => o.id === selectedOfferId) || offers[0];
  const activeOrderDetail = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const filteredMatches = matches.filter((m) => {
    if (matchCatFilter !== 'ALL' && m.categoryId !== matchCatFilter) return false;
    if (matchFyFilter !== 'ALL' && m.financialYear !== matchFyFilter) return false;
    return true;
  });

  const validateRequirementForm = () => {
    if (!selectedCatObj) return 'No active EPR category selected.';
    const q = Number(reqQty);
    const r = Number(reqRate);
    if (!Number.isFinite(q) || q <= 0) return 'Please enter a valid required quantity greater than 0.';
    if (!Number.isFinite(r) || r <= 0) return 'Please enter a valid maximum buying rate greater than 0.';
    if (!reqDate) return 'Please select a target required-by date.';
    return null;
  };

  const handleSubmitRequirement = async (asDraft: boolean) => {
    const errMsg = validateRequirementForm();
    if (errMsg) {
      setFormError(errMsg);
      return;
    }
    if (!selectedCatObj) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const id = await submitBuyerRequirement(
        {
          category: selectedCatObj,
          subcategory: reqSubcat || 'Standard',
          financialYear: reqFy,
          requiredQty: Number(reqQty),
          maxBuyingRate: Number(reqRate),
          requiredDate: reqDate,
          additionalNotes: reqNotes,
        },
        asDraft
      );
      if (reqFile) {
        await uploadDocumentFile('Supporting Documents', reqFile, id);
      }
      setReviewOpen(false);
      setSubmittedReqId(id);
      setReqQty('');
      setReqRate('');
      setReqNotes('');
      setReqFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit requirement.';
      setFormError(msg);
      addToast({ type: 'error', title: 'Requirement submission failed', description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPublishedRate = publishedRates.find(
    (m) => m.published && m.categoryId === selectedCatObj?.id && m.financialYear === reqFy
  );

  return (
    <PortalShell
      portalTitle="Buyer Portal"
      userTitle={currentBuyer?.companyName || 'Verified Buyer Account'}
      userSubtitle={currentBuyer ? `${currentBuyer.companyId} · ${currentBuyer.eprRegNo}` : 'Buyer Session'}
      navItems={navItems}
      activeTab={buyerTab}
      onSelectTab={(t) => {
        setSubmittedReqId(null);
        setFormError(null);
        setBuyerTab(t as BuyerTab);
      }}
      onOpenNotifications={() => setBuyerTab('notifications')}
      headerAction={
        <Button
          variant="emerald"
          size="sm"
          onClick={() => {
            setSubmittedReqId(null);
            setFormError(null);
            setBuyerTab('submit-requirement');
          }}
        >
          <Plus className="w-3.5 h-3.5" /> Submit New EPR Requirement
        </Button>
      }
    >
      {buyerTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#0A172A]">Buyer Trading Overview</h1>
              <p className="text-xs text-[#64748B]">
                Submit credit requirements and track EPR Bazaar managed negotiations.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setSubmittedReqId(null);
                setBuyerTab('submit-requirement');
              }}
            >
              <Plus className="w-4 h-4" /> Submit New EPR Requirement
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              label="Active Requirements"
              value={requirements.filter((r) => r.status === 'Active' || r.status === 'Partially Matched').length}
              onClick={() => setBuyerTab('my-requirements')}
            />
            <MetricCard
              label="Matching Opportunities"
              value={matches.length}
              accent="emerald"
              onClick={() => setBuyerTab('matching-opportunities')}
            />
            <MetricCard
              label="Offers Received"
              value={offers.length}
              accent="amber"
              onClick={() => setBuyerTab('offers-received')}
            />
            <MetricCard
              label="Active Orders"
              value={orders.filter((o) => o.orderStatus !== 'Transaction Completed').length}
              onClick={() => setBuyerTab('my-orders')}
            />
            <MetricCard
              label="Completed Transactions"
              value={orders.filter((o) => o.orderStatus === 'Transaction Completed').length}
              accent="emerald"
              onClick={() => setBuyerTab('my-orders')}
            />
          </div>

          {dataLoading ? (
            <SkeletonTable rows={4} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                <div className="h-12 px-4 border-b border-[#F1F5F9] flex items-center justify-between">
                  <h2 className="font-display text-sm font-semibold text-[#0A172A]">Recent Requirements</h2>
                  <button
                    type="button"
                    onClick={() => setBuyerTab('my-requirements')}
                    className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                {requirements.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#64748B]">
                    No buyer requirements yet. Submit your first EPR requirement to start matching.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                          <th className="py-2.5 px-4">Req ID</th>
                          <th className="py-2.5 px-4">Category</th>
                          <th className="py-2.5 px-4 text-right">Qty</th>
                          <th className="py-2.5 px-4 text-right">Max Rate</th>
                          <th className="py-2.5 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] text-xs">
                        {requirements.slice(0, 6).map((r) => (
                          <tr
                            key={r.id}
                            onClick={() => setBuyerTab('requirement-details', r.id)}
                            className="hover:bg-[#F8FAFC] cursor-pointer"
                          >
                            <td className="py-3 px-4 font-mono font-semibold text-[#10233F]">{r.id}</td>
                            <td className="py-3 px-4 font-medium text-[#0A172A]">{r.categoryName}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums">
                              {r.requiredQty} {r.unit}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(r.maxBuyingRate)}</td>
                            <td className="py-3 px-4">
                              <StatusBadge status={r.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                  <h2 className="font-display text-sm font-semibold text-[#0A172A]">Latest Offers & Matches</h2>
                  <button
                    type="button"
                    onClick={() => setBuyerTab('offers-received')}
                    className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
                  >
                    Open Offers
                  </button>
                </div>
                {offers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#64748B]">No offers received.</div>
                ) : (
                  offers.slice(0, 5).map((o) => (
                    <div
                      key={o.id}
                      onClick={() => setBuyerTab('offer-details', o.id)}
                      className="p-3 bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg hover:border-[#10233F] cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-[#10233F]">{o.id}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="text-sm font-semibold text-[#0A172A]">
                        {o.categoryName} · {o.quantity} {o.unit}
                      </div>
                      <div className="text-xs text-[#475569] font-mono">
                        Offered Rate: {formatINR(o.offeredRate)}/{o.unit} · Valid till {o.expiryDate}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="lg:col-span-12 bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
                <div className="h-12 px-4 border-b border-[#F1F5F9] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#1E3A8A]" />
                    <h2 className="font-display text-sm font-semibold text-[#0A172A]">Notification History</h2>
                    {unreadNotifs > 0 && (
                      <span className="px-2 py-0.5 rounded bg-[#DBEAFE] text-[#1E3A8A] text-[11px] font-semibold">
                        {unreadNotifs} unread
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBuyerTab('notifications')}
                    className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
                  >
                    Open Notification Centre
                  </button>
                </div>
                {notifications.filter((n) => n.targetRole === 'buyer').length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#64748B]">
                    No category email or marketplace notifications yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F1F5F9]">
                    {notifications
                      .filter((n) => n.targetRole === 'buyer')
                      .slice(0, 5)
                      .map((n) => (
                        <div
                          key={n.id}
                          onClick={() => setBuyerTab('notifications')}
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

      {buyerTab === 'submit-requirement' && (
        <div className="max-w-3xl">
          {submittedReqId ? (
            <div className="bg-white border border-[#86EFAC] rounded-lg p-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-[#16A36A] mx-auto" />
              <h1 className="font-display text-2xl font-bold text-[#0A172A]">EPR Requirement Recorded</h1>
              <p className="text-sm text-[#475569]">
                Requirement Reference <span className="font-mono font-bold text-[#0A172A]">{submittedReqId}</span> has been submitted. Compatible active seller inventory is automatically matched and notified.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Button variant="primary" onClick={() => setBuyerTab('my-requirements')}>
                  View My Requirements
                </Button>
                <Button variant="secondary" onClick={() => setBuyerTab('matching-opportunities')}>
                  Check Matching Opportunities
                </Button>
              </div>
            </div>
          ) : activeCategories.length === 0 ? (
            <EmptyState
              title="No Active EPR Categories Published"
              description="EPR categories must be configured by the platform administrator before submitting requirements."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-6">
              <div className="border-b border-[#E2E8F0] pb-4">
                <h1 className="font-display text-xl font-bold text-[#0A172A]">Submit EPR Credit Requirement</h1>
                <p className="text-xs text-[#64748B] mt-1">
                  Specify your category, financial year, required quantity, and maximum buying rate.
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
                    value={selectedCatObj?.id || ''}
                    onChange={(e) => {
                      const next = activeCategories.find((c) => c.id === e.target.value);
                      if (!next) return;
                      setReqCatId(next.id);
                      const subs = subcategories.filter((s) => s.categoryId === next.id && s.active);
                      setReqSubcat(subs[0]?.name || 'Standard');
                      const fyList = next.financialYears?.length ? next.financialYears : ['FY 2025-26'];
                      setReqFy(fyList[0]);
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
                      value={reqSubcat}
                      onChange={(e) => setReqSubcat(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                    >
                      {catSubcats.map((sub) => (
                        <option key={sub.id} value={sub.name}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={reqSubcat}
                      onChange={(e) => setReqSubcat(e.target.value)}
                      placeholder="e.g. Category I Rigid Plastic"
                      className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Financial Year *</label>
                  <select
                    value={reqFy}
                    onChange={(e) => setReqFy(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                  >
                    {(selectedCatObj?.financialYears?.length
                      ? selectedCatObj.financialYears
                      : ['FY 2024-25', 'FY 2025-26', 'FY 2026-27']
                    ).map((fy) => (
                      <option key={fy}>{fy}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Required Quantity ({selectedCatObj?.unit || 'MT'}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={reqQty}
                      onChange={(e) => setReqQty(e.target.value)}
                      placeholder="Enter required quantity"
                      className="w-full h-10 pl-3 pr-12 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-mono text-[#94A3B8]">
                      {selectedCatObj?.unit || 'MT'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Maximum Buying Rate (INR / {selectedCatObj?.unit || 'MT'}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={reqRate}
                      onChange={(e) => setReqRate(e.target.value)}
                      placeholder={
                        selectedPublishedRate
                          ? `Reference: ${selectedPublishedRate.rate}`
                          : 'Enter target rate in INR'
                      }
                      className="w-full h-10 pl-3 pr-12 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-mono text-[#94A3B8]">INR</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Required By Date *</label>
                  <input
                    type="date"
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Supporting Document Upload (Optional · PDF/PNG/JPEG max 10 MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={(e) => setReqFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#334155] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-[#CBD5E1] file:bg-[#F8FAFC] file:text-xs file:font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Additional Requirements</label>
                <textarea
                  rows={3}
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="Optional certificate transfer instructions or batch preferences..."
                  className="w-full p-3 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <Button variant="ghost" onClick={() => setBuyerTab('overview')}>
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => void handleSubmitRequirement(true)}
                >
                  Save Draft
                </Button>
                <Button
                  variant="primary"
                  disabled={submitting}
                  onClick={() => {
                    const errMsg = validateRequirementForm();
                    if (errMsg) {
                      setFormError(errMsg);
                      return;
                    }
                    setFormError(null);
                    setReviewOpen(true);
                  }}
                >
                  Review & Submit Requirement
                </Button>
              </div>
            </div>
          )}

          <Modal
            open={reviewOpen}
            onClose={() => setReviewOpen(false)}
            title="Review EPR Requirement Summary"
            subtitle="Confirm details before submitting to the ETP Matching Engine"
          >
            {selectedCatObj && (
              <div className="space-y-4 text-sm">
                <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Category</span>
                    <span className="font-semibold text-[#0A172A]">{selectedCatObj.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Subcategory</span>
                    <span className="font-medium">{reqSubcat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Financial Year</span>
                    <span className="font-mono">{reqFy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Required Quantity</span>
                    <span className="font-mono font-semibold">
                      {reqQty} {selectedCatObj.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Max Buying Rate</span>
                    <span className="font-mono font-semibold">
                      {formatINR(Number(reqRate))}/{selectedCatObj.unit}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setReviewOpen(false)}>
                    Edit
                  </Button>
                  <Button
                    variant="emerald"
                    disabled={submitting}
                    onClick={() => void handleSubmitRequirement(false)}
                  >
                    {submitting ? 'Submitting...' : 'Confirm & Submit'}
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}

      {buyerTab === 'my-requirements' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-xl font-bold text-[#0A172A]">My Requirements</h1>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSubmittedReqId(null);
                setBuyerTab('submit-requirement');
              }}
            >
              + New Requirement
            </Button>
          </div>
          {dataLoading ? (
            <SkeletonTable />
          ) : requirements.length === 0 ? (
            <EmptyState
              title="No buyer requirements yet."
              description="Submit an EPR credit requirement to match against active verified seller listings."
              actionLabel="Submit Requirement"
              onAction={() => setBuyerTab('submit-requirement')}
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Requirement ID</th>
                      <th className="py-3 px-4">EPR Category</th>
                      <th className="py-3 px-4">FY</th>
                      <th className="py-3 px-4 text-right">Required</th>
                      <th className="py-3 px-4 text-right">Matched</th>
                      <th className="py-3 px-4 text-right">Remaining</th>
                      <th className="py-3 px-4 text-right">Max Rate</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {requirements.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-[#10233F]">{r.id}</td>
                        <td className="py-3 px-4 font-medium">{r.categoryName}</td>
                        <td className="py-3 px-4 font-mono text-xs">{r.financialYear}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {r.requiredQty} {r.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#16A36A]">{r.matchedQty}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{r.remainingQty}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(r.maxBuyingRate)}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#64748B]">{formatTime(r.createdAt)}</td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={() => setBuyerTab('requirement-details', r.id)}>
                            View
                          </Button>
                          {r.status !== 'Withdrawn' && r.status !== 'Order Confirmed' && r.status !== 'Rejected' && (
                            <Button variant="ghost" size="sm" onClick={() => setWithdrawConfirmId(r.id)}>
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
          <ConfirmModal
            open={withdrawConfirmId !== null}
            onClose={() => setWithdrawConfirmId(null)}
            onConfirm={() => {
              if (withdrawConfirmId) void withdrawRequirement(withdrawConfirmId);
            }}
            title="Withdraw Requirement"
            description={`Are you sure you want to withdraw ${withdrawConfirmId}? Unmatched quantities will be removed from active matching.`}
            confirmLabel="Withdraw Requirement"
            variant="danger"
          />
        </div>
      )}

      {buyerTab === 'requirement-details' && (
        activeReqDetail ? (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => setBuyerTab('my-requirements')}
              className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
            >
              ← Back to My Requirements
            </button>
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                <div>
                  <div className="font-mono text-xs text-[#64748B]">{activeReqDetail.id}</div>
                  <h1 className="font-display text-xl font-bold text-[#0A172A] mt-0.5">{activeReqDetail.categoryName}</h1>
                  <div className="text-xs text-[#475569] mt-0.5">
                    {activeReqDetail.subcategory} · {activeReqDetail.financialYear}
                  </div>
                </div>
                <StatusBadge status={activeReqDetail.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Original Quantity</div>
                  <div className="font-mono text-lg font-bold mt-1">
                    {activeReqDetail.requiredQty} {activeReqDetail.unit}
                  </div>
                </div>
                <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Matched Quantity</div>
                  <div className="font-mono text-lg font-bold text-[#16A36A] mt-1">
                    {activeReqDetail.matchedQty} {activeReqDetail.unit}
                  </div>
                </div>
                <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Remaining Quantity</div>
                  <div className="font-mono text-lg font-bold mt-1">
                    {activeReqDetail.remainingQty} {activeReqDetail.unit}
                  </div>
                </div>
                <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Target Max Rate</div>
                  <div className="font-mono text-lg font-bold mt-1">
                    {formatINR(activeReqDetail.maxBuyingRate)}/{activeReqDetail.unit}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-display text-sm font-semibold text-[#0A172A]">Attached Documents</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {documents.filter((d) => d.relatedId === activeReqDetail.id).length === 0 ? (
                    <span className="text-xs text-[#64748B]">No documents linked to this requirement.</span>
                  ) : (
                    documents
                      .filter((d) => d.relatedId === activeReqDetail.id)
                      .map((d) => (
                        <a
                          key={d.id}
                          href={d.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded hover:border-[#10233F]"
                        >
                          {d.fileName}
                        </a>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="No requirement selected" description="Select a requirement from My Requirements." />
        )
      )}

      {buyerTab === 'matching-opportunities' && (
        <div className="space-y-4">
          <div>
            <h1 className="font-display text-xl font-bold text-[#0A172A]">Matching Opportunities</h1>
            <div className="mt-2 p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs text-[#1E3A8A]">
              A matching opportunity has been identified. EPR Bazaar will coordinate the negotiation and share suitable offers with you.
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 flex flex-wrap gap-3">
            <select
              value={matchCatFilter}
              onChange={(e) => setMatchCatFilter(e.target.value)}
              className="h-9 px-3 text-xs border border-[#CBD5E1] rounded-lg bg-white"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={matchFyFilter}
              onChange={(e) => setMatchFyFilter(e.target.value)}
              className="h-9 px-3 text-xs border border-[#CBD5E1] rounded-lg bg-white"
            >
              <option value="ALL">All Financial Years</option>
              <option value="FY 2024-25">FY 2024-25</option>
              <option value="FY 2025-26">FY 2025-26</option>
              <option value="FY 2026-27">FY 2026-27</option>
            </select>
          </div>

          {filteredMatches.length === 0 ? (
            <EmptyState
              title="No matching opportunities found."
              description="Submit an EPR requirement and ETP Matching Engine will notify you as soon as compatible seller credits match."
              actionLabel="Submit Requirement"
              onAction={() => setBuyerTab('submit-requirement')}
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
                      <th className="py-3 px-4 text-right">Matching Qty</th>
                      <th className="py-3 px-4 text-right">Indicative Rate</th>
                      <th className="py-3 px-4">Match Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {filteredMatches.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-[#10233F]">{m.id}</td>
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
                        <td className="py-3 px-4 font-mono text-xs text-[#64748B]">{formatTime(m.createdAt)}</td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="secondary" size="sm" onClick={() => setBuyerTab('offers-received')}>
                            View Offers
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

      {buyerTab === 'offers-received' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Offers Received from EPR Bazaar</h1>
          {offers.length === 0 ? (
            <EmptyState
              title="No offers received."
              description="When an EPR Bazaar facilitator shares an offer for your matched requirement, it will appear here."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Offer ID</th>
                      <th className="py-3 px-4">Match ID</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Quantity</th>
                      <th className="py-3 px-4 text-right">Offered Rate</th>
                      <th className="py-3 px-4">Offer Expiry</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {offers.map((o) => (
                      <tr key={o.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-[#10233F]">{o.id}</td>
                        <td className="py-3 px-4 font-mono text-xs">{o.matchId}</td>
                        <td className="py-3 px-4 font-medium">{o.categoryName}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {o.quantity} {o.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                          {formatINR(o.offeredRate)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#64748B]">{o.expiryDate}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setShowCounterForm(false);
                              setBuyerTab('offer-details', o.id);
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

      {buyerTab === 'offer-details' && (
        activeOfferDetail ? (
          <div className="space-y-5 max-w-3xl">
            <button
              type="button"
              onClick={() => setBuyerTab('offers-received')}
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
                  <div className="text-xs text-[#64748B]">
                    Facilitated via EPR Bazaar · Seller identity confidential
                  </div>
                </div>
                <StatusBadge status={activeOfferDetail.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Offered Quantity</div>
                  <div className="font-mono font-bold mt-1">
                    {activeOfferDetail.quantity} {activeOfferDetail.unit}
                  </div>
                </div>
                <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">Offered Rate</div>
                  <div className="font-mono font-bold mt-1">{formatINR(activeOfferDetail.offeredRate)}</div>
                </div>
                <div className="p-3 bg-[#F4F7FB] rounded-lg border border-[#E2E8F0]">
                  <div className="text-xs text-[#64748B]">GST ({activeOfferDetail.gstPercent}%)</div>
                  <div className="font-mono font-bold mt-1">
                    {formatINR(
                      Math.round(
                        activeOfferDetail.quantity *
                          activeOfferDetail.offeredRate *
                          (activeOfferDetail.gstPercent / 100)
                      )
                    )}
                  </div>
                </div>
                <div className="p-3 bg-[#DCFCE7] rounded-lg border border-[#86EFAC]">
                  <div className="text-xs text-[#15803D]">Total Indicative Amount</div>
                  <div className="font-mono font-bold text-[#15803D] mt-1">
                    {formatINR(
                      Math.round(
                        activeOfferDetail.quantity *
                          activeOfferDetail.offeredRate *
                          (1 + activeOfferDetail.gstPercent / 100)
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <div className="text-xs font-semibold text-[#64748B]">Facilitator Message</div>
                <p className="text-sm text-[#0A172A] mt-1">{activeOfferDetail.facilitatorMessage}</p>
                <div className="text-xs font-mono text-[#64748B] mt-2">
                  Valid until {activeOfferDetail.expiryDate}
                </div>
              </div>

              {activeOfferDetail.status === 'Pending Response' && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button variant="emerald" onClick={() => setOfferActionModal('accept')}>
                    Accept Offer
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
                    Reject Offer
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
                  <h3 className="font-display text-sm font-semibold text-[#0A172A]">
                    Submit Counteroffer to Facilitator
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#334155] mb-1">
                        Revised Target Rate (INR)
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
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">
                      Message for EPR Bazaar Facilitator
                    </label>
                    <textarea
                      rows={2}
                      value={counterMsg}
                      onChange={(e) => setCounterMsg(e.target.value)}
                      className="w-full p-2.5 text-sm bg-white border border-[#CBD5E1] rounded-lg"
                      placeholder="Provide justification or payment terms..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowCounterForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm">
                      Send Counteroffer
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
              title={offerActionModal === 'accept' ? 'Confirm Offer Acceptance' : 'Confirm Offer Rejection'}
              description={
                offerActionModal === 'accept'
                  ? `Confirm acceptance of ${activeOfferDetail.quantity} ${activeOfferDetail.unit} at ${formatINR(activeOfferDetail.offeredRate)}/${activeOfferDetail.unit}. Your EPR Bazaar facilitator will proceed with final order confirmation.`
                  : `Are you sure you want to reject offer ${activeOfferDetail.id}?`
              }
              confirmLabel={offerActionModal === 'accept' ? 'Yes, Accept Offer' : 'Reject Offer'}
              variant={offerActionModal === 'accept' ? 'emerald' : 'danger'}
            />
          </div>
        ) : (
          <EmptyState title="No offers received." description="Select an offer to inspect its details." />
        )
      )}

      {buyerTab === 'negotiation-history' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Negotiation History</h1>
          {matches.length === 0 ? (
            <EmptyState
              title="No negotiations yet."
              description="Negotiation history for your matched requirements will appear here."
            />
          ) : (
            matches.map((m) => {
              const entries = negotiations.filter((e) => e.matchId === m.id && e.visibleToBuyer);
              return (
                <div key={m.id} className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                    <div>
                      <span className="font-mono text-xs font-semibold text-[#10233F]">{m.id}</span>
                      <span className="mx-2 text-[#CBD5E1]">·</span>
                      <span className="font-semibold text-sm text-[#0A172A]">
                        {m.categoryName} ({m.matchingQty} {m.unit})
                      </span>
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
                            <span className="font-semibold text-[#0A172A]">
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

      {buyerTab === 'my-orders' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">My Orders</h1>
          {orders.length === 0 ? (
            <EmptyState
              title="No orders available."
              description="Confirmed EPR credit deals coordinated by your facilitator will appear here."
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
                      <th className="py-3 px-4 text-right">Total (incl. GST)</th>
                      <th className="py-3 px-4">Payment</th>
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
                          {formatINR(o.totalAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={o.paymentStatus} />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={o.orderStatus} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setBuyerTab('order-details', o.id)}>
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

      {buyerTab === 'order-details' && (
        activeOrderDetail ? (
          <div className="space-y-4 max-w-3xl">
            <button
              type="button"
              onClick={() => setBuyerTab('my-orders')}
              className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
            >
              ← Back to My Orders
            </button>
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5">
              <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
                <div>
                  <div className="font-mono text-xs text-[#64748B]">
                    {activeOrderDetail.id} · Invoice {activeOrderDetail.invoiceNumber}
                  </div>
                  <h1 className="font-display text-xl font-bold text-[#0A172A] mt-0.5">
                    {activeOrderDetail.categoryName}
                  </h1>
                  <div className="text-xs text-[#64748B]">
                    {activeOrderDetail.financialYear} · Coordinated by EPR Bazaar
                  </div>
                </div>
                <StatusBadge status={activeOrderDetail.orderStatus} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-xs text-[#64748B]">Quantity</div>
                  <div className="font-mono font-bold mt-1">
                    {activeOrderDetail.quantity} {activeOrderDetail.unit}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B]">Agreed Rate</div>
                  <div className="font-mono font-bold mt-1">{formatINR(activeOrderDetail.agreedRate)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B]">Basic + GST</div>
                  <div className="font-mono font-bold mt-1">{formatINR(activeOrderDetail.totalAmount)}</div>
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
          <EmptyState title="No orders available." description="Select an order from My Orders to view details." />
        )
      )}

      {buyerTab === 'company-profile' && (
        <CompanyProfileView account={currentBuyer} accountType="buyer" mode="profile" />
      )}
      {buyerTab === 'verification' && (
        <CompanyProfileView account={currentBuyer} accountType="buyer" mode="verification" />
      )}
      {buyerTab === 'settings' && (
        <CompanyProfileView account={currentBuyer} accountType="buyer" mode="settings" />
      )}
      {buyerTab === 'payments' && <PaymentsView />}
      {buyerTab === 'documents' && <DocumentsView ownerFilterRole="buyer" />}
      {buyerTab === 'notifications' && (
        <NotificationsView
          onViewListing={(n) => {
            if (n.listingId?.startsWith('REQ-')) {
              setBuyerTab('requirement-details', n.listingId);
            } else {
              setBuyerTab('matching-opportunities');
            }
          }}
        />
      )}
    </PortalShell>
  );
};
