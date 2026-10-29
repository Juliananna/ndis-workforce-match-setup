# GHL Lifecycle Event Specification
## Technical Handover for Codex — Phase 2 GHL Integration

**Date:** 2026-10-29  
**Status:** Authoritative reference for Phase 2 implementation  
**Constraint:** Do not modify live GHL contacts, workflows, or existing tags during Phase 2 development

---

## 1. What `resume-converted` Means in the Backend

`resume-converted` is a GHL tag applied when a resume builder session results in a Kizazi worker account being created or linked.

**Precise backend definition:**  
A session is converted when `resume_sessions.status = 'converted'` AND `resume_sessions.converted_worker_id IS NOT NULL`.

This happens inside `convertSessionToProfile()` (`backend/resume/convert_helpers.ts`) in two scenarios:
1. **New user + new worker** — user email was unknown; a `users` row and a `workers` row are both inserted; `is_verified = TRUE` is set on the user at creation (no email verification step for resume-builder accounts).
2. **Existing user, new worker** — user existed but had no worker record; a new `workers` row is inserted.
3. **Existing user + existing worker** — profile data is merged; `alreadyExists = true` is returned; `resume-converted` is still applied because `workerId` is populated.

The tag is applied in `email_capture.ts` at the point when `emailCapture()` calls `upsertContact()`. It is also re-applied on every `runBulkSync()` for any session with `converted_worker_id IS NOT NULL`.

**What it does NOT mean:**  
- It does not mean the worker has completed compliance onboarding.  
- It does not mean email is verified (resume-builder users are created with `is_verified = TRUE` unconditionally — see `convert_helpers.ts:343`).  
- It does not mean the worker is active or searchable.

---

## 2. Resume Completion vs Profile Creation — Are They Tracked Independently?

**Yes, they are independent, but the boundary is blurry today.**

| State | DB signal | GHL tag |
|---|---|---|
| Resume session started | `resume_sessions` row exists, `status = 'started'` | none |
| Email captured (step gate) | `status = 'email_captured'`, email column populated | `resume-lead` + (`resume-converted` OR `profile-not-created`) applied at this point |
| Resume "completed" (questionnaire done) | `step_completed >= N` (no explicit `completed` status value exists today) | none specifically |
| Profile created | `converted_worker_id IS NOT NULL`, `status = 'converted'` | `resume-converted` |
| Profile declined | `consentProfileCreation = false` | `profile-not-created` |

**Key gap:** There is no `completed` status value for `resume_sessions.status`. The field uses `'started'`, `'email_captured'`, `'converted'`, `'abandoned'`. A session that finishes all steps but the user declines profile creation stays as `email_captured`, not `completed`. GHL cannot distinguish "abandoned at step 3" from "completed all steps then declined".

**Recommendation for Phase 2:** Add `status = 'completed'` to the session status enum and set it when `step_completed` reaches the final step (step 8, deduced from `StepChecks`, `StepQualifications`, etc.), regardless of whether profile creation was accepted.

---

## 3. Authoritative Conditions for Each Lifecycle Event

### EVENT 1: `resume-started`
**Condition:** A `resume_sessions` row is inserted via `POST /resume-sessions`.  
**DB signal:** Row exists with `status = 'started'`, `email IS NULL`.  
**Currently emitted to GHL?** No. No GHL call is made at session creation.  
**Notes:** No email is available yet — GHL contact cannot be created without an email. This event should be enqueued and flushed when email is captured.

### EVENT 2: `email-captured`
**Condition:** `POST /resume-sessions/:id/email-capture` succeeds.  
**DB signal:** `resume_sessions.status = 'email_captured'`, `email IS NOT NULL`.  
**Consent stored:** `resume_session_consents` table, consent_types: `resume_generation`, `profile_creation`, `provider_visibility`, `marketing_emails`.  
**Currently emitted to GHL?** Yes — `upsertContact()` is called inside `emailCapture()` with tags `['resume-lead', 'worker']` plus either `resume-converted` or `profile-not-created` depending on whether profile creation succeeded.  
**Timing issue:** Profile conversion is attempted synchronously inside `emailCapture()`, so by the time GHL is called, the conversion result is already known. Tags are correct at time of call.

