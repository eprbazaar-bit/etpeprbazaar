import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, storage } from '../firebase';
import {
  BuyerRequirement,
  DocumentRecord,
  EPRCategory,
  EPRSubcategory,
  MarketplaceOffer,
  MarketplaceOrder,
  MatchOpportunity,
  OrderStatus,
  PlatformSettingsRecord,
  SellerListing,
  UserRole,
} from '../types';

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${Date.now().toString().slice(-6)}-${rand}`;
}

export async function writeAuditLog(
  actorUid: string,
  actorEmail: string,
  role: string,
  action: string,
  target: string,
  details: string
) {
  const id = makeId('AUD');
  const path = `audit_logs/${id}`;
  try {
    await setDoc(doc(db, 'audit_logs', id), {
      id,
      actorUid,
      actorEmail,
      role,
      action: action.slice(0, 120),
      target: target.slice(0, 120),
      details: details.slice(0, 600),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createNotificationIfUnique(
  recipientUid: string,
  targetRole: Exclude<UserRole, 'public'>,
  category:
    | 'Requirement Updates'
    | 'Listing Updates'
    | 'Matching Notifications'
    | 'Offers'
    | 'Negotiations'
    | 'Orders'
    | 'Payments'
    | 'Documents'
    | 'Account Updates',
  title: string,
  message: string,
  dedupeKey: string
) {
  const safeKey = dedupeKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 110);
  const id = `NTF-${safeKey}`;
  const path = `notifications/${id}`;
  try {
    const existing = await getDoc(doc(db, 'notifications', id));
    if (existing.exists()) return;
    await setDoc(doc(db, 'notifications', id), {
      id,
      recipientUid,
      targetRole,
      category,
      title: title.slice(0, 180),
      message: message.slice(0, 800),
      dedupeKey: safeKey,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function completeCompanyOnboarding(params: {
  uid: string;
  email: string;
  displayName: string;
  role: 'buyer' | 'seller';
  companyName: string;
  contactPerson: string;
  mobile: string;
  gstin: string;
  cin?: string;
  eprRegNo: string;
  city: string;
  state: string;
  recyclerType?: string;
  dealingCategories?: string[];
  emailNotificationsEnabled?: boolean;
}) {
  const companyId = `CMP-${params.uid.slice(0, 16)}`;
  const batch = writeBatch(db);
  const cleanDealingCategories = Array.from(
    new Set(
      (params.dealingCategories || [])
        .map((c) => c.trim())
        .filter(Boolean)
    )
  ).slice(0, 30);
  const emailAlertsEnabled = params.emailNotificationsEnabled ?? true;

  batch.set(doc(db, 'companies', companyId), {
    id: companyId,
    ownerUid: params.uid,
    companyName: params.companyName.trim().slice(0, 180),
    gstin: params.gstin.trim().toUpperCase().slice(0, 15),
    cin: (params.cin || '').trim().slice(0, 40),
    eprRegNo: params.eprRegNo.trim().slice(0, 64),
    city: params.city.trim().slice(0, 80),
    state: params.state.trim().slice(0, 80),
    createdAt: serverTimestamp(),
  });

  if (params.role === 'buyer') {
    batch.set(doc(db, 'buyers', params.uid), {
      uid: params.uid,
      companyId,
      companyName: params.companyName.trim().slice(0, 180),
      contactPerson: params.contactPerson.trim().slice(0, 120),
      email: params.email,
      mobile: params.mobile.trim().slice(0, 20),
      gstin: params.gstin.trim().toUpperCase().slice(0, 15),
      cin: (params.cin || '').trim().slice(0, 40),
      eprRegNo: params.eprRegNo.trim().slice(0, 64),
      city: params.city.trim().slice(0, 80),
      state: params.state.trim().slice(0, 80),
      dealingCategories: cleanDealingCategories,
      emailNotificationsEnabled: emailAlertsEnabled,
      verification: 'Pending Review',
      status: 'Active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.set(doc(db, 'sellers', params.uid), {
      uid: params.uid,
      companyId,
      companyName: params.companyName.trim().slice(0, 180),
      contactPerson: params.contactPerson.trim().slice(0, 120),
      email: params.email,
      mobile: params.mobile.trim().slice(0, 20),
      gstin: params.gstin.trim().toUpperCase().slice(0, 15),
      cin: (params.cin || '').trim().slice(0, 40),
      eprRegNo: params.eprRegNo.trim().slice(0, 64),
      recyclerType: (params.recyclerType || 'Authorized EPR Recycler').trim().slice(0, 120),
      city: params.city.trim().slice(0, 80),
      state: params.state.trim().slice(0, 80),
      dealingCategories: cleanDealingCategories,
      emailNotificationsEnabled: emailAlertsEnabled,
      verification: 'Pending Review',
      status: 'Active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(doc(db, 'users', params.uid), {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName || params.contactPerson,
    role: params.role,
    companyId,
    profileCompleted: true,
    status: 'Active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${params.uid}`);
  }
}

