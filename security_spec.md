# ETP – EPR Bazaar Security Specification

## 1. Data Invariants
1. **Strict Role Separation**: Users authenticating via Google can only self-register as `buyer` or `seller` during initial onboarding (`users/{uid}`). Only an existing Admin can create `facilitators/{uid}` or `admins/{uid}` records. Users can never elevate their own `role`.
2. **Counterparty Anonymity**: `buyers/{uid}` and `sellers/{uid}` hold PII (company name, email, mobile, GSTIN) and are readable ONLY by the document owner, an authorised Facilitator, or an Admin. `seller_listings` and `matches` omit counterparty PII.
3. **Immutable Ownership & Timestamps**: `createdAt` uses `request.time` and is immutable after creation. Owner fields (`uid`, `buyerUid`, `sellerUid`, `ownerUid`) are immutable on update.
4. **No Shadow Fields**: Every `create` enforces `hasAll(...) && hasOnly(...)`; every `update` enforces `affectedKeys().hasOnly(...)` per action plus `isValid[Entity]()`.
5. **Terminal State Locking**: Orders in `Transaction Completed`, Requirements in `Withdrawn`/`Rejected`, and Listings in `Withdrawn`/`Rejected` cannot be altered by non-admins.
6. **Verified Email Mandate**: All authenticated reads and writes require `request.auth.token.email_verified == true`.
7. **Facilitator Control**: Only facilitators and admins can create `offers`, confirm `matches` into `orders`, or record `transactions`.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Privilege Escalation on Signup**: Buyer creates `users/{uid}` with `role: "admin"` -> Denied.
2. **Self-Role Update**: Buyer updates `users/{uid}` changing `role` to `"facilitator"` -> Denied.
3. **Spoofed Buyer Requirement**: Buyer A creates `buyer_requirements/{id}` with `buyerUid: "BuyerB_UID"` -> Denied.
4. **Unverified Email Write**: User with `email_verified: false` tries to write `buyer_requirements` -> Denied.
5. **Buyer Reads Seller PII**: Authenticated Buyer calls `get` or `list` on `sellers` -> Denied.
6. **Seller Reads Buyer PII**: Authenticated Seller calls `get` or `list` on `buyers` or `buyer_requirements` -> Denied.
7. **Shadow Field Injection**: Buyer creates `buyers/{uid}` with extra field `verification: "Verified"` or `isAdmin: true` -> Denied.
8. **Client Timestamp Forgery**: User creates `buyer_requirements/{id}` with `createdAt` != `request.time` -> Denied.
9. **ID Poisoning**: User writes document with 200-char ID or invalid characters (`../bad`) -> Denied by `isValidId()`.
10. **Buyer Creates Direct Offer**: Buyer attempts to create a document in `offers` -> Denied (Facilitator/Admin only).
11. **Terminal Order Tampering**: Seller attempts to update an `orders` document already in `Transaction Completed` -> Denied.
12. **Blanket Collection Scraping**: Buyer calls `list` on `audit_logs` or `payments` without ownership filter -> Denied.