### EVENT 3: `resume-completed`
**Condition:** Does not exist as a distinct backend event today.  
**Recommended implementation:** Set `status = 'resume_completed'` when `step_completed` reaches the maximum step and write an `resume_audit_log` entry with `event_type = 'resume_completed'`. Apply GHL tag `resume-completed` at this point.  
**Blocked on:** defining what the maximum step number is (currently implicit in frontend only).

### EVENT 4: `worker-profile-created`
**Condition:** `convertSessionToProfile()` returns `alreadyExists = false` AND a new `workers` row was inserted.  
**DB signals:**  
- `resume_sessions.converted_worker_id IS NOT NULL`  
- `resume_sessions.status = 'converted'`  
- `workers.resume_session_id = session_id`  
- `workers.onboarding_status = 'compliance_required'` (set on insert)  
- `resume_audit_log` entry with `event_type = 'worker_profile_created_from_resume'`  
**Currently emitted to GHL?** Yes — `syncResumeLeadToGHL()` is called inside `convertSessionToProfile()` with tags `['resume-lead', 'resume-converted', 'worker']`.  
**Note:** For new users, a `password_reset_tokens` row is also inserted and `issueSetPasswordEmail()` sends the activation email.

### EVENT 5: `email-verified`
**Condition:** `POST /auth/verify-email` succeeds; `users.is_verified` flips from `FALSE` to `TRUE`.  
**Currently emitted to GHL?** Yes — `userVerifiedTopic` pubsub message is published; `ghl/sync_verified.ts` subscribes and calls `upsertContact()` with tags `['worker', 'ndis-platform', 'verified']`.  
**Critical finding:** The `verified` tag in GHL is applied ONLY via this path (direct registration + email link click). Resume-builder accounts are created with `is_verified = TRUE` immediately — they never click an email verification link and never receive the `verified` tag via this path.  
**This is the condition referenced in GHL workflow version 5.** See Section 7 for replacement guidance.

### EVENT 6: `compliance-submitted`
**Condition:** First document uploaded by a worker via `POST /workers/documents/upload`.  
**DB signal:** First row inserted in `worker_documents` for `worker_id`.  
**Currently emitted to GHL?** No. No GHL call is made on document upload.  
**Recommended:** Add GHL upsert with tag `compliance-submitted` when `worker_documents` count transitions from 0 to 1 for a given worker.

### EVENT 7: `ready-to-hire`
**Condition:** `workers.ready_to_hire = TRUE` set by admin via `POST /admin/workers/:workerId/approve-readiness`.  
**Eligibility criteria (authoritative, from `readiness_eligibility.ts`):**  
1. `users.is_verified = TRUE`  
2. NDIS Worker Screening Check: `verification_status = 'Verified'` AND (`expiry_date IS NULL` OR `expiry_date > NOW()`)  
3. Police Clearance: same as above  
4. `worker_references.status = 'Verified'` count >= 2  
**Currently emitted to GHL?** No. No GHL call is made on readiness approval.  
**Recommended:** Add GHL upsert with tag `ready-to-hire` after `UPDATE workers SET ready_to_hire = TRUE` in `approve_readiness.ts`.  
**Revocation:** Automatic via `autoRevokeReadinessIfInvalid()` + daily cron. GHL tag removal is Phase 2 (blocked on workflow audit — `removeContactTags` throws in Phase 1).

---

## 4. Events Currently Emitted vs Events Needing Implementation

