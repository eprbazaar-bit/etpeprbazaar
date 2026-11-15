import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { buildListingEmailContent } from './emailTemplates.ts';
import type { NotificationDirection } from './emailTemplates.ts';
import { isValidEmailAddress } from './emailService.ts';
import type { EmailProviderName, EmailSender } from './emailService.ts';

export interface StoredListingRecord {
  id: string;
  ownerUid: string;
  categoryId: string;
  categoryName: string;
  subcategory: string;
  financialYear: string;
  quantity: number;
  unit: string;
  rate: number;
  status: string;
}

export interface StoredParticipantRecord {
  uid: string;
  email: string;
  role: 'buyer' | 'seller';
  status: string;
  city?: string;
  state?: string;
  dealingCategories?: string[];
  emailNotificationsEnabled?: boolean;
}

export interface StoredEmailDeliveryLog {
  notificationId: string;
  listingId: string;
  recipientUserId: string;
  recipientEmail: string;
  recipientRole: 'buyer' | 'seller';
  categoryId: string;
  category: string;
  notificationType: NotificationDirection;
  subject: string;
  status: 'pending' | 'sent' | 'failed';
  attemptCount: number;
  provider: EmailProviderName;
  providerMessageId?: string;
  providerResponse?: string;
  errorMessage?: string;
  createdAt: Date;
  sentAt?: Date;
  lastAttemptAt: Date;
}

export interface StoredUserNotification {
  id: string;
  notificationId: string;
  recipientUid: string;
  targetRole: 'buyer' | 'seller';
  category: 'Requirement Updates' | 'Listing Updates';
  title: string;
  message: string;
  dedupeKey: string;
  listingId: string;
  categoryId: string;
  categoryName: string;
  notificationType: NotificationDirection;
  emailStatus: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  errorMessage?: string;
  read: boolean;
  createdAt: Date;
}

export interface NotificationStore {
  isStaffUser: (uid: string, email?: string) => Promise<boolean>;
  isActiveUserAccount: (uid: string, role: 'buyer' | 'seller') => Promise<boolean>;
  getListing: (listingId: string, type: NotificationDirection) => Promise<StoredListingRecord | null>;
  getParticipantLocation: (uid: string, role: 'buyer' | 'seller') => Promise<string>;
  findMatchingRecipients: (
    recipientRole: 'buyer' | 'seller',
    categoryId: string,
    categoryName: string,
    excludeUid: string
  ) => Promise<StoredParticipantRecord[]>;
  getDeliveryLog: (notificationId: string) => Promise<StoredEmailDeliveryLog | null>;
  listFailedDeliveryLogs: (notificationId?: string, maxAttempts?: number) => Promise<StoredEmailDeliveryLog[]>;
  upsertDeliveryLog: (log: StoredEmailDeliveryLog) => Promise<void>;
  upsertUserNotification: (notif: StoredUserNotification) => Promise<void>;
}

const BOOTSTRAPPED_ADMIN_EMAIL = 'ajaykumartiwari609@gmail.com';

