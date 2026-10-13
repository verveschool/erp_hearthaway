# HearthAway CRM Security Specification & Red Team Audit

## 1. Data Invariants
1. **Partner Data Isolation**: A partner user can ONLY access and read records where `partnerId == request.auth.token.partnerId` or `partnerId == userDoc.partnerId`. A partner can never view another partner's records or internal operational logs.
2. **Decoupled Status Invariant**: Student records strictly decouple `leadStatus`, `accommodationStatus`, `bookingStatus`, `moveInStatus`, and `commissionStatus`. Status mutations must adhere to allowed discrete enum states.
3. **Immutable Identifiers**: `studentId` (format `^HA-[0-9]{4}-[0-9]{6}$`), `partnerId` (format `^PART-[0-9]{5}$`), and `paymentId` (`^PAY-[a-zA-Z0-9_-]+$`) cannot be spoofed or reassigned across updates.
4. **Audit Trail Immutability**: Documents in `/students/{studentId}/activities` are append-only. No deletion or editing is allowed to preserve financial and operational accountability.
5. **Role-Based Access Control**:
   - `admin` & `management`: Full read and write across all workspaces and pipelines.
   - `sales`: Read and write access to assigned students, leads, requirements, options, and tasks.
   - `finance`: Read and write access to bookings, payments, commissions, and partner payouts.
   - `partner`: Read and write strictly constrained to their own `partnerId`.
   - `student`: Read and write access strictly to their own student profile and self-service document uploads.

## 2. The "Dirty Dozen" Payloads
1. **Payload 1 (Partner Cross-Tenant Read)**: Partner A attempting to read Partner B's student record (`partnerId: 'PART-99999'`).
2. **Payload 2 (Partner Shadow Field Elevation)**: Partner user submitting a student payload with injected internal commission margins `internalMargin: 45.0`.
3. **Payload 3 (Role Spoofing)**: Student user updating their profile with `role: 'admin'`.
4. **Payload 4 (Activity Deletion)**: Any user attempting `deleteDoc` on an audit activity `/students/{id}/activities/{actId}`.
5. **Payload 5 (Payment Verification Spoofing)**: Non-finance/sales user marking a payment status as `'Verified'`.
6. **Payload 6 (ID Resource Poisoning)**: Malicious user submitting student document with 100KB studentId.
7. **Payload 7 (Unauthenticated Read)**: Anonymous unverified request attempting to list `/students`.
8. **Payload 8 (Invalid Status Transition Bypass)**: Attempting to update `leadStatus: 'InvalidStatusString'`.
9. **Payload 9 (Cross-Partner Submission)**: Partner A submitting a student with `partnerId: 'PART-00002'` (Partner B's ID).
10. **Payload 10 (Direct Margin Exposure Write)**: Attempting to read or write internal financial ledger without `finance` or `management` role.
11. **Payload 11 (Timestamp Tampering)**: Submitting arbitrary future timestamp instead of verifiable server timestamp.
12. **Payload 12 (Orphan Payment Injection)**: Creating a payment record without valid existing `studentId`.

## 3. Test Runner Blueprint
Defined in `firestore.rules.test.ts` validating rejection of all Dirty Dozen operations with `PERMISSION_DENIED`.