| Event | Emitted Now? | How | Missing |
|---|---|---|---|
| Resume session started | No | — | GHL call impossible (no email yet) |
| Email captured | Yes | Direct `upsertContact()` in `emailCapture()` | No audit log entry; no attribution forwarded to GHL custom fields |
| Resume completed | No | No status value exists | Need status value + GHL tag |
| Worker profile created | Yes | `syncResumeLeadToGHL()` in `convertSessionToProfile()` | No `ghl_contact_id` written back to DB |
| Email verified (direct reg) | Yes | pubsub → `sync_verified.ts` | Doesn't fire for resume-builder accounts |
| Email verified (resume-builder) | No | — | Never fires because `is_verified = TRUE` at account creation |
| Compliance submitted | No | — | Needs implementation |
| Ready to hire approved | No | — | Needs implementation |
| Ready to hire revoked | No | — | Needs implementation |
| Employer registered | Yes | Direct `upsertContact()` in `register.ts` | — |
| Employer subscribed | Yes | pubsub → `sync_subscription.ts` | — |

---

## 5. Stable Event Identifiers, Timestamps, and Payload Fields

Each event should produce a `ghl_sync_log` entry via `writeSyncLog()`. The following are the canonical identifiers:

### Resume Session Events
```typescript
interface ResumeSessionGHLPayload {
  sessionId: string;           // resume_sessions.id (UUID)
  email: string;               // resume_sessions.email
  firstName: string | null;
  lastName: string | null;
  utmSource: string | null;    // resume_sessions.utm_source
  utmMedium: string | null;
  utmCampaign: string | null;
  fbclid: string | null;
  metaCampaignId: string | null;
  metaAdsetId: string | null;
  metaAdId: string | null;
  metaLeadId: string | null;
  landingPage: string | null;
  consentMarketingEmails: boolean;  // from resume_session_consents
  consentProfileCreation: boolean;
  resumePreviewUrl: string;    // https://kizazihire.com.au/resume-builder/preview/:id
}
```

### Worker Account Events
```typescript
interface WorkerGHLPayload {
  workerId: string;            // workers.worker_id (UUID)
  userId: string;              // workers.user_id (UUID)
  email: string;               // users.email
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  suburb: string | null;
  postcode: string | null;
  targetRole: string | null;
  onboardingStatus: string;    // workers.onboarding_status
  readyToHire: boolean;        // workers.ready_to_hire
  marketingConsent: boolean | null;  // workers.marketing_consent
}
```

### GHL Custom Field IDs Required (Phase 2 — must be fetched from GHL API before coding)
The following custom fields do not currently exist in GHL and must be created first:
- `kizazi_worker_id` — maps to `workers.worker_id`
- `kizazi_session_id` — maps to `resume_sessions.id`
- `kizazi_resume_url` — maps to the preview URL
- `kizazi_utm_source`, `kizazi_utm_campaign` — attribution pass-through
- `kizazi_meta_campaign_id` — Meta ad attribution
- `kizazi_consent_marketing` — marketing consent flag (boolean as text "true"/"false")
- `kizazi_ready_to_hire_date` — ISO date when approved
- `kizazi_onboarding_status` — current onboarding status string

**GHL custom field values must use UUID field IDs, not key names.** Fetch from `GET /locations/:locationId/customFields` before implementing.

---

## 6. Marketing and SMS Consent — Storage, Capture, and Update Rules

### Current Storage

**Resume builder path:**  
- Table: `resume_session_consents`  
- Column: `consent_type = 'marketing_emails'`, `granted BOOLEAN`, `granted_at TIMESTAMPTZ`, `ip_address TEXT`, `user_agent TEXT`  
- Captured at: `POST /resume-sessions/:id/email-capture` via `consentMarketingEmails: boolean` field  
- Written to `workers.marketing_consent` and `workers.marketing_consent_at`: **NOT currently written.** This is a gap.

**Direct registration path:**  
- No explicit marketing consent is captured at `POST /auth/register`. No consent table entry, no `marketing_consent` column populated.

**SMS consent:**  
- Not captured anywhere in the backend currently. There is no SMS consent column or table.  
- GHL has 3 contacts with SMS DND enabled. These must never be overridden by Kizazi.

### Rules Codex Must Follow

