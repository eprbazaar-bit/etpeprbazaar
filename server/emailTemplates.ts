export type NotificationDirection = 'buyer_requirement' | 'seller_listing';

export interface EmailTemplatePayload {
  notificationType: NotificationDirection;
  listingId: string;
  category: string;
  subcategory: string;
  financialYear: string;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  location: string;
  timestampIso: string;
  appBaseUrl: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatINRValue(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTimeIST(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }) + ' IST';
}

export function buildListingEmailContent(payload: EmailTemplatePayload): {
  subject: string;
  html: string;
  text: string;
} {
  const isBuyerReq = payload.notificationType === 'buyer_requirement';
  const listingTypeLabel = isBuyerReq ? 'Buying Requirement' : 'Selling Offer';
  const rateLabel = isBuyerReq ? 'Buying Rate' : 'Selling Rate';
  const subject = isBuyerReq
    ? `New Buying Requirement Available – ${payload.category} | EPR Bazaar`
    : `New Selling Offer Available – ${payload.category} | EPR Bazaar`;

  const baseUrl = (payload.appBaseUrl || 'https://etp.eprbazaar.com').replace(/\/+$/, '');
  const logoUrl = `${baseUrl}/assets/aistudio/epr_bazaar_logo__9ac2c6f9.jpeg`;
  const viewListingUrl = `${baseUrl}/?page=login&listing=${encodeURIComponent(payload.listingId)}&type=${encodeURIComponent(payload.notificationType)}`;

  const formattedQty = `${payload.quantity.toLocaleString('en-IN')} ${payload.unit}`;
  const formattedRate = `${formatINRValue(payload.ratePerUnit)}/${payload.unit}`;
  const formattedDate = formatDateTimeIST(payload.timestampIso);
  const safeLocation = payload.location.trim() || 'India (Verified Participant)';

  const badgeBg = isBuyerReq ? '#DBEAFE' : '#DCFCE7';
  const badgeText = isBuyerReq ? '#1E3A8A' : '#15803D';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F7FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0A172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F4F7FB;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:20px 28px;border-bottom:1px solid #E2E8F0;background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <img src="${escapeHtml(logoUrl)}" alt="EPR Bazaar — One Stop for EPR Solutions" style="height:44px;width:auto;display:block;border:0;" />
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;padding:5px 10px;border-radius:4px;background-color:${badgeBg};color:${badgeText};font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">
                      ${escapeHtml(listingTypeLabel)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:26px 28px 12px 28px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#16A36A;margin-bottom:6px;">
                ETP – EPR Bazaar Category Alert
              </div>
              <h1 style="margin:0 0 10px 0;font-size:20px;line-height:1.3;font-weight:700;color:#0A172A;">
                ${escapeHtml(subject)}
              </h1>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">
                A new verified ${escapeHtml(listingTypeLabel.toLowerCase())} matching your registered EPR category (<strong>${escapeHtml(payload.category)}</strong>) has just been published on ETP – EPR Bazaar.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:12px 28px 20px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;width:42%;">Listing Type</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;font-weight:700;color:#0A172A;">${escapeHtml(listingTypeLabel)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;">EPR Category</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;font-weight:700;color:#0A172A;">${escapeHtml(payload.category)} (${escapeHtml(payload.subcategory)})</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;">Financial Year</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;font-weight:600;color:#0A172A;">${escapeHtml(payload.financialYear)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;">Quantity</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;font-weight:700;font-family:monospace;color:#0A172A;">${escapeHtml(formattedQty)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;">${escapeHtml(rateLabel)}</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;font-weight:700;font-family:monospace;color:#16A36A;">${escapeHtml(formattedRate)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;">Location</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;font-weight:600;color:#0A172A;">${escapeHtml(safeLocation)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:12px;color:#64748B;">Listing Reference</td>
                  <td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;font-size:13px;font-weight:700;font-family:monospace;color:#10233F;">${escapeHtml(payload.listingId)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:12px;color:#64748B;">Published Date &amp; Time</td>
                  <td style="padding:12px 16px;font-size:12px;font-family:monospace;color:#334155;">${escapeHtml(formattedDate)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:4px 28px 24px 28px;text-align:center;">
              <a href="${escapeHtml(viewListingUrl)}" style="display:inline-block;padding:12px 28px;background-color:#10233F;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;">
                View Listing
              </a>
              <p style="margin:12px 0 0 0;font-size:11px;color:#64748B;">
                Secure login required. All negotiations and commercial coordination remain managed confidentially by ETP – EPR Bazaar facilitators.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px;background-color:#0A172A;color:#CBD5E1;font-size:11px;line-height:1.6;">
              <div style="font-weight:700;color:#FFFFFF;">ETP – EPR Bazaar · NYANVI ECOCLEAN PRIVATE LIMITED</div>
              <div>CIN: U38220WB2024PTC274770 · Kolkata, West Bengal, India</div>
              <div style="margin-top:4px;">
                Portal: <a href="${escapeHtml(baseUrl)}" style="color:#86EFAC;text-decoration:none;">${escapeHtml(baseUrl)}</a>
                &nbsp;|&nbsp; Support: info@eprbazaar.com
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    subject,
    '',
    `Listing Type: ${listingTypeLabel}`,
    `EPR Category: ${payload.category} (${payload.subcategory})`,
    `Financial Year: ${payload.financialYear}`,
    `Quantity: ${formattedQty}`,
    `${rateLabel}: ${formattedRate}`,
    `Location: ${safeLocation}`,
    `Listing Reference: ${payload.listingId}`,
    `Date & Time: ${formattedDate}`,
    '',
    `View Listing (Secure Login): ${viewListingUrl}`,
    '',
    'ETP – EPR Bazaar | NYANVI ECOCLEAN PRIVATE LIMITED',
  ].join('\n');

  return { subject, html, text };
}
