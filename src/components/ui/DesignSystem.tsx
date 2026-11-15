import React from 'react';
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle, Download, Inbox, WifiOff, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { PublishedEprRate, ToastMessage } from '../../types';

export const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

export const LogoMark: React.FC<{ dark?: boolean; onClick?: () => void }> = ({ dark = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center text-left whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] rounded-md cursor-pointer ${
      dark ? 'bg-white px-2.5 py-1 shadow-sm' : ''
    }`}
    aria-label="ETP – EPR Bazaar Home"
  >
    <img
      src="/assets/aistudio/epr_bazaar_logo__9ac2c6f9.jpeg"
      alt="EPR Bazaar — One Stop for EPR Solutions"
      className={`${dark ? 'h-8' : 'h-9 sm:h-10'} w-auto object-contain rounded`}
    />
  </button>
);

export const EprRateTickerBar: React.FC<{
  rates: PublishedEprRate[];
  onRateClick?: (rate: PublishedEprRate) => void;
}> = ({ rates, onRateClick }) => {
  const activeRates = rates
    .filter((r) => r.published)
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  return (
    <div
      className="bg-[#0A172A] text-white border-b border-[#1E293B] h-7 sm:h-8 flex items-center overflow-hidden"
      aria-label="Published EPR Credit Reference Rates"
    >
      <div className="max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 flex items-center gap-3 sm:gap-4 min-w-0">
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8] whitespace-nowrap shrink-0 border-r border-white/15 pr-3">
          EPR Rates
        </span>

        {activeRates.length === 0 ? (
          <div className="text-[11px] sm:text-xs text-[#CBD5E1] truncate">
            Official category reference rates are published by the EPR Bazaar desk.
          </div>
        ) : (
          <div className="flex-1 overflow-hidden min-w-0">
            <div className="animate-ticker gap-6 sm:gap-8 items-center text-[11px] sm:text-xs font-mono tabular-nums">
              {[...activeRates, ...activeRates].map((r, idx) => {
                const TrendIcon =
                  r.trend === 'Up' ? ArrowUpRight : r.trend === 'Down' ? ArrowDownRight : Minus;
                const trendColor =
                  r.trend === 'Up'
                    ? 'text-[#4ADE80]'
                    : r.trend === 'Down'
                    ? 'text-[#FDA4AF]'
                    : 'text-[#94A3B8]';
                return (
                  <button
                    key={`${r.id}-${idx}`}
                    type="button"
                    onClick={() => onRateClick?.(r)}
                    className="inline-flex items-center gap-2 whitespace-nowrap text-left hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:underline"
                  >
                    <span className="font-sans font-medium text-[#E2E8F0]">{r.categoryName}</span>
                    <span className="text-[#94A3B8] text-[10px] hidden sm:inline">({r.financialYear})</span>
                    <span className="font-semibold text-white">
                      {formatINR(r.rate)}/{r.unit}
                    </span>
                    <TrendIcon className={`w-3 h-3 ${trendColor}`} aria-hidden="true" />
                    <span className="text-white/20 pl-2" aria-hidden="true">
                      /
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalized = status.toLowerCase();
  let classes = 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]';
  if (
    normalized.includes('verified') ||
    normalized.includes('active') ||
    normalized.includes('accepted') ||
    normalized.includes('completed') ||
    normalized.includes('confirmed') ||
    normalized.includes('agreed') ||
    normalized.includes('transferred') ||
    normalized.includes('fully paid') ||
    normalized === 'matched'
  ) {
    classes = 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]';
  } else if (
    normalized.includes('pending') ||
    normalized.includes('partially') ||
    normalized.includes('review') ||
    normalized.includes('progress') ||
    normalized.includes('advance') ||
    normalized.includes('paused') ||
    normalized.includes('counter')
  ) {
    classes = 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
  } else if (
    normalized.includes('rejected') ||
    normalized.includes('withdrawn') ||
    normalized.includes('expired') ||
    normalized.includes('suspended') ||
    normalized.includes('unpaid') ||
    normalized.includes('action')
  ) {
    classes = 'bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]';
  } else if (
    normalized.includes('new') ||
    normalized.includes('shared') ||
    normalized.includes('order created') ||
    normalized.includes('draft') ||
    normalized.includes('scheduled')
  ) {
    classes = 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded border whitespace-nowrap shrink-0 ${classes}`}
    >
      {status}
    </span>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'emerald' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]';
  const sizes = size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm';
  const variants = {
    primary: 'bg-[#10233F] text-white hover:bg-[#0A172A] border border-transparent',
    emerald: 'bg-[#16A36A] text-white hover:bg-[#15803D] border border-transparent',
    secondary: 'bg-white text-[#10233F] border border-[#CBD5E1] hover:bg-[#F8FAFC] hover:border-[#94A3B8]',
    ghost: 'bg-transparent text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0A172A] border border-transparent',
    danger: 'bg-[#E11D48] text-white hover:bg-[#BE123C] border border-transparent',
  };
  return (
    <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const MetricCard: React.FC<{
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: 'navy' | 'emerald' | 'amber' | 'slate';
  onClick?: () => void;
}> = ({ label, value, sublabel, accent = 'navy', onClick }) => {
  const accentText =
    accent === 'emerald'
      ? 'text-[#16A36A]'
      : accent === 'amber'
      ? 'text-[#D97706]'
      : accent === 'slate'
      ? 'text-[#475569]'
      : 'text-[#0A172A]';

  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-[0_1px_2px_0_rgba(16,35,63,0.04)] ${
        onClick ? 'hover:border-[#CBD5E1] hover:shadow-sm transition-all cursor-pointer' : ''
      }`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">{label}</div>
      <div className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${accentText}`}>{value}</div>
      {sublabel && <div className="mt-1 text-xs text-[#64748B]">{sublabel}</div>}
    </Tag>
  );
};