export async function uploadProtectedDocument(params: {
  ownerUid: string;
  ownerRole: 'buyer' | 'seller' | 'admin';
  category: DocumentRecord['category'];
  file: File;
  relatedId?: string;
}): Promise<string> {
  const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
  if (!allowedTypes.includes(params.file.type)) {
    throw new Error('Only PDF, PNG, or JPEG documents are allowed.');
  }
  if (params.file.size <= 0 || params.file.size > 10 * 1024 * 1024) {
    throw new Error('File size must be between 1 byte and 10 MB.');
  }

  const docId = makeId('DOC');
  const cleanName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 140);
  const storagePath = `documents/${params.ownerUid}/${docId}_${cleanName}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, params.file, { contentType: params.file.type });
  const downloadUrl = await getDownloadURL(storageRef);

  const path = `documents/${docId}`;
  try {
    await setDoc(doc(db, 'documents', docId), {
      id: docId,
      ownerUid: params.ownerUid,
      ownerRole: params.ownerRole,
      category: params.category,
      fileName: cleanName,
      storagePath,
      downloadUrl,
      contentType: params.file.type,
      fileSizeBytes: params.file.size,
      verificationStatus: 'Pending Review',
      ...(params.relatedId ? { relatedId: params.relatedId } : {}),
      createdAt: serverTimestamp(),
    });
    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function runMatchingForRequirement(req: BuyerRequirement, tolerancePct = 10) {
  try {
    const q = query(
      collection(db, 'seller_listings'),
      where('categoryId', '==', req.categoryId),
      where('status', 'in', ['Active', 'Partially Allocated'])
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const listing = d.data() as SellerListing;
      if (
        listing.subcategory !== req.subcategory ||
        listing.financialYear !== req.financialYear ||
        listing.remainingQty <= 0
      ) {
        continue;
      }
      const maxAllowedAsk = req.maxBuyingRate * (1 + tolerancePct / 100);
      if (listing.askingRate > maxAllowedAsk) continue;

      const matchId = `MTC-${req.id}-${listing.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
      const matchRef = doc(db, 'matches', matchId);
      const existingMatch = await getDoc(matchRef);
      if (existingMatch.exists()) continue;

      const matchQty = Math.min(req.remainingQty, listing.remainingQty);
      const indicativeRate = Math.round((req.maxBuyingRate + listing.askingRate) / 2);

      await setDoc(matchRef, {
        id: matchId,
        matchKey: `${req.id}__${listing.id}`,
        requirementId: req.id,
        listingId: listing.id,
        buyerUid: req.buyerUid,
        sellerUid: listing.sellerUid,
        categoryId: req.categoryId,
        categoryName: req.categoryName,
        subcategory: req.subcategory,
        financialYear: req.financialYear,
        matchingQty: matchQty,
        unit: req.unit,
        buyerTargetRate: req.maxBuyingRate,
        sellerAskingRate: listing.askingRate,
        indicativeRate,
        status: 'New Match',
        buyerAgreed: false,
        sellerAgreed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await createNotificationIfUnique(
        req.buyerUid,
        'buyer',
        'Matching Notifications',
        `Matching Opportunity Identified (${matchId})`,
        `A matching opportunity has been identified for ${req.categoryName} (${matchQty} ${req.unit}). EPR Bazaar will coordinate the negotiation and share suitable offers with you.`,
        `match_${matchId}_buyer`
      );
      await createNotificationIfUnique(
        listing.sellerUid,
        'seller',
        'Matching Notifications',
        `Matching Buyer Requirement (${matchId})`,
        `A buyer requirement matches your listed ${listing.categoryName} credits (${matchQty} ${listing.unit}). EPR Bazaar will coordinate the negotiation and communicate the offer.`,
        `match_${matchId}_seller`
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'seller_listings');
  }
}

export async function runMatchingForListing(listing: SellerListing, tolerancePct = 10) {
  try {
    const q = query(
      collection(db, 'buyer_requirements'),
      where('categoryId', '==', listing.categoryId)
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const req = d.data() as BuyerRequirement;
      if (
        (req.status !== 'Active' && req.status !== 'Partially Matched') ||
        req.subcategory !== listing.subcategory ||
        req.financialYear !== listing.financialYear ||
        req.remainingQty <= 0
      ) {
        continue;
      }
      const maxAllowedAsk = req.maxBuyingRate * (1 + tolerancePct / 100);
      if (listing.askingRate > maxAllowedAsk) continue;

      const matchId = `MTC-${req.id}-${listing.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
      const matchRef = doc(db, 'matches', matchId);
      const existingMatch = await getDoc(matchRef);
      if (existingMatch.exists()) continue;

      const matchQty = Math.min(req.remainingQty, listing.remainingQty);
      const indicativeRate = Math.round((req.maxBuyingRate + listing.askingRate) / 2);

      await setDoc(matchRef, {
        id: matchId,
        matchKey: `${req.id}__${listing.id}`,
        requirementId: req.id,
        listingId: listing.id,
        buyerUid: req.buyerUid,
        sellerUid: listing.sellerUid,
        categoryId: listing.categoryId,
        categoryName: listing.categoryName,
        subcategory: listing.subcategory,
        financialYear: listing.financialYear,
        matchingQty: matchQty,
        unit: listing.unit,
        buyerTargetRate: req.maxBuyingRate,
        sellerAskingRate: listing.askingRate,
        indicativeRate,
        status: 'New Match',
        buyerAgreed: false,
        sellerAgreed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await createNotificationIfUnique(
        req.buyerUid,
        'buyer',
        'Matching Notifications',
        `Matching Opportunity Identified (${matchId})`,
        `A matching opportunity has been identified for ${req.categoryName} (${matchQty} ${req.unit}). EPR Bazaar will coordinate the negotiation and share suitable offers with you.`,
        `match_${matchId}_buyer`
      );
      await createNotificationIfUnique(
        listing.sellerUid,
        'seller',
        'Matching Notifications',
        `Matching Buyer Requirement (${matchId})`,
        `A buyer requirement matches your listed ${listing.categoryName} credits (${matchQty} ${listing.unit}). EPR Bazaar will coordinate the negotiation and communicate the offer.`,
        `match_${matchId}_seller`
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'buyer_requirements');
  }
}

export async function recomputeMarketRate(category: EPRCategory, financialYear: string) {
  const rateId = `${category.id}_${financialYear.replace(/[^a-zA-Z0-9]/g, '')}`;
  try {
    const listingsSnap = await getDocs(
      query(
        collection(db, 'seller_listings'),
        where('categoryId', '==', category.id),
        where('status', 'in', ['Active', 'Partially Allocated'])
      )
    );
    const matchingListings = listingsSnap.docs
      .map((d) => d.data() as SellerListing)
      .filter((l) => l.financialYear === financialYear);

    const txSnap = await getDocs(
      query(collection(db, 'transactions'), where('categoryId', '==', category.id))
    );
    const matchingTxs = txSnap.docs
      .map((d) => d.data() as { financialYear: string; tradedRate: number })
      .filter((t) => t.financialYear === financialYear);

    const rates = matchingListings.map((l) => l.askingRate);
    const availQty = matchingListings.reduce((sum, l) => sum + l.remainingQty, 0);
    const lowestAskingRate = rates.length > 0 ? Math.min(...rates) : undefined;
    const highestAskingRate = rates.length > 0 ? Math.max(...rates) : undefined;
    const indicativeRate =
      lowestAskingRate !== undefined && highestAskingRate !== undefined
        ? Math.round((lowestAskingRate + highestAskingRate) / 2)
        : undefined;
    const lastTradedRate =
      matchingTxs.length > 0 ? matchingTxs[matchingTxs.length - 1].tradedRate : undefined;

    await setDoc(doc(db, 'market_rates', rateId), {
      id: rateId,
      categoryId: category.id,
      categoryName: category.name,
      financialYear,
      unit: category.unit,
      ...(lowestAskingRate !== undefined ? { lowestAskingRate } : {}),
      ...(highestAskingRate !== undefined ? { highestAskingRate } : {}),
      ...(indicativeRate !== undefined ? { indicativeRate } : {}),
      ...(lastTradedRate !== undefined ? { lastTradedRate } : {}),
      availableQty: availQty,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `market_rates/${rateId}`);
  }
}

export async function createBuyerRequirementDoc(
  params: {
    buyerUid: string;
    category: EPRCategory;
    subcategory: string;
    financialYear: string;
    requiredQty: number;
    maxBuyingRate: number;
    requiredDate?: string;
    additionalNotes?: string;
    asDraft?: boolean;
  },
  tolerancePct = 10
): Promise<string> {
  const id = makeId('REQ');
  const status = params.asDraft ? 'Draft' : 'Active';
  const payload = {
    id,
    buyerUid: params.buyerUid,
    categoryId: params.category.id,
    categoryName: params.category.name,
    subcategory: params.subcategory,
    financialYear: params.financialYear,
    requiredQty: params.requiredQty,
    matchedQty: 0,
    remainingQty: params.requiredQty,
    unit: params.category.unit,
    maxBuyingRate: params.maxBuyingRate,
    requiredDate: params.requiredDate || '',
    additionalNotes: (params.additionalNotes || '').slice(0, 1000),
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'buyer_requirements', id), payload);
    if (!params.asDraft) {
      await runMatchingForRequirement(
        {
          ...payload,
          createdAt: null,
          updatedAt: null,
        } as BuyerRequirement,
        tolerancePct
      );
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `buyer_requirements/${id}`);
  }
}

export async function createSellerListingDoc(
  params: {
    sellerUid: string;
    category: EPRCategory;
    subcategory: string;
    financialYear: string;
    listedQty: number;
    askingRate: number;
    certificateRef?: string;
    additionalInfo?: string;
    asDraft?: boolean;
    isVerifiedSeller?: boolean;
  },
  tolerancePct = 10
): Promise<{ id: string; status: SellerListing['status'] }> {
  const id = makeId('LST');
  const status: SellerListing['status'] = params.asDraft
    ? 'Draft'
    : params.isVerifiedSeller
      ? 'Active'
      : 'Pending Approval';
  const payload = {
    id,
    sellerUid: params.sellerUid,
    categoryId: params.category.id,
    categoryName: params.category.name,
    subcategory: params.subcategory,
    financialYear: params.financialYear,
    listedQty: params.listedQty,
    allocatedQty: 0,
    remainingQty: params.listedQty,
    unit: params.category.unit,
    askingRate: params.askingRate,
    certificateRef: (params.certificateRef || '').slice(0, 80),
    additionalInfo: (params.additionalInfo || '').slice(0, 1000),
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'seller_listings', id), payload);
    if (status === 'Active') {
      await runMatchingForListing(
        {
          ...payload,
          createdAt: null,
          updatedAt: null,
        } as SellerListing,
        tolerancePct
      );
    }
    return { id, status };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `seller_listings/${id}`);
  }
}

export async function facilitatorSendOfferDoc(params: {
  match: MatchOpportunity;
  facilitatorUid: string;
  targetParty: 'buyer' | 'seller';
  rate: number;
  quantity: number;
  expiryDate: string;
  message: string;
  gstPercent: number;
}): Promise<string> {
  const offerId = makeId('OFR');
  const negId = makeId('NEG');
  const partyUid = params.targetParty === 'buyer' ? params.match.buyerUid : params.match.sellerUid;
  const batch = writeBatch(db);

  batch.set(doc(db, 'offers', offerId), {
    id: offerId,
    matchId: params.match.id,
    targetParty: params.targetParty,
    partyUid,
    categoryName: params.match.categoryName,
    subcategory: params.match.subcategory,
    financialYear: params.match.financialYear,
    quantity: params.quantity,
    unit: params.match.unit,
    offeredRate: params.rate,
    gstPercent: params.gstPercent,
    expiryDate: params.expiryDate,
    facilitatorMessage: params.message.slice(0, 1000),
    status: 'Pending Response',
    createdByUid: params.facilitatorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'negotiations', negId), {
    id: negId,
    matchId: params.match.id,
    buyerUid: params.match.buyerUid,
    sellerUid: params.match.sellerUid,
    actor: 'Facilitator',
    actorUid: params.facilitatorUid,
    actionType: 'Offer Sent',
    rate: params.rate,
    quantity: params.quantity,
    message: `Facilitated offer ${offerId} sent to ${params.targetParty}: ${params.message}`.slice(0, 1000),
    visibleToBuyer: params.targetParty === 'buyer',
    visibleToSeller: params.targetParty === 'seller',
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'matches', params.match.id), {
    status: 'Offer Shared',
    assignedFacilitatorUid: params.facilitatorUid,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    await createNotificationIfUnique(
      partyUid,
      params.targetParty,
      'Offers',
      `New Facilitated Offer (${offerId})`,
      `EPR Bazaar has shared an offer for ${params.quantity} ${params.match.unit} ${params.match.categoryName} at ₹${params.rate.toLocaleString('en-IN')}/${params.match.unit}.`,
      `offer_${offerId}`
    );
    return offerId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `offers/${offerId}`);
  }
}

export async function respondToOfferDoc(params: {
  offer: MarketplaceOffer;
  match: MatchOpportunity;
  actorUid: string;
  action: 'accept' | 'reject' | 'counter';
  counterRate?: number;
  counterQty?: number;
  message?: string;
}) {
  const newStatus =
    params.action === 'accept' ? 'Accepted' : params.action === 'reject' ? 'Rejected' : 'Countered';
  const actor = params.offer.targetParty === 'buyer' ? 'Buyer' : 'Seller';
  const actionType =
    params.action === 'accept' ? 'Accepted' : params.action === 'reject' ? 'Rejected' : 'Counteroffer';
  const negId = makeId('NEG');

  const batch = writeBatch(db);
  batch.update(doc(db, 'offers', params.offer.id), {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'negotiations', negId), {
    id: negId,
    matchId: params.match.id,
    buyerUid: params.match.buyerUid,
    sellerUid: params.match.sellerUid,
    actor,
    actorUid: params.actorUid,
    actionType,
    rate: params.counterRate ?? params.offer.offeredRate,
    quantity: params.counterQty ?? params.offer.quantity,
    message: (
      params.message ||
      `${actor} marked offer ${params.offer.id} as ${newStatus} at ₹${(params.counterRate ?? params.offer.offeredRate).toLocaleString('en-IN')}/${params.offer.unit}.`
    ).slice(0, 1000),
    visibleToBuyer: actor === 'Buyer',
    visibleToSeller: actor === 'Seller',
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'matches', params.match.id), {
    status: 'Negotiation In Progress',
    ...(params.offer.targetParty === 'buyer' && params.action === 'accept' ? { buyerAgreed: true } : {}),
    ...(params.offer.targetParty === 'seller' && params.action === 'accept' ? { sellerAgreed: true } : {}),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `offers/${params.offer.id}`);
  }
}

export async function confirmMatchAndCreateOrderDoc(params: {
  match: MatchOpportunity;
  facilitatorUid: string;
  agreedRate: number;
  settings: PlatformSettingsRecord;
}): Promise<string> {
  const orderId = makeId('ORD');
  const invoiceId = makeId('INV');
  const negId = makeId('NEG');
  const basicAmount = Math.round(params.match.matchingQty * params.agreedRate);
  const gstAmount = Math.round((basicAmount * params.settings.gstPercent) / 100);
  const totalAmount = basicAmount + gstAmount;
  const brokerageAmount = Math.round((basicAmount * params.settings.defaultBrokeragePercent) / 100);
  const invoiceNumber = `INV-NYN-${new Date().getFullYear().toString().slice(-2)}-${Date.now().toString().slice(-4)}`;

  const batch = writeBatch(db);
  batch.set(doc(db, 'orders', orderId), {
    id: orderId,
    matchId: params.match.id,
    buyerUid: params.match.buyerUid,
    sellerUid: params.match.sellerUid,
    categoryId: params.match.categoryId,
    categoryName: params.match.categoryName,
    subcategory: params.match.subcategory,
    financialYear: params.match.financialYear,
    quantity: params.match.matchingQty,
    unit: params.match.unit,
    agreedRate: params.agreedRate,
    basicAmount,
    gstAmount,
    totalAmount,
    brokerageAmount,
    paymentStatus: 'Unpaid',
    transferStatus: 'Not Started',
    orderStatus: 'Deal Confirmed',
    invoiceNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'invoices', invoiceId), {
    id: invoiceId,
    invoiceNumber,
    orderId,
    buyerUid: params.match.buyerUid,
    sellerUid: params.match.sellerUid,
    basicAmount,
    gstAmount,
    totalAmount,
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'matches', params.match.id), {
    status: 'Order Created',
    buyerAgreed: true,
    sellerAgreed: true,
    finalAgreedRate: params.agreedRate,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'negotiations', negId), {
    id: negId,
    matchId: params.match.id,
    buyerUid: params.match.buyerUid,
    sellerUid: params.match.sellerUid,
    actor: 'Facilitator',
    actorUid: params.facilitatorUid,
    actionType: 'Accepted',
    rate: params.agreedRate,
    quantity: params.match.matchingQty,
    message: `Both parties confirmed agreement at ₹${params.agreedRate.toLocaleString('en-IN')}/${params.match.unit}. Order ${orderId} generated.`,
    visibleToBuyer: true,
    visibleToSeller: true,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    await createNotificationIfUnique(
      params.match.buyerUid,
      'buyer',
      'Orders',
      `Order Confirmed (${orderId})`,
      `Your EPR order ${orderId} (${params.match.matchingQty} ${params.match.unit} ${params.match.categoryName}) is confirmed at ₹${params.agreedRate.toLocaleString('en-IN')}/${params.match.unit}.`,
      `order_${orderId}_buyer`
    );
    await createNotificationIfUnique(
      params.match.sellerUid,
      'seller',
      'Orders',
      `Order Confirmed (${orderId})`,
      `Your EPR credit allocation ${orderId} (${params.match.matchingQty} ${params.match.unit} ${params.match.categoryName}) is confirmed at ₹${params.agreedRate.toLocaleString('en-IN')}/${params.match.unit}.`,
      `order_${orderId}_seller`
    );
    return orderId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
  }
}

export async function updateOrderStatusDoc(params: {
  order: MarketplaceOrder;
  orderStatus: OrderStatus;
  paymentStatus?: MarketplaceOrder['paymentStatus'];
  transferStatus?: MarketplaceOrder['transferStatus'];
  category?: EPRCategory;
}) {
  try {
    await updateDoc(doc(db, 'orders', params.order.id), {
      orderStatus: params.orderStatus,
      paymentStatus: params.paymentStatus ?? params.order.paymentStatus,
      transferStatus: params.transferStatus ?? params.order.transferStatus,
      updatedAt: serverTimestamp(),
    });

    if (params.orderStatus === 'Transaction Completed') {
      const txId = `TXN-${params.order.id}`;
      const txRef = doc(db, 'transactions', txId);
      const existingTx = await getDoc(txRef);
      if (!existingTx.exists()) {
        await setDoc(txRef, {
          id: txId,
          orderId: params.order.id,
          categoryId: params.order.categoryId,
          categoryName: params.order.categoryName,
          financialYear: params.order.financialYear,
          quantity: params.order.quantity,
          unit: params.order.unit,
          tradedRate: params.order.agreedRate,
          totalValue: params.order.totalAmount,
          completedAt: serverTimestamp(),
        });
      }
      if (params.category) {
        await recomputeMarketRate(params.category, params.order.financialYear);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${params.order.id}`);
  }
}

export async function saveCategoryWithSubcategories(params: {
  id?: string;
  code: string;
  name: string;
  shortName: string;
  description: string;
  unit: 'MT' | 'KL' | 'Units';
  financialYears: string[];
  subcategories: string[];
  active: boolean;
}) {
  const catId = params.id || makeId('CAT');
  const catRef = doc(db, 'categories', catId);
  const existingCat = params.id ? await getDoc(catRef) : null;
  const batch = writeBatch(db);

  const baseFields = {
    id: catId,
    code: params.code.trim().toUpperCase().slice(0, 32),
    name: params.name.trim().slice(0, 100),
    shortName: params.shortName.trim().slice(0, 40),
    description: params.description.trim().slice(0, 500),
    unit: params.unit,
    financialYears: params.financialYears,
    active: params.active,
  };

  if (existingCat?.exists()) {
    batch.update(catRef, baseFields);
  } else {
    batch.set(catRef, {
      ...baseFields,
      createdAt: serverTimestamp(),
    });
  }

  params.subcategories
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((subName, idx) => {
      const subId = `${catId}-SUB-${idx + 1}`;
      batch.set(doc(db, 'subcategories', subId), {
        id: subId,
        categoryId: catId,
        name: subName.slice(0, 120),
        active: true,
        createdAt: serverTimestamp(),
      });
    });

  try {
    await batch.commit();
    return catId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `categories/${catId}`);
  }
}

