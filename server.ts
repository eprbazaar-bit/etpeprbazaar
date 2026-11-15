import 'dotenv/config';
import express from 'express';
import type { Express, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  checkFirebaseAdminHealth,
  getAdminDb,
  getFirebaseAdminState,
  verifyBearerIdToken,
} from './server/firebaseAdmin.ts';
import { createEmailSender } from './server/emailService.ts';
import type { EmailSender } from './server/emailService.ts';
import type { NotificationDirection } from './server/emailTemplates.ts';
import {
  createFirestoreNotificationStore,
  dispatchCategoryListingNotifications,
  retryFailedEmailNotifications,
} from './server/notificationService.ts';
import type { NotificationStore } from './server/notificationService.ts';
import { generateRobotsTxt, generateSitemapXml } from './server/seoRoutes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface VerifiedCaller {
  uid: string;
  email?: string;
}

export interface ServerDeps {
  verifyToken?: (authHeader: string | undefined) => Promise<VerifiedCaller>;
  getStore?: () => NotificationStore;
  getEmailSender?: () => EmailSender;
  getHealthState?: () =>
    | {
        initialized: boolean;
        firestoreAccessOk?: boolean;
        error: string | null;
        projectId: string;
        databaseId: string;
      }
    | Promise<{
        initialized: boolean;
        firestoreAccessOk?: boolean;
        error: string | null;
        projectId: string;
        databaseId: string;
      }>;
}

function resolveAppBaseUrl(req: Request): string {
  const configured = (process.env.APP_URL || '').trim();
  if (configured && configured !== 'MY_APP_URL') {
    return configured.replace(/\/+$/, '');
  }
  const host = req.get('x-forwarded-host') || req.get('host');
  if (host) {
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    return `${proto}://${host}`.replace(/\/+$/, '');
  }
  return 'https://etp.eprbazaar.com';
}

export function createApiApp(deps?: ServerDeps): Express {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  const verifyToken =
    deps?.verifyToken ||
    (async (authHeader: string | undefined): Promise<VerifiedCaller> => {
      const decoded = await verifyBearerIdToken(authHeader);
      return { uid: decoded.uid, email: decoded.email };
    });

  const getStore =
    deps?.getStore ||
    (() => {
      return createFirestoreNotificationStore(getAdminDb());
    });

  const getSender = deps?.getEmailSender || (() => createEmailSender());
  const getHealth = deps?.getHealthState || checkFirebaseAdminHealth;

  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const baseUrl = resolveAppBaseUrl(req);
    res.status(200);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(generateSitemapXml(baseUrl));
  });

  app.get('/robots.txt', (req: Request, res: Response) => {
    const baseUrl = resolveAppBaseUrl(req);
    res.status(200);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(generateRobotsTxt(baseUrl));
  });

  app.get('/api/health', async (_req: Request, res: Response) => {
    const adminState = await getHealth();
    const sender = getSender();
    res.json({
      status: 'ok',
      firebaseAdmin: adminState,
      emailProvider: {
        provider: sender.getProviderName(),
        configured: sender.isConfigured(),
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/notifications/dispatch', async (req: Request, res: Response) => {
    try {
      const caller = await verifyToken(req.headers.authorization);
      const body = (req.body || {}) as {
        listingId?: unknown;
        notificationType?: unknown;
      };

      const listingId = typeof body.listingId === 'string' ? body.listingId.trim() : '';
      const notificationType =
        body.notificationType === 'buyer_requirement' || body.notificationType === 'seller_listing'
          ? (body.notificationType as NotificationDirection)
          : null;

      if (!listingId || !notificationType) {
        res.status(400).json({
          ok: false,
          error: 'Both listingId and notificationType ("buyer_requirement" or "seller_listing") are required.',
        });
        return;
      }

      const store = getStore();
      const sender = getSender();
      const summary = await dispatchCategoryListingNotifications(store, sender, {
        callerUid: caller.uid,
        callerEmail: caller.email,
        listingId,
        notificationType,
        appBaseUrl: resolveAppBaseUrl(req),
      });

      res.status(200).json({
        ok: true,
        ...summary,
        provider: sender.getProviderName(),
        providerConfigured: sender.isConfigured(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Notification dispatch failed.';
      const isPermDenied =
        (err as { code?: number | string })?.code === 7 || msg.includes('PERMISSION_DENIED');
      const statusCode = isPermDenied
        ? 503
        : (err as Error & { statusCode?: number }).statusCode ||
          (msg.includes('not initialized') ? 503 : 500);
      res.status(statusCode).json({
        ok: false,
        error: isPermDenied
          ? 'Firebase Admin SDK lacks Firestore IAM permission on intense-brook-3fs6l. Configure FIREBASE_SERVICE_ACCOUNT_JSON in backend secrets.'
          : msg,
      });
    }
  });

  app.post('/api/notifications/retry', async (req: Request, res: Response) => {
    try {
      const caller = await verifyToken(req.headers.authorization);
      const body = (req.body || {}) as { notificationId?: unknown };
      const notificationId =
        typeof body.notificationId === 'string' && body.notificationId.trim()
          ? body.notificationId.trim()
          : undefined;

      const store = getStore();
      const sender = getSender();
      const summary = await retryFailedEmailNotifications(store, sender, {
        callerUid: caller.uid,
        callerEmail: caller.email,
        notificationId,
        appBaseUrl: resolveAppBaseUrl(req),
      });

      res.status(200).json({
        ok: true,
        ...summary,
        provider: sender.getProviderName(),
        providerConfigured: sender.isConfigured(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed email retry error.';
      const isPermDenied =
        (err as { code?: number | string })?.code === 7 || msg.includes('PERMISSION_DENIED');
      const statusCode = isPermDenied
        ? 503
        : (err as Error & { statusCode?: number }).statusCode ||
          (msg.includes('not initialized') ? 503 : 500);
      res.status(statusCode).json({
        ok: false,
        error: isPermDenied
          ? 'Firebase Admin SDK lacks Firestore IAM permission on intense-brook-3fs6l. Configure FIREBASE_SERVICE_ACCOUNT_JSON in backend secrets.'
          : msg,
      });
    }
  });

  return app;
}

async function startServer() {
  const app = createApiApp();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const indexHtml = path.join(distDir, 'index.html');
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ ok: false, error: 'API route not found.' });
        return;
      }
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(503).send('Production bundle not built yet. Run npm run build.');
      }
    });
  }

  // Periodic background retry for any failed email deliveries (every 5 minutes)
  const retryInterval = setInterval(async () => {
    try {
      const adminState = getFirebaseAdminState();
      const sender = createEmailSender();
      if (!adminState.initialized || !sender.isConfigured()) return;
      const store = createFirestoreNotificationStore(getAdminDb());
      const appBaseUrl =
        process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
          ? process.env.APP_URL.replace(/\/+$/, '')
          : 'https://etp.eprbazaar.com';
      await retryFailedEmailNotifications(store, sender, {
        systemBypassAuth: true,
        appBaseUrl,
        maxAttempts: 5,
      });
    } catch {
      // swallow background sweep errors; delivery logs record any failures
    }
  }, 5 * 60 * 1000);
  retryInterval.unref();

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`ETP EPR Bazaar server listening on http://0.0.0.0:${port}`);
  });
}

const isEntrypoint =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isEntrypoint) {
  void startServer();
}