1. **Never infer consent from absence of DND.** Only write consent state to GHL when Kizazi has an explicit `granted = TRUE` record with a timestamp and IP address.
2. **Do not set GHL DND via API** until explicit opt-out consent is captured by Kizazi (no endpoint exists for this today — it is a Phase 3 concern).
3. **Resume builder marketing consent** must be written to `workers.marketing_consent` / `workers.marketing_consent_at` when `convertSessionToProfile()` creates the worker. Currently this is missing — it must be added.
4. **Source of truth for consent:** `resume_session_consents.granted` where `consent_type = 'marketing_emails'` for resume-builder workers. For direct-registration workers, no consent record exists — treat as `null` (unknown), not as `false`.
5. **GHL custom field mapping:** Write `kizazi_consent_marketing` as `"true"` only if `resume_session_consents.granted = TRUE` for `marketing_emails`. Do not write `"false"` — omit the field if consent is unknown or denied, to avoid accidentally suppressing GHL workflows that have their own opt-out logic.

### Implementation Required (Phase 2)

```typescript
// In convertSessionToProfile(), after worker INSERT:
const consentRow = await db.queryRow<{ granted: boolean }>`
  SELECT granted FROM resume_session_consents
  WHERE session_id = ${sessionId} AND consent_type = 'marketing_emails'
`;
if (consentRow) {
  await db.exec`
    UPDATE workers
    SET marketing_consent = ${consentRow.granted},
        marketing_consent_at = NOW()
    WHERE worker_id = ${worker.worker_id}
  `;
}
```

---

## 7. Replacing the GHL Workflow `verified` Tag Condition

### Current Situation
GHL workflow version 5 contains a condition that checks for the `verified` tag. This tag is applied by `ghl/sync_verified.ts` via the `userVerifiedTopic` pubsub subscription, which fires when `POST /auth/verify-email` succeeds.

**The tag is applied with these exact fields:**
```typescript
tags: [event.role.toLowerCase(), "ndis-platform", "verified"]
// e.g. ["worker", "ndis-platform", "verified"]
```

### Who Gets the `verified` Tag

| Registration path | Gets `verified` tag? | Reason |
|---|---|---|
| Direct registration (`POST /auth/register`) + clicks email link | **Yes** | `verifyEmail()` publishes to `userVerifiedTopic` → `sync_verified.ts` |
| Resume builder → profile created | **No** | `is_verified = TRUE` is set at account creation; no email verification link is clicked; `userVerifiedTopic` is never published |
| Resume builder → profile declined | **No** | No worker account created |

### Safe Replacement Strategy

The GHL workflow condition `has tag: verified` should be replaced with one of:
- **`has tag: email-verified`** — requires renaming the tag emitted by `sync_verified.ts` (Phase 2 change, audit required first)
- **`has tag: resume-converted OR has tag: verified`** — uses existing tags to catch both paths without renaming (safer for Phase 2 migration)
- **Custom field condition** — `kizazi_onboarding_status is set` (requires custom fields to be created first)

**Recommended Phase 2 replacement (minimal risk):**  
Change `sync_verified.ts` to emit `email-verified` instead of `verified`. The new tag must be added alongside `verified` (not replacing it) for one full sync cycle to avoid dropping contacts from the workflow mid-funnel. Only remove `verified` tag once the workflow is confirmed updated.

**Codex must NOT change `sync_verified.ts` until the GHL workflow admin has:**  
1. Opened workflow version 5 in GHL  
2. Changed the trigger condition from `verified` to `email-verified`  
3. Published the new workflow version  
4. Confirmed the old version is deactivated

---

## 8. Exact GHL Field, Tag, and Workflow Exit Condition Mappings

### Tags (additive — never remove in Phase 2 without explicit approval)