export function makeSafeNotificationId(
  notificationType: NotificationDirection,
  listingId: string,
  recipientUid: string
): string {
  const prefix = notificationType === 'buyer_requirement' ? 'EML-BR' : 'EML-SL';
  const raw = `${prefix}-${listingId}-${recipientUid}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  return raw.slice(0, 128);
}

export function createFirestoreNotificationStore(db: Firestore): NotificationStore {
  return {
    async isStaffUser(uid: string, email?: string): Promise<boolean> {
      const normalizedEmail = (email || '').trim().toLowerCase();
      if (normalizedEmail === BOOTSTRAPPED_ADMIN_EMAIL) return true;
      const [admSnap, facSnap, authFacSnap] = await Promise.all([
        db.collection('admins').doc(uid).get(),
        db.collection('facilitators').doc(uid).get(),
        normalizedEmail
          ? db.collection('authorized_facilitators').doc(normalizedEmail).get()
          : Promise.resolve(null),
      ]);
      if (admSnap.exists && admSnap.data()?.status === 'Active') return true;
      if (facSnap.exists && facSnap.data()?.status === 'Active') return true;
      if (authFacSnap && authFacSnap.exists && authFacSnap.data()?.status === 'Active') return true;
      return false;
    },

    async isActiveUserAccount(uid: string, role: 'buyer' | 'seller'): Promise<boolean> {
      const col = role === 'buyer' ? 'buyers' : 'sellers';
      const [userSnap, profileSnap] = await Promise.all([
        db.collection('users').doc(uid).get(),
        db.collection(col).doc(uid).get(),
      ]);
      if (!userSnap.exists || !profileSnap.exists) return false;
      return userSnap.data()?.status === 'Active' && profileSnap.data()?.status === 'Active';
    },

    async getListing(listingId: string, type: NotificationDirection): Promise<StoredListingRecord | null> {
      const col = type === 'buyer_requirement' ? 'buyer_requirements' : 'seller_listings';
      const snap = await db.collection(col).doc(listingId).get();
      if (!snap.exists) return null;
      const d = snap.data() as Record<string, unknown>;
      return {
        id: String(d.id || snap.id),
        ownerUid: String(type === 'buyer_requirement' ? d.buyerUid : d.sellerUid),
        categoryId: String(d.categoryId || ''),
        categoryName: String(d.categoryName || ''),
        subcategory: String(d.subcategory || 'Standard'),
        financialYear: String(d.financialYear || 'FY 2025-26'),
        quantity: Number(type === 'buyer_requirement' ? d.requiredQty : d.listedQty),
        unit: String(d.unit || 'MT'),
        rate: Number(type === 'buyer_requirement' ? d.maxBuyingRate : d.askingRate),
        status: String(d.status || ''),
      };
    },

    async getParticipantLocation(uid: string, role: 'buyer' | 'seller'): Promise<string> {
      const col = role === 'buyer' ? 'buyers' : 'sellers';
      const snap = await db.collection(col).doc(uid).get();
      if (!snap.exists) return 'India';
      const d = snap.data() as { city?: string; state?: string };
      const parts = [d.city, d.state].map((s) => (s || '').trim()).filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : 'India';
    },

    async findMatchingRecipients(
      recipientRole: 'buyer' | 'seller',
      categoryId: string,
      categoryName: string,
      excludeUid: string
    ): Promise<StoredParticipantRecord[]> {
      const col = recipientRole === 'buyer' ? 'buyers' : 'sellers';
      const snap = await db.collection(col).where('status', '==', 'Active').get();

      // Also track implicit participation in this category for legacy profiles without dealingCategories set
      const activityCol = recipientRole === 'buyer' ? 'buyer_requirements' : 'seller_listings';
      const activityOwnerKey = recipientRole === 'buyer' ? 'buyerUid' : 'sellerUid';
      const actSnap = await db.collection(activityCol).where('categoryId', '==', categoryId).get();
      const implicitUids = new Set<string>();
      for (const docSnap of actSnap.docs) {
        const uid = docSnap.data()?.[activityOwnerKey];
        if (typeof uid === 'string') implicitUids.add(uid);
      }

      const matched: StoredParticipantRecord[] = [];
      for (const d of snap.docs) {
        const data = d.data() as Record<string, unknown>;
        const uid = String(data.uid || d.id);
        if (uid === excludeUid) continue;
        if (data.emailNotificationsEnabled === false) continue;

        const dealing = Array.isArray(data.dealingCategories)
          ? (data.dealingCategories.filter((x) => typeof x === 'string') as string[])
          : [];

        const explicitMatch =
          dealing.length > 0 &&
          (dealing.includes(categoryId) ||
            dealing.some((c) => c.trim().toLowerCase() === categoryName.trim().toLowerCase()));
        const implicitMatch = dealing.length === 0 && implicitUids.has(uid);

        if (!explicitMatch && !implicitMatch) continue;

        matched.push({
          uid,
          email: String(data.email || ''),
          role: recipientRole,
          status: String(data.status || 'Active'),
          city: typeof data.city === 'string' ? data.city : undefined,
          state: typeof data.state === 'string' ? data.state : undefined,
          dealingCategories: dealing,
          emailNotificationsEnabled:
            typeof data.emailNotificationsEnabled === 'boolean' ? data.emailNotificationsEnabled : true,
        });
      }
      return matched;
    },

    async getDeliveryLog(notificationId: string): Promise<StoredEmailDeliveryLog | null> {
      const snap = await db.collection('email_delivery_logs').doc(notificationId).get();
      if (!snap.exists) return null;
      const d = snap.data() as Record<string, unknown>;
      const toDate = (v: unknown) =>
        v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date();
      return {
        notificationId: String(d.notificationId || snap.id),
        listingId: String(d.listingId || ''),
        recipientUserId: String(d.recipientUserId || ''),
        recipientEmail: String(d.recipientEmail || ''),
        recipientRole: (d.recipientRole === 'buyer' ? 'buyer' : 'seller'),
        categoryId: String(d.categoryId || ''),
        category: String(d.category || ''),
        notificationType:
          d.notificationType === 'buyer_requirement' ? 'buyer_requirement' : 'seller_listing',
        subject: String(d.subject || ''),
        status: (d.status === 'sent' || d.status === 'failed' ? d.status : 'pending'),
        attemptCount: Number(d.attemptCount || 0),
        provider: (d.provider as EmailProviderName) || 'none',
        providerMessageId: typeof d.providerMessageId === 'string' ? d.providerMessageId : undefined,
        providerResponse: typeof d.providerResponse === 'string' ? d.providerResponse : undefined,
        errorMessage: typeof d.errorMessage === 'string' ? d.errorMessage : undefined,
        createdAt: toDate(d.createdAt),
        sentAt: d.sentAt ? toDate(d.sentAt) : undefined,
        lastAttemptAt: toDate(d.lastAttemptAt),
      };
    },

    async listFailedDeliveryLogs(notificationId?: string, maxAttempts = 5): Promise<StoredEmailDeliveryLog[]> {
      if (notificationId) {
        const single = await this.getDeliveryLog(notificationId);
        return single && single.status === 'failed' ? [single] : [];
      }
      const snap = await db.collection('email_delivery_logs').where('status', '==', 'failed').get();
      const logs: StoredEmailDeliveryLog[] = [];
      for (const docSnap of snap.docs) {
        const d = docSnap.data() as Record<string, unknown>;
        const attempts = Number(d.attemptCount || 0);
        if (attempts >= maxAttempts) continue;
        const toDate = (v: unknown) =>
          v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date();
        logs.push({
          notificationId: String(d.notificationId || docSnap.id),
          listingId: String(d.listingId || ''),
          recipientUserId: String(d.recipientUserId || ''),
          recipientEmail: String(d.recipientEmail || ''),
          recipientRole: d.recipientRole === 'buyer' ? 'buyer' : 'seller',
          categoryId: String(d.categoryId || ''),
          category: String(d.category || ''),
          notificationType:
            d.notificationType === 'buyer_requirement' ? 'buyer_requirement' : 'seller_listing',
          subject: String(d.subject || ''),
          status: 'failed',
          attemptCount: attempts,
          provider: (d.provider as EmailProviderName) || 'none',
          providerMessageId: typeof d.providerMessageId === 'string' ? d.providerMessageId : undefined,
          providerResponse: typeof d.providerResponse === 'string' ? d.providerResponse : undefined,
          errorMessage: typeof d.errorMessage === 'string' ? d.errorMessage : undefined,
          createdAt: toDate(d.createdAt),
          sentAt: d.sentAt ? toDate(d.sentAt) : undefined,
          lastAttemptAt: toDate(d.lastAttemptAt),
        });
      }
      return logs;
    },

    async upsertDeliveryLog(log: StoredEmailDeliveryLog): Promise<void> {
      const payload: Record<string, unknown> = {
        notificationId: log.notificationId,
        listingId: log.listingId,
        recipientUserId: log.recipientUserId,
        recipientEmail: log.recipientEmail,
        recipientRole: log.recipientRole,
        categoryId: log.categoryId,
        category: log.category,
        notificationType: log.notificationType,
        subject: log.subject,
        status: log.status,
        attemptCount: log.attemptCount,
        provider: log.provider,
        createdAt: Timestamp.fromDate(log.createdAt),
        lastAttemptAt: Timestamp.fromDate(log.lastAttemptAt),
      };
      if (log.providerMessageId !== undefined) payload.providerMessageId = log.providerMessageId.slice(0, 200);
      if (log.providerResponse !== undefined) payload.providerResponse = log.providerResponse.slice(0, 400);
      if (log.errorMessage !== undefined) payload.errorMessage = log.errorMessage.slice(0, 500);
      if (log.sentAt !== undefined) payload.sentAt = Timestamp.fromDate(log.sentAt);
      await db.collection('email_delivery_logs').doc(log.notificationId).set(payload, { merge: true });
    },

    async upsertUserNotification(notif: StoredUserNotification): Promise<void> {
      const payload: Record<string, unknown> = {
        id: notif.id,
        notificationId: notif.notificationId,
        recipientUid: notif.recipientUid,
        targetRole: notif.targetRole,
        category: notif.category,
        title: notif.title.slice(0, 180),
        message: notif.message.slice(0, 800),
        dedupeKey: notif.dedupeKey.slice(0, 180),
        listingId: notif.listingId,
        categoryId: notif.categoryId,
        categoryName: notif.categoryName.slice(0, 100),
        notificationType: notif.notificationType,
        emailStatus: notif.emailStatus,
        read: notif.read,
        createdAt: Timestamp.fromDate(notif.createdAt),
      };
      if (notif.sentAt !== undefined) payload.sentAt = Timestamp.fromDate(notif.sentAt);
      if (notif.errorMessage !== undefined) payload.errorMessage = notif.errorMessage.slice(0, 500);
      await db.collection('notifications').doc(notif.id).set(payload, { merge: true });
    },
  };
}

export interface DispatchParams {
  callerUid: string;
  callerEmail?: string;
  listingId: string;
  notificationType: NotificationDirection;
  appBaseUrl: string;
}

export interface DispatchSummary {
  listingId: string;
  notificationType: NotificationDirection;
  category: string;
  totalMatched: number;
  dispatchedCount: number;
  failedCount: number;
  skippedDuplicateCount: number;
}

export async function dispatchCategoryListingNotifications(
  store: NotificationStore,
  emailSender: EmailSender,
  params: DispatchParams
): Promise<DispatchSummary> {
  if (!params.listingId || !/^[a-zA-Z0-9_-]{1,128}$/.test(params.listingId)) {
    const err = new Error('Invalid listing reference ID.');
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  const listing = await store.getListing(params.listingId, params.notificationType);
  if (!listing) {
    const err = new Error('Listing or requirement not found.');
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }

  const publishedStatuses =
    params.notificationType === 'buyer_requirement'
      ? ['Active', 'Partially Matched']
      : ['Active', 'Partially Allocated'];
  if (!publishedStatuses.includes(listing.status)) {
    const err = new Error(
      `Listing ${listing.id} has status "${listing.status}" and is not published for recipient notifications.`
    );
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  const ownerRole: 'buyer' | 'seller' =
    params.notificationType === 'buyer_requirement' ? 'buyer' : 'seller';
  const isStaff = await store.isStaffUser(params.callerUid, params.callerEmail);
  const isOwner = params.callerUid === listing.ownerUid;

  if (!isOwner && !isStaff) {
    const err = new Error('Forbidden: only the listing owner or authorised EPR Bazaar staff can trigger notifications.');
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }

  if (isOwner && !isStaff) {
    const activeAccount = await store.isActiveUserAccount(params.callerUid, ownerRole);
    if (!activeAccount) {
      const err = new Error('Forbidden: participant account is not active.');
      (err as Error & { statusCode?: number }).statusCode = 403;
      throw err;
    }
  }

  const recipientRole: 'buyer' | 'seller' =
    params.notificationType === 'buyer_requirement' ? 'seller' : 'buyer';
  const recipients = await store.findMatchingRecipients(
    recipientRole,
    listing.categoryId,
    listing.categoryName,
    listing.ownerUid
  );

  const location = await store.getParticipantLocation(listing.ownerUid, ownerRole);
  const nowIso = new Date().toISOString();
  const { subject, html, text } = buildListingEmailContent({
    notificationType: params.notificationType,
    listingId: listing.id,
    category: listing.categoryName,
    subcategory: listing.subcategory,
    financialYear: listing.financialYear,
    quantity: listing.quantity,
    unit: listing.unit,
    ratePerUnit: listing.rate,
    location,
    timestampIso: nowIso,
    appBaseUrl: params.appBaseUrl,
  });

  let dispatchedCount = 0;
  let failedCount = 0;
  let skippedDuplicateCount = 0;

  for (const recipient of recipients) {
    const notificationId = makeSafeNotificationId(params.notificationType, listing.id, recipient.uid);
    const existingLog = await store.getDeliveryLog(notificationId);
    if (existingLog && existingLog.status === 'sent') {
      skippedDuplicateCount += 1;
      continue;
    }

    const now = new Date();
    const createdAt = existingLog?.createdAt || now;
    const attemptCount = (existingLog?.attemptCount || 0) + 1;

    let deliveryResult;
    if (!isValidEmailAddress(recipient.email)) {
      deliveryResult = {
        ok: false,
        provider: emailSender.getProviderName(),
        errorMessage: `Invalid registered email address for ${recipientRole} ${recipient.uid}.`,
      };
    } else {
      deliveryResult = await emailSender.sendEmail({
        to: recipient.email,
        subject,
        html,
        text,
      });
    }

    const finalStatus: 'sent' | 'failed' = deliveryResult.ok ? 'sent' : 'failed';
    const sentAt = deliveryResult.ok ? now : undefined;

    await store.upsertDeliveryLog({
      notificationId,
      listingId: listing.id,
      recipientUserId: recipient.uid,
      recipientEmail: recipient.email,
      recipientRole,
      categoryId: listing.categoryId,
      category: listing.categoryName,
      notificationType: params.notificationType,
      subject,
      status: finalStatus,
      attemptCount,
      provider: deliveryResult.provider,
      providerMessageId: deliveryResult.providerMessageId,
      providerResponse: deliveryResult.providerResponse,
      errorMessage: deliveryResult.errorMessage,
      createdAt,
      sentAt,
      lastAttemptAt: now,
    });

    const notifCategory =
      params.notificationType === 'buyer_requirement' ? 'Requirement Updates' : 'Listing Updates';
    const listingVerb =
      params.notificationType === 'buyer_requirement' ? 'Buying Requirement' : 'Selling Offer';
    const rateFormatted = `₹${listing.rate.toLocaleString('en-IN')}/${listing.unit}`;

    await store.upsertUserNotification({
      id: notificationId,
      notificationId,
      recipientUid: recipient.uid,
      targetRole: recipientRole,
      category: notifCategory,
      title: subject,
      message: `${listingVerb} ${listing.id}: ${listing.quantity.toLocaleString('en-IN')} ${listing.unit} of ${listing.categoryName} (${listing.subcategory}) at ${rateFormatted} from ${location}.`,
      dedupeKey: notificationId,
      listingId: listing.id,
      categoryId: listing.categoryId,
      categoryName: listing.categoryName,
      notificationType: params.notificationType,
      emailStatus: finalStatus,
      sentAt,
      errorMessage: deliveryResult.errorMessage,
      read: false,
      createdAt,
    });

    if (deliveryResult.ok) {
      dispatchedCount += 1;
    } else {
      failedCount += 1;
    }
  }

  return {
    listingId: listing.id,
    notificationType: params.notificationType,
    category: listing.categoryName,
    totalMatched: recipients.length,
    dispatchedCount,
    failedCount,
    skippedDuplicateCount,
  };
}

export interface RetrySummary {
  retriedCount: number;
  sentCount: number;
  failedCount: number;
}

export async function retryFailedEmailNotifications(
  store: NotificationStore,
  emailSender: EmailSender,
  params: {
    callerUid?: string;
    callerEmail?: string;
    systemBypassAuth?: boolean;
    notificationId?: string;
    appBaseUrl: string;
    maxAttempts?: number;
  }
): Promise<RetrySummary> {
  if (!params.systemBypassAuth) {
    const isStaff = await store.isStaffUser(params.callerUid || '', params.callerEmail);
    if (!isStaff) {
      const err = new Error('Forbidden: only authorised staff can retry failed email deliveries.');
      (err as Error & { statusCode?: number }).statusCode = 403;
      throw err;
    }
  }

  const failedLogs = await store.listFailedDeliveryLogs(params.notificationId, params.maxAttempts ?? 5);
  let retriedCount = 0;
  let sentCount = 0;
  let failedCount = 0;

  for (const log of failedLogs) {
    if (!isValidEmailAddress(log.recipientEmail)) {
      continue;
    }

    const listing = await store.getListing(log.listingId, log.notificationType);
    if (!listing) continue;

    const ownerRole: 'buyer' | 'seller' =
      log.notificationType === 'buyer_requirement' ? 'buyer' : 'seller';
    const location = await store.getParticipantLocation(listing.ownerUid, ownerRole);

    const { subject, html, text } = buildListingEmailContent({
      notificationType: log.notificationType,
      listingId: listing.id,
      category: listing.categoryName,
      subcategory: listing.subcategory,
      financialYear: listing.financialYear,
      quantity: listing.quantity,
      unit: listing.unit,
      ratePerUnit: listing.rate,
      location,
      timestampIso: log.createdAt.toISOString(),
      appBaseUrl: params.appBaseUrl,
    });

    retriedCount += 1;
    const now = new Date();
    const res = await emailSender.sendEmail({
      to: log.recipientEmail,
      subject,
      html,
      text,
    });

    const finalStatus: 'sent' | 'failed' = res.ok ? 'sent' : 'failed';
    const sentAt = res.ok ? now : undefined;

    await store.upsertDeliveryLog({
      ...log,
      status: finalStatus,
      attemptCount: log.attemptCount + 1,
      provider: res.provider,
      providerMessageId: res.providerMessageId,
      providerResponse: res.providerResponse,
      errorMessage: res.errorMessage,
      sentAt,
      lastAttemptAt: now,
    });

    const notifCategory =
      log.notificationType === 'buyer_requirement' ? 'Requirement Updates' : 'Listing Updates';
    const listingVerb =
      log.notificationType === 'buyer_requirement' ? 'Buying Requirement' : 'Selling Offer';
    const rateFormatted = `₹${listing.rate.toLocaleString('en-IN')}/${listing.unit}`;

    await store.upsertUserNotification({
      id: log.notificationId,
      notificationId: log.notificationId,
      recipientUid: log.recipientUserId,
      targetRole: log.recipientRole,
      category: notifCategory,
      title: subject,
      message: `${listingVerb} ${listing.id}: ${listing.quantity.toLocaleString('en-IN')} ${listing.unit} of ${listing.categoryName} (${listing.subcategory}) at ${rateFormatted} from ${location}.`,
      dedupeKey: log.notificationId,
      listingId: listing.id,
      categoryId: listing.categoryId,
      categoryName: listing.categoryName,
      notificationType: log.notificationType,
      emailStatus: finalStatus,
      sentAt,
      errorMessage: res.errorMessage,
      read: false,
      createdAt: log.createdAt,
    });

    if (res.ok) sentCount += 1;
    else failedCount += 1;
  }

  return { retriedCount, sentCount, failedCount };
}
