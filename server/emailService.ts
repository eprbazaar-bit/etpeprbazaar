import nodemailer from 'nodemailer';

export type EmailProviderName = 'resend' | 'sendgrid' | 'smtp' | 'none';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  ok: boolean;
  provider: EmailProviderName;
  providerMessageId?: string;
  providerResponse?: string;
  errorMessage?: string;
}

export interface EmailSender {
  getProviderName: () => EmailProviderName;
  isConfigured: () => boolean;
  sendEmail: (input: SendEmailInput) => Promise<SendEmailResult>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmailAddress(email: string): boolean {
  const cleaned = email.trim();
  return cleaned.length >= 5 && cleaned.length <= 160 && EMAIL_REGEX.test(cleaned);
}

export interface EmailProviderConfig {
  provider?: string;
  from?: string;
  resendApiKey?: string;
  sendgridApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
}

export function resolveEmailProvider(cfg: EmailProviderConfig): EmailProviderName {
  const explicit = (cfg.provider || '').trim().toLowerCase();
  if (explicit === 'resend' && cfg.resendApiKey) return 'resend';
  if (explicit === 'sendgrid' && cfg.sendgridApiKey) return 'sendgrid';
  if (explicit === 'smtp' && cfg.smtpHost && cfg.smtpUser && cfg.smtpPass) return 'smtp';

  if (cfg.resendApiKey) return 'resend';
  if (cfg.sendgridApiKey) return 'sendgrid';
  if (cfg.smtpHost && (cfg.smtpUser || cfg.smtpPass || cfg.smtpPort)) return 'smtp';
  return 'none';
}

export function createEmailSender(customConfig?: EmailProviderConfig): EmailSender {
  const cfg: EmailProviderConfig = customConfig || {
    provider: process.env.EMAIL_PROVIDER,
    from: process.env.EMAIL_FROM || 'EPR Bazaar Alerts <alerts@eprbazaar.com>',
    resendApiKey: process.env.RESEND_API_KEY,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
  };

  const fromAddress = cfg.from || 'EPR Bazaar Alerts <alerts@eprbazaar.com>';
  const activeProvider = resolveEmailProvider(cfg);

  const smtpTransport =
    activeProvider === 'smtp' && cfg.smtpHost
      ? nodemailer.createTransport({
          host: cfg.smtpHost,
          port: cfg.smtpPort || 587,
          secure: Boolean(cfg.smtpSecure),
          ...(cfg.smtpUser && cfg.smtpPass
            ? {
                auth: {
                  user: cfg.smtpUser,
                  pass: cfg.smtpPass,
                },
              }
            : {}),
        })
      : null;

  return {
    getProviderName: () => activeProvider,
    isConfigured: () => activeProvider !== 'none',
    async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
      if (!isValidEmailAddress(input.to)) {
        return {
          ok: false,
          provider: activeProvider,
          errorMessage: `Invalid recipient email address: ${input.to}`,
        };
      }

      if (activeProvider === 'none') {
        return {
          ok: false,
          provider: 'none',
          errorMessage:
            'Transactional email provider is not configured. Set RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASS environment variables.',
        };
      }

      if (activeProvider === 'resend') {
        try {
          const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cfg.resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromAddress,
              to: [input.to.trim()],
              subject: input.subject,
              html: input.html,
              text: input.text,
            }),
          });
          const rawBody = await resp.text();
          if (!resp.ok) {
            return {
              ok: false,
              provider: 'resend',
              providerResponse: rawBody.slice(0, 400),
              errorMessage: `Resend HTTP ${resp.status}: ${rawBody.slice(0, 300)}`,
            };
          }
          let msgId = '';
          try {
            const parsed = JSON.parse(rawBody) as { id?: string };
            msgId = parsed.id || '';
          } catch {
            // ignore non-json
          }
          return {
            ok: true,
            provider: 'resend',
            providerMessageId: msgId,
            providerResponse: rawBody.slice(0, 400),
          };
        } catch (err) {
          return {
            ok: false,
            provider: 'resend',
            errorMessage: err instanceof Error ? err.message : String(err),
          };
        }
      }

      if (activeProvider === 'sendgrid') {
        try {
          const matchFrom = fromAddress.match(/^(.*)<([^>]+)>$/);
          const fromEmail = matchFrom ? matchFrom[2].trim() : fromAddress.trim();
          const fromName = matchFrom ? matchFrom[1].trim() : 'EPR Bazaar';

          const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cfg.sendgridApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: input.to.trim() }] }],
              from: { email: fromEmail, name: fromName },
              subject: input.subject,
              content: [
                { type: 'text/plain', value: input.text },
                { type: 'text/html', value: input.html },
              ],
            }),
          });
          const rawBody = await resp.text();
          if (!resp.ok) {
            return {
              ok: false,
              provider: 'sendgrid',
              providerResponse: rawBody.slice(0, 400),
              errorMessage: `SendGrid HTTP ${resp.status}: ${rawBody.slice(0, 300)}`,
            };
          }
          return {
            ok: true,
            provider: 'sendgrid',
            providerMessageId: resp.headers.get('x-message-id') || '',
            providerResponse: `HTTP ${resp.status}`,
          };
        } catch (err) {
          return {
            ok: false,
            provider: 'sendgrid',
            errorMessage: err instanceof Error ? err.message : String(err),
          };
        }
      }

      // SMTP via nodemailer
      if (!smtpTransport) {
        return {
          ok: false,
          provider: 'smtp',
          errorMessage: 'SMTP transport failed to initialize.',
        };
      }
      try {
        const info = await smtpTransport.sendMail({
          from: fromAddress,
          to: input.to.trim(),
          subject: input.subject,
          text: input.text,
          html: input.html,
        });
        return {
          ok: true,
          provider: 'smtp',
          providerMessageId: info.messageId || '',
          providerResponse: String(info.response || '250 OK').slice(0, 400),
        };
      } catch (err) {
        return {
          ok: false,
          provider: 'smtp',
          errorMessage: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