| Tag | Applied when | Backend source |
|---|---|---|
| `resume-lead` | Email captured on resume builder | `emailCapture()` → `upsertContact()` |
| `resume-converted` | Session `status = 'converted'` | `emailCapture()` + `syncResumeLeadToGHL()` + `runBulkSync()` |
| `profile-not-created` | Profile creation declined | `emailCapture()` → `upsertContact()` + `runBulkSync()` |
| `worker` | All worker paths | `register.ts`, `emailCapture()`, `sync_verified.ts` |
| `ndis-platform` | All verified users | `sync_verified.ts`, `sync_subscription.ts` |
| `verified` | Direct-reg user clicks email verification link | `sync_verified.ts` |
| `registered` | Direct `POST /auth/register` | `register.ts` |
| `employer` | Employer registration | `register.ts` |
| `subscribed` | Employer subscription activated | `sync_subscription.ts` |
| `plan:monthly` etc | Employer subscription plan | `sync_subscription.ts` |

**Phase 2 tags to ADD (not yet implemented):**

| Tag | Applied when | Implementation location |
|---|---|---|
| `email-verified` | Same as `verified` (rename, not replace) | `sync_verified.ts` |
| `compliance-submitted` | First document uploaded | `workers/documents.ts` after insert |
| `ready-to-hire` | `workers.ready_to_hire` set to TRUE | `admin/approve_readiness.ts` |
| `readiness-revoked` | `workers.ready_to_hire` revoked | `admin/readiness_auto_revoke.ts` + `approve_readiness.ts` |
| `resume-completed` | Final questionnaire step submitted | `resume/session_update.ts` when `step_completed = MAX_STEP` |

### GHL Contact Field Mappings

All `upsertContact()` calls use the GHL `/contacts/upsert` endpoint. Field mapping:

| GHL field | Source |
|---|---|
| `email` | `users.email` / `resume_sessions.email` |
| `firstName` | Parsed from `workers.full_name` or `resume_sessions.first_name` |
| `lastName` | Parsed from `workers.full_name` or `resume_sessions.last_name` |
| `name` | Concatenated full name |
| `phone` | `workers.phone` / `users.phone` (direct reg only) |
| `source` | `"resume-builder"` (resume path) or omitted (direct reg) |
| `website` | Resume preview URL: `https://kizazihire.com.au/resume-builder/preview/:id` |
| `tags` | Array — additive in GHL |

### Workflow Exit Conditions (for GHL admin to configure)

| GHL workflow | Exit / completion condition | DB equivalent |
|---|---|---|
| Resume Builder Lead SMS | Contact has tag `resume-converted` | `resume_sessions.status = 'converted'` |
| Onboarding nurture | Contact has tag `compliance-submitted` | First `worker_documents` row verified |
| Ready to Hire notification | Contact has tag `ready-to-hire` | `workers.ready_to_hire = TRUE` |

---

## 9. Phase 1 Attribution — Is It Actually Passed from Frontend to Backend?

**Yes, confirmed.** The implementation is complete and verified via live API call.

**Frontend flow (`ResumeBuilderLandingPage.tsx`):**
1. On component mount: `captureAttribution()` reads `window.location.search` for all 11 attribution params (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `campaign_id`, `adset_id`, `ad_id`, `lead_id`, `fbclid`) plus `window.location.pathname` as `landingPage`.
2. First-touch semantics: attribution is written to `sessionStorage` under key `kh_attribution` only if no attribution is already stored there (survives page refresh; lost only on tab close).
3. On "Start Building" click: `getEffectiveAttribution()` reads from `sessionStorage` and passes the result as `{ attribution: { utmSource, ..., fbclid, landingPage } }` to `backend.resume.createSession()`.
4. `POST /resume-sessions` (`session_create.ts`) inserts all 11 attribution columns into `resume_sessions` in a single `INSERT`.

**Verified in production DB:** Session `3fcaf5ae-8c68-430b-98de-ac16d078ac92` exists with all attribution columns populated.

**What is NOT yet forwarded to GHL:**  
Attribution fields are stored in `resume_sessions` but are not included in the `GHLContactPayload` sent to `upsertContact()`. The GHL contact receives `source: "resume-builder"` but not the individual UTM or Meta fields. These must be mapped to GHL custom fields in Phase 2.

---

## 10. Tests Required for Phase 2

### Event Ordering Tests