export interface DispatchEmailResult {
  ok: boolean;
  listingId?: string;
  notificationType?: 'buyer_requirement' | 'seller_listing';
  category?: string;
  totalMatched?: number;
  dispatchedCount?: number;
  failedCount?: number;
  skippedDuplicateCount?: number;
  providerConfigured?: boolean;
  provider?: string;
  error?: string;
}

export async function dispatchCategoryEmailNotificationsApi(
  idToken: string,
  listingId: string,
  notificationType: 'buyer_requirement' | 'seller_listing'
): Promise<DispatchEmailResult> {
  try {
    const resp = await fetch('/api/notifications/dispatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ listingId, notificationType }),
    });
    const data = (await resp.json()) as DispatchEmailResult;
    if (!resp.ok) {
      return {
        ok: false,
        error: data.error || `HTTP ${resp.status}`,
      };
    }
    return data;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to reach notification delivery service.',
    };
  }
}

export interface RetryEmailResult {
  ok: boolean;
  retriedCount?: number;
  sentCount?: number;
  failedCount?: number;
  providerConfigured?: boolean;
  provider?: string;
  error?: string;
}

export async function retryFailedEmailsApi(
  idToken: string,
  notificationId?: string
): Promise<RetryEmailResult> {
  try {
    const resp = await fetch('/api/notifications/retry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(notificationId ? { notificationId } : {}),
    });
    const data = (await resp.json()) as RetryEmailResult;
    if (!resp.ok) {
      return {
        ok: false,
        error: data.error || `Request error (${resp.status})`,
      };
    }
    return data;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to reach notification delivery service.',
    };
  }
}