export const ErrorAlertBanner: React.FC<{ title?: string; message: string }> = ({
  title = 'Service Notice',
  message,
}) => (
  <div className="flex items-start gap-3 p-4 bg-[#FFE4E6] border border-[#FECDD3] rounded-lg text-xs text-[#9F1239]">
    <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
    <div>
      <div className="font-semibold">{title}</div>
      <div className="mt-0.5">{message}</div>
    </div>
  </div>
);

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, maxWidth = 'max-w-xl', children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A172A]/50 backdrop-blur-[2px]">
      <div className={`w-full ${maxWidth} bg-white border border-[#E2E8F0] rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col`}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <div>
            <h3 className="font-display text-base font-semibold text-[#0A172A]">{title}</h3>
            {subtitle && <p className="text-xs text-[#64748B] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-md text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0A172A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const ConfirmModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'primary' | 'emerald' | 'danger';
}> = ({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm Action', variant = 'primary' }) => (
  <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
    <p className="text-sm text-[#475569] leading-relaxed">{description}</p>
    <div className="mt-6 flex items-center justify-end gap-3">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant={variant}
        onClick={() => {
          onConfirm();
          onClose();
        }}
      >
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-white border border-[#E2E8F0] rounded-lg">
    <div className="w-10 h-10 rounded-lg bg-[#F4F7FB] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] mb-3">
      <Inbox className="w-5 h-5" />
    </div>
    <h4 className="font-display text-sm font-semibold text-[#0A172A]">{title}</h4>
    <p className="mt-1 text-xs text-[#64748B] max-w-sm">{description}</p>
    {actionLabel && onAction && (
      <Button variant="primary" size="sm" className="mt-4" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
    <div className="h-9 bg-[#F8FAFC] border-b border-[#E2E8F0]" />
    <div className="divide-y divide-[#F1F5F9]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 px-4 flex items-center gap-4">
          <div className="h-3 w-24 bg-[#E2E8F0] rounded" />
          <div className="h-3 w-40 bg-[#F1F5F9] rounded" />
          <div className="h-3 w-20 bg-[#E2E8F0] rounded ml-auto" />
        </div>
      ))}
    </div>
  </div>
);

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; onDismiss: (id: string) => void }> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const icon =
          t.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#16A36A] shrink-0" />
          ) : t.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
          ) : t.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-[#E11D48] shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-[#0284C7] shrink-0" />
          );
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 bg-white border border-[#CBD5E1] rounded-lg shadow-lg"
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[#0A172A]">{t.title}</div>
              {t.description && <div className="text-xs text-[#64748B] mt-0.5">{t.description}</div>}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="text-[#94A3B8] hover:text-[#0A172A]"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const CsvExportButton: React.FC<{
  label?: string;
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  onExported?: () => void;
}> = ({ label = 'Export CSV', filename, headers, rows, onExported }) => (
  <Button
    variant="secondary"
    size="sm"
    onClick={() => {
      downloadCSV(filename, headers, rows);
      onExported?.();
    }}
  >
    <Download className="w-3.5 h-3.5" />
    {label}
  </Button>
);

export const SimpleBarChart: React.FC<{
  data: { label: string; value: number }[];
  color?: string;
  unit?: string;
}> = ({ data, color = '#10233F', unit = '' }) => {
  if (data.length === 0) {
    return (
      <div className="text-xs text-[#64748B] py-6 text-center">
        No transaction activity recorded for this chart yet.
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => {
        const pct = Math.round((d.value / max) * 100);
        return (
          <div key={d.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#334155] font-medium truncate pr-2">{d.label}</span>
              <span className="font-mono font-semibold text-[#0A172A] tabular-nums shrink-0">
                {d.value.toLocaleString('en-IN')}
                {unit}
              </span>
            </div>
            <div className="h-2 w-full bg-[#F1F5F9] rounded overflow-hidden">
              <div className="h-full rounded transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