```typescript
// Test: email-capture triggers GHL upsert before profile conversion completes
// Test: profile creation failure does not suppress GHL upsert (upsert is in try/finally)
// Test: bulk sync correctly identifies converted vs unconverted sessions
// Test: ready-to-hire approval triggers GHL upsert with correct tags
// Test: auto-revoke does NOT call GHL (removeContactTags is Phase 1 stub)
```

### Duplicate Event Tests

```typescript
// Test: calling emailCapture twice with same session applies tags additively in GHL
//        (GHL upsert is idempotent — safe to call multiple times)
// Test: bulk sync at 06:00 and 18:00 on same day does not duplicate contacts
//        (GHL /contacts/upsert deduplicates by email within a location)
// Test: convertSessionToProfile called for existing worker: alreadyExists=true,
//        tags still applied, no duplicate worker row created
```

### Retry Tests

```typescript
// Test: ghlFetch retries on 429 (rate limit), 502, 503, 504
// Test: ghlFetch does NOT retry on 400, 401, 404, 422, 500
// Test: after 3 retries (4 total attempts) still failing → throws
// Test: retry delays increase exponentially: 1000ms, 3000ms, 9000ms
// Test: writeSyncLog is called with success=false and http_status on terminal failure
```

### User Journey — Profile Creation Declined

```typescript
// Journey: User completes resume → email captured → consentProfileCreation=false
// Expected GHL state: tag='profile-not-created', no worker account, no 'resume-converted'
// Expected DB: resume_sessions.converted_worker_id IS NULL, status='email_captured'
// Expected consents: resume_session_consents has profile_creation granted=false
// Test: subsequent bulk sync keeps 'profile-not-created', does not add 'resume-converted'
```

### User Journey — Resume Builder → Profile Created → Compliance Path

```typescript
// Journey: Email captured → consentProfileCreation=true → worker created
//          → first doc uploaded → admin verifies doc → admin approves readiness
// Expected GHL tags (additive): resume-lead, worker, resume-converted,
//          compliance-submitted, ready-to-hire
// Expected DB: workers.ready_to_hire=TRUE, workers.marketing_consent=<from consent record>
```

### Marketing Consent Tests

```typescript
// Test: consentMarketingEmails=true → workers.marketing_consent=TRUE after conversion
// Test: consentMarketingEmails=false → workers.marketing_consent=FALSE after conversion
// Test: direct registration → workers.marketing_consent IS NULL (not false)
// Test: GHL upsert only includes kizazi_consent_marketing custom field when granted=true
// Test: GHL upsert omits kizazi_consent_marketing when consent=false or null
```

---

## 11. Missing Functionality Summary

The following gaps exist in the current implementation and must be addressed in Phase 2:

| # | Gap | File to modify | Implementation |
|---|---|---|---|
| 1 | `workers.marketing_consent` not populated on profile creation | `backend/resume/convert_helpers.ts` | Read `resume_session_consents` and UPDATE workers |
| 2 | `ghl_contact_id` not written back to `resume_sessions` after upsert | `backend/resume/email_capture.ts` | Capture `contactId` from `upsertContact()` result and UPDATE |
| 3 | `ghl_contact_id` not written back to `workers` after upsert | `backend/resume/convert_helpers.ts` | Same as above |
| 4 | Attribution fields not forwarded to GHL custom fields | `backend/ghl/client.ts` | Add custom field IDs to `GHLContactPayload` |
| 5 | `compliance-submitted` tag not applied | `backend/workers/documents.ts` | Add `upsertContact()` call after first doc insert |
| 6 | `ready-to-hire` tag not applied | `backend/admin/approve_readiness.ts` | Add `upsertContact()` call after `ready_to_hire = TRUE` |
| 7 | Resume-builder accounts never get `email-verified` tag | `backend/resume/convert_helpers.ts` | After worker creation, upsert with `email-verified` tag (after GHL workflow is updated) |
| 8 | No `resume-completed` status exists | `backend/resume/session_update.ts` + DB migration | Add status value and trigger GHL upsert |
| 9 | Direct-registration workers have no marketing consent record | `backend/auth/register.ts` | Add explicit marketing consent capture to registration form |
| 10 | `removeContactTags` throws (Phase 1 stub) | `backend/ghl/client.ts` | Implement after GHL workflow audit confirms safety |
| 11 | No SMS consent captured anywhere | New migration + endpoints | Phase 3 scope |