export async function savePublishedRateDoc(params: {
  id?: string;
  categoryId: string;
  categoryName: string;
  financialYear: string;
  unit: 'MT' | 'KL' | 'Units';
  rate: number;
  trend?: 'Up' | 'Down' | 'Stable';
  published: boolean;
  notes?: string;
  updatedByUid: string;
}) {
  const rateId = params.id || makeId('PRATE');
  const rateRef = doc(db, 'published_rates', rateId);
  try {
    const existingSnap = params.id ? await getDoc(rateRef) : null;
    const payload = {
      id: rateId,
      categoryId: params.categoryId.trim(),
      categoryName: params.categoryName.trim().slice(0, 100),
      financialYear: params.financialYear.trim().slice(0, 20),
      unit: params.unit,
      rate: Number(params.rate),
      ...(params.trend ? { trend: params.trend } : {}),
      published: Boolean(params.published),
      ...(params.notes?.trim() ? { notes: params.notes.trim().slice(0, 300) } : {}),
      updatedByUid: params.updatedByUid,
      updatedAt: serverTimestamp(),
    };
    if (existingSnap?.exists()) {
      await updateDoc(rateRef, payload);
    } else {
      await setDoc(rateRef, {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
    return rateId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `published_rates/${rateId}`);
  }
}

export async function togglePublishedRateStatusDoc(params: {
  id: string;
  published: boolean;
  updatedByUid: string;
}) {
  try {
    await updateDoc(doc(db, 'published_rates', params.id), {
      published: params.published,
      updatedByUid: params.updatedByUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `published_rates/${params.id}`);
  }
}

export async function deletePublishedRateDoc(id: string) {
  const { deleteDoc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(db, 'published_rates', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `published_rates/${id}`);
  }
}
