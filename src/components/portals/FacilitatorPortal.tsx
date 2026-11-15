import React, { useState } from 'react';
import {
  Activity,
  Bell,
  Building2,
  ClipboardList,
  CreditCard,
  FileCheck2,
  Handshake,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  PackageCheck,
  PhoneCall,
  UserCheck,
  Users,
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { PortalShell, SidebarNavItem } from './PortalShell';
import { Button, EmptyState, formatINR, MetricCard, Modal, SkeletonTable, StatusBadge } from '../ui/DesignSystem';
import { NotificationsView, PaymentsView } from './SharedPortalViews';
import { BuyerAccount, FacilitatorTab, OrderStatus, SellerAccount, formatTime } from '../../types';

export const FacilitatorPortal: React.FC = () => {
  const {
    facilitatorTab,
    setFacilitatorTab,
    currentFacilitator,
    buyers,
    sellers,
    requirements,
    listings,
    matches,
    offers,
    negotiations,
    orders,
    notifications,
    dataLoading,
    selectedMatchId,
    facilitatorSendOffer,
    facilitatorAddNote,
    facilitatorConfirmAgreement,
    updateOrderStatus,
    addToast,
  } = useMarketplace();

  const unreadNotifs = notifications.filter((n) => n.targetRole === 'facilitator' && !n.read).length;

  const [detailBuyer, setDetailBuyer] = useState<BuyerAccount | null>(null);
  const [detailSeller, setDetailSeller] = useState<SellerAccount | null>(null);

  const activeMatch = matches.find((m) => m.id === selectedMatchId) || matches[0];
  const matchBuyer = buyers.find((b) => b.uid === activeMatch?.buyerUid);
  const matchSeller = sellers.find((s) => s.uid === activeMatch?.sellerUid);
  const matchNegotiations = activeMatch
    ? negotiations.filter((n) => n.matchId === activeMatch.id)
    : [];

  const defaultExpiry = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [offerModalTarget, setOfferModalTarget] = useState<'buyer' | 'seller' | null>(null);
  const [offerRate, setOfferRate] = useState('');
  const [offerQty, setOfferQty] = useState('');
  const [offerExpiry, setOfferExpiry] = useState(defaultExpiry);
  const [offerMsg, setOfferMsg] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [confirmDealOpen, setConfirmDealOpen] = useState(false);
  const [finalRateInput, setFinalRateInput] = useState('');
  const [busyAction, setBusyAction] = useState(false);

  const getBuyerName = (uid: string) => buyers.find((b) => b.uid === uid)?.companyName || uid;
  const getSellerName = (uid: string) => sellers.find((s) => s.uid === uid)?.companyName || uid;

  const navItems: SidebarNavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'buyers', label: 'Buyers', icon: Users },
    { id: 'sellers', label: 'Sellers', icon: Building2 },
    { id: 'buyer-requirements', label: 'Buyer Requirements', icon: ClipboardList },
    { id: 'seller-listings', label: 'Seller Listings', icon: ListChecks },
    { id: 'matching-opportunities', label: 'Matching Opportunities', icon: Handshake, badge: matches.length },
    { id: 'negotiations', label: 'Negotiations', icon: MessageSquare },
    { id: 'offers', label: 'Offers', icon: FileCheck2 },
    { id: 'orders', label: 'Orders', icon: PackageCheck },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'transaction-tracking', label: 'Transaction Tracking', icon: Activity },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
    { id: 'profile', label: 'My Profile', icon: UserCheck },
  ];

  return (
    <PortalShell
      portalTitle="Facilitator Operations"
      userTitle={currentFacilitator?.name || 'EPR Bazaar Facilitator'}
      userSubtitle={
        currentFacilitator
          ? `${currentFacilitator.employeeId} · ${currentFacilitator.email}`
          : 'Facilitator Desk'
      }
      navItems={navItems}
      activeTab={facilitatorTab}
      onSelectTab={(t) => setFacilitatorTab(t as FacilitatorTab)}
      onOpenNotifications={() => setFacilitatorTab('notifications')}
    >
      {facilitatorTab === 'overview' && (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#0A172A]">Facilitator Operations Desk</h1>
            <p className="text-xs text-[#64748B]">
              Coordinate confidential bilateral negotiations between matched buyers and sellers.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              label="Active Buyer Requirements"
              value={requirements.filter((r) => r.status === 'Active' || r.status === 'Partially Matched').length}
              onClick={() => setFacilitatorTab('buyer-requirements')}
            />
            <MetricCard
              label="Active Seller Listings"
              value={listings.filter((l) => l.status === 'Active' || l.status === 'Partially Allocated').length}
              onClick={() => setFacilitatorTab('seller-listings')}
            />
            <MetricCard
              label="Pending Matches"
              value={matches.filter((m) => m.status === 'New Match').length}
              accent="amber"
              onClick={() => setFacilitatorTab('matching-opportunities')}
            />
            <MetricCard
              label="Active Negotiations"
              value={matches.filter((m) => m.status === 'Negotiation In Progress' || m.status === 'Offer Shared').length}
              accent="emerald"
              onClick={() => setFacilitatorTab('negotiations')}
            />
            <MetricCard
              label="Pending Buyer Responses"
              value={offers.filter((o) => o.targetParty === 'buyer' && o.status === 'Pending Response').length}
              onClick={() => setFacilitatorTab('offers')}
            />
            <MetricCard
              label="Pending Seller Responses"
              value={offers.filter((o) => o.targetParty === 'seller' && o.status === 'Pending Response').length}
              onClick={() => setFacilitatorTab('offers')}
            />
            <MetricCard
              label="Confirmed Deals"
              value={orders.length}
              accent="emerald"
              onClick={() => setFacilitatorTab('orders')}
            />
            <MetricCard
              label="Orders in Progress"
              value={orders.filter((o) => o.orderStatus !== 'Transaction Completed').length}
              onClick={() => setFacilitatorTab('transaction-tracking')}
            />
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
            <div className="h-12 px-4 border-b border-[#F1F5F9] flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-[#0A172A]">Priority Negotiation Queue</h2>
              <Button variant="secondary" size="sm" onClick={() => setFacilitatorTab('matching-opportunities')}>
                Open All Matches
              </Button>
            </div>
            {dataLoading ? (
              <SkeletonTable rows={4} />
            ) : matches.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B]">
                No matching opportunities found. Matches appear automatically when buyer requirements and active seller listings align.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Match ID</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                      <th className="py-3 px-4 text-right">Buyer Target</th>
                      <th className="py-3 px-4 text-right">Seller Asking</th>
                      <th className="py-3 px-4 text-right">Spread</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {matches.map((m) => {
                      const diff = m.buyerTargetRate - m.sellerAskingRate;
                      return (
                        <tr key={m.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-[#10233F]">{m.id}</td>
                          <td className="py-3 px-4 font-medium">{m.categoryName}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            {m.matchingQty} {m.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(m.buyerTargetRate)}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(m.sellerAskingRate)}</td>
                          <td
                            className={`py-3 px-4 text-right font-mono font-semibold tabular-nums ${
                              diff >= 0 ? 'text-[#16A36A]' : 'text-[#D97706]'
                            }`}
                          >
                            {diff >= 0 ? `+${formatINR(diff)}` : formatINR(diff)}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={m.status} />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="primary" size="sm" onClick={() => setFacilitatorTab('match-details', m.id)}>
                              Manage Match
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {facilitatorTab === 'matching-opportunities' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Matching Management</h1>
          {matches.length === 0 ? (
            <EmptyState
              title="No matching opportunities found."
              description="Matches created from live buyer requirements and active seller listings will appear here."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Match ID</th>
                      <th className="py-3 px-4">Buyer Req</th>
                      <th className="py-3 px-4">Seller Listing</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                      <th className="py-3 px-4 text-right">Buyer Rate</th>
                      <th className="py-3 px-4 text-right">Seller Rate</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {matches.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono font-semibold">{m.id}</td>
                        <td className="py-3 px-4 font-mono text-[#1E3A8A]">{m.requirementId}</td>
                        <td className="py-3 px-4 font-mono text-[#15803D]">{m.listingId}</td>
                        <td className="py-3 px-4 font-medium text-[#0A172A]">{m.categoryName}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {m.matchingQty} {m.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(m.buyerTargetRate)}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(m.sellerAskingRate)}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="primary" size="sm" onClick={() => setFacilitatorTab('match-details', m.id)}>
                            Open Workspace
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

      {(facilitatorTab === 'match-details' || facilitatorTab === 'negotiations') && (
        activeMatch ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <button
                  type="button"
                  onClick={() => setFacilitatorTab('matching-opportunities')}
                  className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
                >
                  ← Back to All Matches
                </button>
                <div className="flex items-center gap-3 mt-1">
                  <h1 className="font-display text-xl font-bold text-[#0A172A]">
                    Negotiation Workspace · {activeMatch.id}
                  </h1>
                  <StatusBadge status={activeMatch.status} />
                </div>
                <p className="text-xs text-[#64748B]">
                  {activeMatch.categoryName} · {activeMatch.subcategory} · {activeMatch.financialYear} ·{' '}
                  {activeMatch.matchingQty} {activeMatch.unit}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {matches.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFacilitatorTab('match-details', m.id)}
                    className={`px-2.5 py-1 text-xs font-mono rounded border cursor-pointer ${
                      m.id === activeMatch.id
                        ? 'bg-[#10233F] text-white border-[#10233F]'
                        : 'bg-white text-[#475569] border-[#CBD5E1]'
                    }`}
                  >
                    {m.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#1E3A8A]">
                      Private Buyer Panel
                    </div>
                    <div className="font-display text-base font-bold text-[#0A172A]">
                      {matchBuyer?.companyName || activeMatch.buyerUid}
                    </div>
                  </div>
                  <StatusBadge status={activeMatch.buyerAgreed ? 'Agreed' : 'Pending'} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#64748B]">Contact Person:</span>
                    <div className="font-semibold text-[#0A172A]">{matchBuyer?.contactPerson || '—'}</div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Mobile / Email:</span>
                    <div className="font-mono text-[#0A172A]">{matchBuyer?.mobile || '—'}</div>
                    <div className="font-mono text-[#475569] truncate">{matchBuyer?.email || '—'}</div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Target Quantity:</span>
                    <div className="font-mono font-bold text-[#0A172A]">
                      {activeMatch.matchingQty} {activeMatch.unit}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Max Buying Rate:</span>
                    <div className="font-mono font-bold text-[#0A172A]">
                      {formatINR(activeMatch.buyerTargetRate)}/{activeMatch.unit}
                    </div>
                  </div>
                </div>
                <div className="pt-2 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      addToast({
                        type: 'info',
                        title: `Buyer contact: ${matchBuyer?.mobile || matchBuyer?.email || 'Unavailable'}`,
                      })
                    }
                  >
                    <PhoneCall className="w-3.5 h-3.5" /> Contact Buyer
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setOfferRate(String(activeMatch.indicativeRate));
                      setOfferQty(String(activeMatch.matchingQty));
                      setOfferExpiry(defaultExpiry);
                      setOfferMsg('Facilitated rate offer for your EPR requirement.');
                      setOfferModalTarget('buyer');
                    }}
                  >
                    Submit Buyer Offer
                  </Button>
                </div>
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#15803D]">
                      Private Seller Panel
                    </div>
                    <div className="font-display text-base font-bold text-[#0A172A]">
                      {matchSeller?.companyName || activeMatch.sellerUid}
                    </div>
                  </div>
                  <StatusBadge status={activeMatch.sellerAgreed ? 'Agreed' : 'Pending'} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#64748B]">Contact Person:</span>
                    <div className="font-semibold text-[#0A172A]">{matchSeller?.contactPerson || '—'}</div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Mobile / Email:</span>
                    <div className="font-mono text-[#0A172A]">{matchSeller?.mobile || '—'}</div>
                    <div className="font-mono text-[#475569] truncate">{matchSeller?.email || '—'}</div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Available Quantity:</span>
                    <div className="font-mono font-bold text-[#0A172A]">
                      {activeMatch.matchingQty} {activeMatch.unit}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Expected Selling Rate:</span>
                    <div className="font-mono font-bold text-[#0A172A]">
                      {formatINR(activeMatch.sellerAskingRate)}/{activeMatch.unit}
                    </div>
                  </div>
                </div>
                <div className="pt-2 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      addToast({
                        type: 'info',
                        title: `Seller contact: ${matchSeller?.mobile || matchSeller?.email || 'Unavailable'}`,
                      })
                    }
                  >
                    <PhoneCall className="w-3.5 h-3.5" /> Contact Seller
                  </Button>
                  <Button
                    variant="emerald"
                    size="sm"
                    onClick={() => {
                      setOfferRate(String(activeMatch.indicativeRate));
                      setOfferQty(String(activeMatch.matchingQty));
                      setOfferExpiry(defaultExpiry);
                      setOfferMsg('Facilitated offer from verified buyer enquiry.');
                      setOfferModalTarget('seller');
                    }}
                  >
                    Submit Seller Offer
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#0A172A]">
                    Negotiation Panel & Chronological Log
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Facilitator manages bilateral counteroffers; neither party sees counterparty details.
                  </p>
                </div>
                {activeMatch.status !== 'Order Created' && (
                  <Button
                    variant="emerald"
                    size="sm"
                    onClick={() => {
                      setFinalRateInput(String(activeMatch.indicativeRate));
                      setConfirmDealOpen(true);
                    }}
                  >
                    Confirm Both Parties&apos; Agreement
                  </Button>
                )}
              </div>

              {matchNegotiations.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#64748B]">
                  No negotiation entries logged for this match yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {matchNegotiations.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg flex flex-wrap items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#0A172A]">{entry.actor}</span>
                          <StatusBadge status={entry.actionType} />
                          {entry.rate !== undefined && (
                            <span className="font-mono font-bold text-[#10233F]">
                              {formatINR(entry.rate)}/{activeMatch.unit}
                            </span>
                          )}
                        </div>
                        <p className="text-[#334155]">{entry.message}</p>
                      </div>
                      <span className="font-mono text-[#64748B]">{formatTime(entry.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}

              <form
                className="flex flex-wrap gap-2 pt-2 border-t border-[#F1F5F9]"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!noteInput.trim()) return;
                  setBusyAction(true);
                  try {
                    await facilitatorAddNote(activeMatch, noteInput.trim());
                    setNoteInput('');
                  } finally {
                    setBusyAction(false);
                  }
                }}
              >
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Add internal facilitator negotiation note..."
                  className="flex-1 min-w-[240px] h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                />
                <Button type="submit" variant="secondary" disabled={busyAction}>
                  Add Negotiation Note
                </Button>
              </form>
            </div>

            <Modal
              open={offerModalTarget !== null}
              onClose={() => setOfferModalTarget(null)}
              title={`Submit Facilitated Offer to ${offerModalTarget === 'buyer' ? 'Buyer' : 'Seller'}`}
              maxWidth="max-w-md"
            >
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!offerModalTarget) return;
                  setBusyAction(true);
                  try {
                    await facilitatorSendOffer(
                      activeMatch,
                      offerModalTarget,
                      Number(offerRate),
                      Number(offerQty),
                      offerExpiry,
                      offerMsg
                    );
                    setOfferModalTarget(null);
                  } finally {
                    setBusyAction(false);
                  }
                }}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Proposed Rate (INR)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={offerRate}
                      onChange={(e) => setOfferRate(e.target.value)}
                      className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">
                      Quantity ({activeMatch.unit})
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={offerQty}
                      onChange={(e) => setOfferQty(e.target.value)}
                      className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Offer Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={offerExpiry}
                    onChange={(e) => setOfferExpiry(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Message to Party</label>
                  <textarea
                    rows={3}
                    required
                    value={offerMsg}
                    onChange={(e) => setOfferMsg(e.target.value)}
                    className="w-full p-2.5 text-sm border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setOfferModalTarget(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={busyAction}>
                    {busyAction ? 'Dispatching...' : 'Dispatch Offer'}
                  </Button>
                </div>
              </form>
            </Modal>

            <Modal
              open={confirmDealOpen}
              onClose={() => setConfirmDealOpen(false)}
              title="Confirm Both Parties' Agreement & Generate Order"
              maxWidth="max-w-md"
            >
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusyAction(true);
                  try {
                    await facilitatorConfirmAgreement(activeMatch, Number(finalRateInput));
                    setConfirmDealOpen(false);
                  } finally {
                    setBusyAction(false);
                  }
                }}
              >
                <p className="text-xs text-[#475569]">
                  Confirming agreement creates an official Order and GST Invoice record on the platform.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Final Agreed Rate (INR / {activeMatch.unit})
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={finalRateInput}
                    onChange={(e) => setFinalRateInput(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setConfirmDealOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="emerald" disabled={busyAction}>
                    {busyAction ? 'Creating Order...' : 'Create Confirmed Order'}
                  </Button>
                </div>
              </form>
            </Modal>
          </div>
        ) : (
          <EmptyState
            title="No matching opportunities found."
            description="Select a match or wait for new matches between buyer requirements and seller listings."
          />
        )
      )}

      {facilitatorTab === 'buyers' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Buyer Directory</h1>
          {buyers.length === 0 ? (
            <EmptyState title="No buyers registered yet." description="Registered buyer accounts will appear here." />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {buyers.map((b) => (
                      <tr key={b.uid} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-medium">{b.companyName}</td>
                        <td className="py-3 px-4 text-xs text-[#475569]">
                          {b.contactPerson} · {b.mobile}
                        </td>
                        <td className="py-3 px-4 text-xs">{b.city || '—'}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={b.verification} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setDetailBuyer(b)}>
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
          <Modal
            open={detailBuyer !== null}
            onClose={() => setDetailBuyer(null)}
            title={detailBuyer?.companyName || 'Buyer Details'}
          >
            {detailBuyer && (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-[#64748B]">Mobile:</span> <span className="font-mono">{detailBuyer.mobile}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Email:</span> <span className="font-mono">{detailBuyer.email}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">GSTIN:</span> <span className="font-mono">{detailBuyer.gstin}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">EPR Reg:</span>{' '}
                  <span className="font-mono">{detailBuyer.eprRegNo}</span>
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}

      {facilitatorTab === 'sellers' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Seller Directory</h1>
          {sellers.length === 0 ? (
            <EmptyState title="No sellers registered yet." description="Registered seller accounts will appear here." />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Company</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {sellers.map((s) => (
                      <tr key={s.uid} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-medium">{s.companyName}</td>
                        <td className="py-3 px-4 text-xs text-[#475569]">{s.recyclerType}</td>
                        <td className="py-3 px-4 text-xs">
                          {s.contactPerson} · {s.mobile}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={s.verification} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setDetailSeller(s)}>
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
          <Modal
            open={detailSeller !== null}
            onClose={() => setDetailSeller(null)}
            title={detailSeller?.companyName || 'Seller Details'}
          >
            {detailSeller && (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-[#64748B]">Mobile:</span> <span className="font-mono">{detailSeller.mobile}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Email:</span> <span className="font-mono">{detailSeller.email}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">GSTIN:</span> <span className="font-mono">{detailSeller.gstin}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">EPR Reg:</span>{' '}
                  <span className="font-mono">{detailSeller.eprRegNo}</span>
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}

      {facilitatorTab === 'buyer-requirements' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">All Buyer Requirements</h1>
          {requirements.length === 0 ? (
            <EmptyState
              title="No buyer requirements yet."
              description="Submitted buyer EPR requirements will appear here."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Req ID</th>
                      <th className="py-3 px-4">Buyer</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                      <th className="py-3 px-4 text-right">Max Rate</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {requirements.map((r) => (
                      <tr key={r.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono text-xs font-semibold">{r.id}</td>
                        <td className="py-3 px-4">{getBuyerName(r.buyerUid)}</td>
                        <td className="py-3 px-4">{r.categoryName}</td>
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
            </div>
          )}
        </div>
      )}

      {facilitatorTab === 'seller-listings' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">All Seller Listings</h1>
          {listings.length === 0 ? (
            <EmptyState
              title="No seller listings available."
              description="Seller EPR credit listings will appear here."
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
                      <th className="py-3 px-4 text-right">Remaining</th>
                      <th className="py-3 px-4 text-right">Asking Rate</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {listings.map((l) => (
                      <tr key={l.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono text-xs font-semibold">{l.id}</td>
                        <td className="py-3 px-4">{getSellerName(l.sellerUid)}</td>
                        <td className="py-3 px-4">{l.categoryName}</td>
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
            </div>
          )}
        </div>
      )}

      {facilitatorTab === 'offers' && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Facilitated Offer Management</h1>
          {offers.length === 0 ? (
            <EmptyState title="No offers issued yet." description="Offers sent from match workspaces will appear here." />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Offer ID</th>
                      <th className="py-3 px-4">Match</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4 text-right">Qty</th>
                      <th className="py-3 px-4 text-right">Offered Rate</th>
                      <th className="py-3 px-4">Expiry</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-sm">
                    {offers.map((o) => (
                      <tr key={o.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono text-xs font-semibold">{o.id}</td>
                        <td className="py-3 px-4 font-mono text-xs">{o.matchId}</td>
                        <td className="py-3 px-4 uppercase text-xs font-semibold">
                          {o.targetParty} (
                          {o.targetParty === 'buyer' ? getBuyerName(o.partyUid) : getSellerName(o.partyUid)})
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {o.quantity} {o.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(o.offeredRate)}</td>
                        <td className="py-3 px-4 font-mono text-xs">{o.expiryDate}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={o.status} />
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

      {(facilitatorTab === 'orders' || facilitatorTab === 'transaction-tracking') && (
        <div className="space-y-4">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Order Coordination & Transaction Tracking</h1>
          {orders.length === 0 ? (
            <EmptyState
              title="No orders available."
              description="Confirmed deals promoted from negotiations will appear here."
            />
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Buyer</th>
                      <th className="py-3 px-4">Seller</th>
                      <th className="py-3 px-4 text-right">Total Value</th>
                      <th className="py-3 px-4">Order Status</th>
                      <th className="py-3 px-4 text-right">Update Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-xs">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono font-semibold">{o.id}</td>
                        <td className="py-3 px-4">{getBuyerName(o.buyerUid)}</td>
                        <td className="py-3 px-4">{getSellerName(o.sellerUid)}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                          {formatINR(o.totalAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={o.orderStatus} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <select
                            value={o.orderStatus}
                            onChange={(e) => void updateOrderStatus(o, e.target.value as OrderStatus)}
                            className="h-8 px-2 text-xs border border-[#CBD5E1] rounded bg-white"
                          >
                            <option>Deal Confirmed</option>
                            <option>Payment Pending</option>
                            <option>Advance Received</option>
                            <option>Payment Completed</option>
                            <option>EPR Credit Transfer Pending</option>
                            <option>Transfer Verification Pending</option>
                            <option>Transaction Completed</option>
                          </select>
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

      {facilitatorTab === 'payments' && <PaymentsView />}
      {facilitatorTab === 'notifications' && <NotificationsView />}
      {facilitatorTab === 'profile' && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 max-w-xl space-y-3">
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Facilitator Profile</h1>
          <div className="text-sm">
            <span className="text-[#64748B]">Name:</span>{' '}
            <span className="font-semibold">{currentFacilitator?.name || '—'}</span>
          </div>
          <div className="text-sm">
            <span className="text-[#64748B]">Employee ID:</span>{' '}
            <span className="font-mono">{currentFacilitator?.employeeId || '—'}</span>
          </div>
          <div className="text-sm">
            <span className="text-[#64748B]">Email:</span>{' '}
            <span className="font-mono">{currentFacilitator?.email || '—'}</span>
          </div>
          <div className="text-sm">
            <span className="text-[#64748B]">Desk:</span> {currentFacilitator?.department || 'Trading Desk'}
          </div>
        </div>
      )}
    </PortalShell>
  );
};