---

## 12. Recommended Minimal Phase 2 Changes (Ordered by Safety)

**Do first (no GHL workflow changes required):**
1. Write `marketing_consent` to workers on profile creation (gap #1)
2. Write `ghl_contact_id` back to `resume_sessions` and `workers` after upsert (gaps #2, #3)
3. Apply `compliance-submitted` tag on first document (gap #5)
4. Apply `ready-to-hire` tag on readiness approval (gap #6)

**Do second (requires GHL workflow to be updated first):**
5. Rename `verified` → `email-verified` in `sync_verified.ts` (coordinate with GHL admin)
6. Apply `email-verified` tag to resume-builder accounts at profile creation (gap #7)
7. Implement `removeContactTags` to remove `profile-not-created` when `resume-converted` is applied (gap #10)

**Do third (lower priority, larger scope):**
8. Add attribution to GHL custom fields (gap #4) — requires GHL custom field UUIDs
9. Add `resume-completed` status and tag (gap #8)
10. Add marketing consent to direct registration form (gap #9)

---

## Appendix A — GHL Sync Points in Current Codebase

| File | Function | GHL call | Tags applied |
|---|---|---|---|
| `auth/register.ts` | `register()` | `upsertContact()` direct | `[role, 'ndis-platform', 'registered']` |
| `auth/verifyEmail.ts` | `verifyEmail()` | pubsub → `sync_verified.ts` | `[role, 'ndis-platform', 'verified']` |
| `resume/email_capture.ts` | `emailCapture()` | `upsertContact()` direct | `['resume-lead', 'worker', ('resume-converted'|'profile-not-created')]` |
| `resume/convert_helpers.ts` | `syncResumeLeadToGHL()` | `upsertContact()` direct | `['resume-lead', 'resume-converted', 'worker']` |
| `ghl/bulk_sync.ts` | `runBulkSync()` | `upsertContact()` per record | `[role, 'ndis-platform', 'verified']` for users; `['resume-lead', 'worker', ...]` for sessions |
| `ghl/sync_subscription.ts` | subscription handler | `upsertContact()` direct | `['employer', 'ndis-platform', 'subscribed', 'plan:X']` |

## Appendix B — DB Tables Relevant to GHL Sync

| Table | Key columns | Notes |
|---|---|---|
| `resume_sessions` | `id`, `email`, `status`, `converted_worker_id`, `utm_*`, `meta_*`, `fbclid`, `landing_page`, `ghl_contact_id`, `ghl_last_synced_at` | Phase 1 added attribution + GHL columns |
| `resume_session_consents` | `session_id`, `consent_type`, `granted`, `granted_at`, `ip_address` | Consent types: `resume_generation`, `profile_creation`, `provider_visibility`, `marketing_emails` |
| `workers` | `worker_id`, `user_id`, `onboarding_status`, `ready_to_hire`, `marketing_consent`, `ghl_contact_id`, `ghl_last_synced_at` | Phase 1 added GHL + readiness + consent columns |
| `users` | `user_id`, `email`, `role`, `is_verified` | `is_verified = TRUE` immediately for resume-builder accounts |
| `ghl_sync_log` | `email`, `entity_type`, `entity_id`, `operation`, `success`, `ghl_contact_id`, `error_message` | Phase 1 table — append-only structured log |
| `ready_to_hire_audit` | `worker_id`, `action`, `acted_by_email`, `eligibility_snapshot` | `action` CHECK IN (`approved`, `revoked`, `auto_revoked`) |
| `worker_documents` | `worker_id`, `document_type`, `verification_status`, `expiry_date` | `verification_status` CHECK IN (`Pending`, `Verified`, `Flagged`, `Expired`) |
| `worker_references` | `worker_id`, `status` | `status = 'Verified'` for ready-to-hire eligibility |
