import React, { useEffect, useState } from 'react';
import { Check, Download, ExternalLink, Eye, FileText, Mail, ShieldCheck, Upload } from 'lucide-react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useMarketplace } from '../../context/MarketplaceContext';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Button, EmptyState, formatINR, Modal, StatusBadge } from '../ui/DesignSystem';
import { BuyerAccount, DocumentRecord, NotificationItem, SellerAccount, formatTime } from '../../types';

export const NotificationsView: React.FC<{
  onViewListing?: (notif: NotificationItem) => void;
}> = ({ onViewListing }) => {
  const { role, notifications, markNotificationRead, markAllNotificationsRead } = useMarketplace();
  const [filterCat, setFilterCat] = useState('ALL');

  const roleNotifs = notifications
    .filter(
      (n) => (n.targetRole === role || role === 'admin') && (filterCat === 'ALL' || n.category === filterCat)
    )
    .sort((a, b) => {
      const toMs = (t: NotificationItem['createdAt']) => {
        if (!t) return 0;
        if (typeof t === 'string') return Date.parse(t) || 0;
        if (typeof (t as { toDate?: () => Date }).toDate === 'function') {
          return (t as { toDate: () => Date }).toDate().getTime();
        }
        return 0;
      };
      return toMs(b.createdAt) - toMs(a.createdAt);
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Notification Centre &amp; History</h1>
          <p className="text-xs text-[#64748B]">
            Real-time category alerts, email delivery tracking, and updates across requirements, listings, matches, offers, and orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="h-9 px-3 text-xs border border-[#CBD5E1] rounded-lg bg-white"
          >
            <option value="ALL">All Categories</option>
            <option value="Requirement Updates">Requirement Updates</option>
            <option value="Listing Updates">Listing Updates</option>
            <option value="Matching Notifications">Matching Notifications</option>
            <option value="Offers">Offers</option>
            <option value="Negotiations">Negotiations</option>
            <option value="Orders">Orders</option>
            <option value="Payments">Payments</option>
            <option value="Documents">Documents</option>
            <option value="Account Updates">Account Updates</option>
          </select>
          <Button variant="secondary" size="sm" onClick={() => void markAllNotificationsRead()}>
            Mark All Read
          </Button>
        </div>
      </div>

      {roleNotifs.length === 0 ? (
        <EmptyState title="No Notifications" description="You have no notifications matching this filter." />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg divide-y divide-[#F1F5F9]">
          {roleNotifs.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex flex-wrap items-start justify-between gap-4 ${n.read ? 'bg-white' : 'bg-[#F8FAFF]'}`}
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                  <span className="font-semibold text-[#10233F]">{n.category}</span>
                  {n.categoryName && (
                    <>
                      <span>·</span>
                      <span className="font-medium text-[#15803D]">{n.categoryName}</span>
                    </>
                  )}
                  {n.listingId && (
                    <>
                      <span>·</span>
                      <span className="font-mono font-semibold text-[#1E3A8A]">{n.listingId}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{formatTime(n.sentAt || n.createdAt)}</span>
                  {!n.read && <StatusBadge status="Unread" />}
                  {n.emailStatus === 'sent' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] text-[11px] font-semibold">
                      <Mail className="w-3 h-3" /> Email Sent
                    </span>
                  )}
                  {n.emailStatus === 'failed' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FFE4E6] text-[#BE123C] text-[11px] font-semibold">
                      <Mail className="w-3 h-3" /> Email Failed
                    </span>
                  )}
                  {n.emailStatus === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] text-[11px] font-semibold">
                      <Mail className="w-3 h-3" /> Email Pending
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-[#0A172A]">{n.title}</div>
                <p className="text-xs text-[#475569]">{n.message}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {n.listingId && onViewListing && (
                  <Button variant="secondary" size="sm" onClick={() => onViewListing(n)}>
                    <ExternalLink className="w-3.5 h-3.5" /> View Listing
                  </Button>
                )}
                {!n.read && (
                  <Button variant="ghost" size="sm" onClick={() => void markNotificationRead(n.id)}>
                    <Check className="w-3.5 h-3.5" /> Mark Read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DocumentsView: React.FC<{ ownerFilterRole: 'buyer' | 'seller' | 'admin' }> = ({
  ownerFilterRole,
}) => {
  const { authUser, documents, uploadDocumentFile, addToast } = useMarketplace();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [docCategory, setDocCategory] = useState<DocumentRecord['category']>('EPR Certificates');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [relatedId, setRelatedId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const list =
    ownerFilterRole === 'admin'
      ? documents
      : documents.filter((d) => d.ownerUid === authUser?.uid);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-[#0A172A]">
            {ownerFilterRole === 'seller' ? 'Documents & Certificates' : 'Documents & Invoices'}
          </h1>
          <p className="text-xs text-[#64748B]">
            Company registration, GST certificates, EPR registration proofs, invoices, and payment proofs (PDF, PNG, JPEG up to 10 MB).
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setUploadError(null); setUploadOpen(true); }}>
          <Upload className="w-3.5 h-3.5" /> Upload Document
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No Documents Uploaded Yet"
          description="Upload company registration, GST certificate, EPR certificates, or payment proofs for verification."
          actionLabel="Upload Document"
          onAction={() => setUploadOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((d) => (
            <div key={d.id} className="bg-white border border-[#E2E8F0] rounded-lg p-4 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-[#1E3A8A]">{d.category}</span>
                  <StatusBadge status={d.verificationStatus} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#64748B] shrink-0" />
                  <span className="text-sm font-semibold text-[#0A172A] truncate">{d.fileName}</span>
                </div>
                <div className="mt-2 text-xs text-[#64748B] font-mono">
                  {formatTime(d.createdAt)} · {formatBytes(d.fileSizeBytes)}
                </div>
              </div>
              <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(d)}>
                  <Eye className="w-3.5 h-3.5" /> Details
                </Button>
                <a
                  href={d.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={d.fileName}
                  onClick={() => addToast({ type: 'info', title: `Opening ${d.fileName}` })}
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg bg-white text-[#10233F] border border-[#CBD5E1] hover:bg-[#F8FAFC]"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Verification Document" maxWidth="max-w-md">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selectedFile) {
              setUploadError('Please select a PDF, PNG, or JPEG file (max 10 MB).');
              return;
            }
            setUploading(true);
            setUploadError(null);
            try {
              await uploadDocumentFile(docCategory, selectedFile, relatedId.trim() || undefined);
              setUploadOpen(false);
              setSelectedFile(null);
              setRelatedId('');
            } catch (err) {
              setUploadError(err instanceof Error ? err.message : 'Document upload failed.');
            } finally {
              setUploading(false);
            }
          }}
        >
          {uploadError && (
            <div className="p-3 bg-[#FFE4E6] border border-[#FECDD3] rounded text-xs text-[#BE123C]">
              {uploadError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Document Category</label>
            <select
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value as DocumentRecord['category'])}
              className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
            >
              <option>Company Registration</option>
              <option>GST Certificates</option>
              <option>EPR Registration Details</option>
              <option>EPR Certificates</option>
              <option>Supporting Documents</option>
              <option>Invoices</option>
              <option>Payment Proofs</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Select File (PDF, PNG, JPEG · Max 10 MB) *</label>
            <input
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-[#334155] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-[#CBD5E1] file:bg-[#F8FAFC] file:text-xs file:font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Related Order / Listing ID (Optional)</label>
            <input
              value={relatedId}
              onChange={(e) => setRelatedId(e.target.value)}
              placeholder="e.g. ORD-123456 or LST-123456"
              className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.fileName || 'Document Details'}
        subtitle={previewDoc ? `${previewDoc.category} · ${previewDoc.ownerRole.toUpperCase()}` : ''}
      >
        {previewDoc && (
          <div className="space-y-4">
            <div className="p-6 bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg text-center space-y-2">
              <FileText className="w-10 h-10 text-[#10233F] mx-auto" />
              <div className="text-sm font-semibold text-[#0A172A]">{previewDoc.fileName}</div>
              <div className="text-xs text-[#64748B]">
                Document ID: <span className="font-mono">{previewDoc.id}</span> ·{' '}
                <StatusBadge status={previewDoc.verificationStatus} />
              </div>
              {previewDoc.relatedId && (
                <div className="text-xs font-mono text-[#475569]">Reference: {previewDoc.relatedId}</div>
              )}
              <div className="pt-3">
                <a
                  href={previewDoc.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#10233F] text-white"
                >
                  <Download className="w-3.5 h-3.5" /> Open File
                </a>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export const PaymentsView: React.FC = () => {
  const { payments, orders } = useMarketplace();
  const totalPaid = payments.filter((p) => p.status === 'Verified').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold text-[#0A172A]">Payment Tracking & Invoices</h1>
        <p className="text-xs text-[#64748B]">
          Direct NEFT/RTGS settlement tracking coordinated by EPR Bazaar. Not an escrow service.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Recorded Transactions</div>
          <div className="font-mono text-2xl font-bold text-[#0A172A] mt-1">{payments.length}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Verified Amount</div>
          <div className="font-mono text-2xl font-bold text-[#16A36A] mt-1">{formatINR(totalPaid)}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Active Orders</div>
          <div className="font-mono text-2xl font-bold text-[#0A172A] mt-1">{orders.length}</div>
        </div>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          title="No transactions completed."
          description="Verified advance, balance, and settlement payment entries will appear here once recorded."
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference No.</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-sm">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-mono text-xs font-semibold">{p.id}</td>
                    <td className="py-3 px-4 font-mono text-xs text-[#1E3A8A]">{p.orderId}</td>
                    <td className="py-3 px-4">{p.paymentType}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">{formatINR(p.amount)}</td>
                    <td className="py-3 px-4 font-mono text-xs">{p.paymentMethod}</td>
                    <td className="py-3 px-4 font-mono text-xs text-[#475569]">{p.referenceNumber}</td>
                    <td className="py-3 px-4 font-mono text-xs text-[#64748B]">{p.paymentDate}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} />
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
};

export const CompanyProfileView: React.FC<{
  account: BuyerAccount | SellerAccount | null;
  accountType: 'buyer' | 'seller';
  mode: 'profile' | 'verification' | 'settings';
}> = ({ account, accountType, mode }) => {
  const { categories, addToast, logout } = useMarketplace();
  const [mobile, setMobile] = useState(account?.mobile || '');
  const [contactPerson, setContactPerson] = useState(account?.contactPerson || '');
  const [city, setCity] = useState(account?.city || '');
  const [stateVal, setStateVal] = useState(account?.state || '');
  const [dealingCategories, setDealingCategories] = useState<string[]>(account?.dealingCategories || []);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState<boolean>(
    account?.emailNotificationsEnabled ?? true
  );
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [notifyOffers, setNotifyOffers] = useState(true);
  const [notifyMatches, setNotifyMatches] = useState(true);

  useEffect(() => {
    if (!account) return;
    setMobile(account.mobile || '');
    setContactPerson(account.contactPerson || '');
    setCity(account.city || '');
    setStateVal(account.state || '');
    setDealingCategories(account.dealingCategories || []);
    setEmailNotificationsEnabled(account.emailNotificationsEnabled ?? true);
  }, [account]);

  const activeCategories = categories.filter((c) => c.active);

  const toggleCategory = (catId: string) => {
    setDealingCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  if (!account) {
    return (
      <EmptyState
        title="Profile Record Unavailable"
        description="Your company record could not be loaded right now. Please refresh or contact support."
      />
    );
  }

  if (mode === 'verification') {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5 max-w-3xl">
        <div className="flex items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <h1 className="font-display text-xl font-bold text-[#0A172A]">Account &amp; Compliance Verification</h1>
            <p className="text-xs text-[#64748B] mt-0.5">Corporate KYC and EPR portal registration status</p>
          </div>
          <StatusBadge status={account.verification} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg">
            <div className="text-xs text-[#64748B]">GSTIN Reference</div>
            <div className="font-mono font-semibold text-[#0A172A] mt-1">{account.gstin}</div>
            <div className="text-xs text-[#475569] mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A36A]" />
              {account.verification === 'Verified' ? 'Verified by EPR Bazaar Administration' : account.verification}
            </div>
          </div>
          <div className="p-4 bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg">
            <div className="text-xs text-[#64748B]">EPR Registration Reference</div>
            <div className="font-mono font-semibold text-[#0A172A] mt-1">{account.eprRegNo}</div>
            <div className="text-xs text-[#475569] mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A36A]" />
              {account.verification === 'Verified' ? 'Verified participant credential' : 'Under compliance review'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const col = accountType === 'buyer' ? 'buyers' : 'sellers';
    try {
      await updateDoc(doc(db, col, account.uid), {
        dealingCategories: dealingCategories.slice(0, 30),
        emailNotificationsEnabled,
        updatedAt: serverTimestamp(),
      });
      addToast({ type: 'success', title: 'Email notification preferences saved' });
    } catch (error) {
      addToast({ type: 'error', title: 'Failed to save preferences' });
      handleFirestoreError(error, OperationType.UPDATE, `${col}/${account.uid}`);
    } finally {
      setSavingSettings(false);
    }
  };

  if (mode === 'settings') {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Account Settings</h1>
          <p className="text-xs text-[#64748B]">Security, Google Sign-In link, and category email alert preferences.</p>
        </div>
        <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Authentication</div>
          <div className="flex items-center justify-between p-3 bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg text-sm">
            <div>
              <div className="font-semibold text-[#0A172A]">Google Authentication</div>
              <div className="font-mono text-xs text-[#64748B]">{account.email}</div>
            </div>
            <StatusBadge status="Connected" />
          </div>
        </div>
        <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Notification Preferences</div>
          <label className="flex items-center justify-between text-sm text-[#334155] cursor-pointer">
            <span>
              Enable category-based email notifications for new{' '}
              {accountType === 'buyer' ? 'selling offers' : 'buying requirements'}
            </span>
            <input
              type="checkbox"
              checked={emailNotificationsEnabled}
              onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between text-sm text-[#334155] cursor-pointer">
            <span>Receive matching opportunity alerts</span>
            <input type="checkbox" checked={notifyMatches} onChange={(e) => setNotifyMatches(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between text-sm text-[#334155] cursor-pointer">
            <span>Receive facilitator offer &amp; counteroffer alerts</span>
            <input type="checkbox" checked={notifyOffers} onChange={(e) => setNotifyOffers(e.target.checked)} />
          </label>
        </div>

        {activeCategories.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Subscribed EPR Categories ({dealingCategories.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeCategories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#334155] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={dealingCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                  />
                  <span>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
          <Button variant="danger" size="sm" onClick={() => void logout()}>
            Sign Out
          </Button>
          <Button variant="primary" size="sm" disabled={savingSettings} onClick={() => void handleSaveSettings()}>
            {savingSettings ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    );
  }

  const handleSaveContact = async () => {
    const cleanedMobile = mobile.trim();
    if (cleanedMobile.length < 10) {
      addToast({ type: 'error', title: 'Valid mobile number required (min 10 digits)' });
      return;
    }
    setSaving(true);
    const col = accountType === 'buyer' ? 'buyers' : 'sellers';
    try {
      await updateDoc(doc(db, col, account.uid), {
        contactPerson: contactPerson.trim() || account.contactPerson,
        mobile: cleanedMobile,
        city: city.trim(),
        state: stateVal.trim(),
        dealingCategories: dealingCategories.slice(0, 30),
        emailNotificationsEnabled,
        updatedAt: serverTimestamp(),
      });
      addToast({ type: 'success', title: 'Company profile and notification preferences updated' });
    } catch (error) {
      addToast({ type: 'error', title: 'Failed to update contact details' });
      handleFirestoreError(error, OperationType.UPDATE, `${col}/${account.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Company Profile</h1>
          <p className="text-xs text-[#64748B] font-mono mt-0.5">{account.companyId}</p>
        </div>
        <StatusBadge status={account.verification} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-[#64748B] mb-1">Company Name</label>
          <input readOnly value={account.companyName} className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#64748B] mb-1">Authorized Contact</label>
          <input
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            className="w-full h-10 px-3 border border-[#CBD5E1] rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#64748B] mb-1">Corporate Email</label>
          <input readOnly value={account.email} className="w-full h-10 px-3 font-mono bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#64748B] mb-1">Mobile Number *</label>
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full h-10 px-3 font-mono border border-[#CBD5E1] rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#64748B] mb-1">GSTIN</label>
          <input readOnly value={account.gstin} className="w-full h-10 px-3 font-mono bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#64748B] mb-1">CIN / LLPIN</label>
          <input readOnly value={account.cin || '—'} className="w-full h-10 px-3 font-mono bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#64748B] mb-1">City</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full h-10 px-3 border border-[#CBD5E1] rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#64748B] mb-1">State</label>
          <input
            value={stateVal}
            onChange={(e) => setStateVal(e.target.value)}
            className="w-full h-10 px-3 border border-[#CBD5E1] rounded-lg"
          />
        </div>
      </div>

      {activeCategories.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
          <label className="block text-xs font-semibold text-[#334155]">
            EPR Categories Dealt In (for two-way email alerts)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeCategories.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-2 p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#334155] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={dealingCategories.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                />
                <span>{cat.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="primary" size="sm" disabled={saving} onClick={() => void handleSaveContact()}>
          {saving ? 'Saving...' : 'Update Profile Info'}
        </Button>
      </div>
    </div>
  );
};
