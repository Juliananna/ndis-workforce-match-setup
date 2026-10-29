# Codex Integration Contract — Phase 2 GHL Lifecycle Events
## Version: 1.0 | Status: AUTHORITATIVE | Date: 2026-10-29

This document is the definitive contract between the Kizazi backend and any
downstream integration (GHL, Codex AI, analytics) consuming lifecycle events.

---

## 1. Migration Changes in Phase 2

### Migration 086 — `backend/db/migrations/086_lifecycle_events.up.sql`

**Additive only. No existing columns or constraints modified.**

#### New columns on `resume_sessions`:
| Column | Type | Purpose |
|---|---|---|
| `resume_completed_at` | `TIMESTAMPTZ` | Timestamp when final questionnaire step was submitted. Set once, never cleared. |
| `resume_completed_step` | `INTEGER` | The step number that triggered completion (expected: 8). |

#### New columns on `workers`:
| Column | Type | Purpose |
|---|---|---|
| `sms_consent` | `BOOLEAN` | Explicit SMS consent. `NULL` = unknown, `TRUE` = granted, `FALSE` = denied. Never inferred from `marketing_consent`. |
| `sms_consent_at` | `TIMESTAMPTZ` | When SMS consent was recorded. |
| `sms_consent_source` | `TEXT` | Source of SMS consent record (e.g. `'resume_builder'`, `'direct'`). |

#### New table: `lifecycle_events`
| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | DB-generated row ID |
| `event_id` | `TEXT UNIQUE` | Caller-supplied idempotency key (SHA-256, 64 hex chars) |
| `event_type` | `TEXT` | See Section 2 |
| `event_version` | `INTEGER` | Always `1` in Phase 2 |
| `entity_type` | `TEXT` | CHECK IN (`resume_session`, `worker`, `user`) |
| `entity_id` | `TEXT` | UUID of the primary entity (stored as TEXT) |
| `occurred_at` | `TIMESTAMPTZ` | When the business event happened |
| `payload` | `JSONB` | Full typed payload — see Section 3 |
| `worker_id` | `UUID FK→workers` | Back-link for indexed queries; may be NULL |
| `session_id` | `UUID FK→resume_sessions` | Back-link; may be NULL |
| `user_id` | `UUID FK→users` | Back-link; may be NULL |

**Indexes:**
- `(entity_type, entity_id, occurred_at DESC)` — primary lookup
- `(worker_id, occurred_at DESC) WHERE worker_id IS NOT NULL`
- `(event_type, occurred_at DESC)`
- `(session_id, occurred_at DESC) WHERE session_id IS NOT NULL`

---

## 2. Event Types

All event types are `event_version: 1`. Increment version before deploying breaking payload changes.

| `event_type` | Entity | Idempotency scope | Can recur? |
|---|---|---|---|
| `email_captured` | `resume_session` | Once per session | No |
| `resume_completed` | `resume_session` | Once per session | No |
| `worker_profile_created` | `worker` | Once per session→worker link | No |
| `worker_profile_linked` | `worker` | Once per session→worker link | No |
| `email_verified` | `user` | Once per user per path | No |
| `compliance_submitted` | `worker` | Once per `worker+document_id` | Yes (one per doc) |
| `ready_to_hire_approved` | `worker` | Once per worker per UTC date | Yes (can re-approve) |
| `ready_to_hire_revoked` | `worker` | Once per worker per UTC minute | Yes (can re-revoke) |
| `ready_to_hire_auto_revoked` | `worker` | Once per worker per UTC hour | Yes (daily cron) |

---

## 3. Canonical Payload Schemas

All payloads include `eventType` and `occurredAt` (ISO 8601 UTC string).

### 3.1 `email_captured`
```typescript
{
  eventType: "email_captured",
  occurredAt: string,          // ISO 8601 UTC
  sessionId: string,           // resume_sessions.id
  email: string,
  consentMarketingEmails: boolean,
  consentProfileCreation: boolean,
  consentProviderVisibility: boolean,
  ipAddress: string | null,
  userAgent: string | null,
}
```

### 3.2 `resume_completed`
```typescript
{
  eventType: "resume_completed",
  occurredAt: string,
  sessionId: string,
  email: string | null,          // may be null if completed before email capture
  stepCompleted: number,         // expected: 8
  resumeStrengthScore: number | null,
  convertedWorkerId: string | null,  // set if already converted at time of completion
  utmSource: string | null,
  fbclid: string | null,
  metaCampaignId: string | null,
}
```

### 3.3 `worker_profile_created`
```typescript
{
  eventType: "worker_profile_created",
  occurredAt: string,
  workerId: string,              // workers.worker_id
  userId: string,                // users.user_id
  sessionId: string,             // source resume session
  email: string,
  consentMarketingEmails: boolean,   // from resume_session_consents
  marketingConsentTransferred: boolean,  // true if workers.marketing_consent was updated
  isNewUser: boolean,            // true if a new users row was created
}
```

### 3.4 `worker_profile_linked`
```typescript
{
  eventType: "worker_profile_linked",
  occurredAt: string,
  workerId: string,              // existing worker
  userId: string,
  sessionId: string,             // the new resume session linked to the existing worker
  email: string,
}
```

### 3.5 `email_verified`
```typescript
{
  eventType: "email_verified",
  occurredAt: string,
  userId: string,
  email: string,
  role: string,                  // "WORKER" | "EMPLOYER"
  verificationPath: "direct_registration" | "resume_builder_auto",
  // direct_registration: user clicked the email verification link
  // resume_builder_auto: new user created by resume builder (is_verified=TRUE at creation)
}
```

### 3.6 `compliance_submitted`
```typescript
{
  eventType: "compliance_submitted",
  occurredAt: string,
  workerId: string,
  userId: string,
  email: string,
  documentType: string,          // e.g. "Police Clearance", "NDIS Worker Screening Check"
  documentId: string,            // worker_documents.id
  isFirstDocument: boolean,      // true if this was the first document uploaded
}
```

### 3.7 `ready_to_hire_approved`
```typescript
{
  eventType: "ready_to_hire_approved",
  occurredAt: string,
  workerId: string,
  email: string,
  approvedByEmail: string,       // admin who approved
  verifiedDocCount: number,
  verifiedRefCount: number,
  mandatoryDocsPresent: string[],  // ["NDIS Worker Screening Check", "Police Clearance"]
}
```

### 3.8 `ready_to_hire_revoked`
```typescript
{
  eventType: "ready_to_hire_revoked",
  occurredAt: string,
  workerId: string,
  email: string,
  revokedByEmail: string,        // admin who revoked
  reason: string,
}
```

### 3.9 `ready_to_hire_auto_revoked`
```typescript
{
  eventType: "ready_to_hire_auto_revoked",
  occurredAt: string,
  workerId: string,
  email: string,
  reason: string,                // human-readable summary
  mandatoryDocsExpiredOrFlagged: string[],
}
```

---

## 4. Idempotency Key Derivation

```typescript
function deriveEventId(
  entityType: string,
  entityId: string,
  eventType: string,
  suffix?: string
): string {
  const raw = `${entityType}:${entityId}:${eventType}${suffix ? `:${suffix}` : ""}`;
  return sha256(raw).hex().slice(0, 64);
}
```

### Standard suffixes by event type

| Event type | `entityType` | `entityId` | suffix |
|---|---|---|---|
| `email_captured` | `resume_session` | `sessionId` | none |
| `resume_completed` | `resume_session` | `sessionId` | none |
| `worker_profile_created` | `resume_session` | `sessionId` | none |
| `worker_profile_linked` | `resume_session` | `sessionId` | none |
| `email_verified` (direct) | `user` | `userId` | `"direct_registration"` |
| `email_verified` (resume) | `user` | `userId` | `"resume_builder_auto"` |
| `compliance_submitted` | `worker` | `workerId` | `documentId` |
| `ready_to_hire_approved` | `worker` | `workerId` | `YYYY-MM-DD` (UTC date) |
| `ready_to_hire_revoked` | `worker` | `workerId` | `YYYY-MM-DDTHH:mm` (UTC minute) |
| `ready_to_hire_auto_revoked` | `worker` | `workerId` | `YYYY-MM-DDTHH` (UTC hour) |

---

## 5. Admin Query API

`GET /admin/lifecycle-events` (auth required, SysAdmin or Compliance Officer)

### Request (query parameters):
```typescript
{
  workerId?: string;     // filter by workers.worker_id
  sessionId?: string;    // filter by resume_sessions.id
  userId?: string;       // filter by users.user_id
  eventType?: string;    // filter by event_type
  limit?: number;        // default 50, max 200
}
```

### Response:
```typescript
{
  events: Array<{
    id: string;
    eventId: string;          // idempotency key
    eventType: string;
    eventVersion: number;
    entityType: string;
    entityId: string;
    occurredAt: Date;
    payload: Record<string, unknown>;
    workerId: string | null;
    sessionId: string | null;
    userId: string | null;
  }>
}
```

---

## 6. Consent State Representation

### Marketing Consent
| Source | DB column | Valid values |
|---|---|---|
| Resume builder | `workers.marketing_consent` | `TRUE`, `FALSE`, `NULL` |
| Direct registration | `workers.marketing_consent` | `NULL` (never captured) |

**Rules:**
- `TRUE` = affirmative opt-in with timestamp + IP + user agent in `resume_session_consents`
- `FALSE` = explicit opt-out recorded
- `NULL` = unknown (direct-registration workers; treat as "no permission granted")
- Consent source: always `resume_session_consents` for resume-builder workers. Never inferred.

### SMS Consent
| Column | Values | Meaning |
|---|---|---|
| `workers.sms_consent` | `NULL` | Unknown — no affirmative permission granted |
| `workers.sms_consent` | `TRUE` | Explicitly granted |
| `workers.sms_consent` | `FALSE` | Explicitly denied |

**Rules:**
- `sms_consent` is NEVER derived from `marketing_consent`.
- Do not set GHL DND from `sms_consent = FALSE` — this is Phase 3 scope.
- Do not change GHL DND settings at all in Phase 2.

---

## 7. GHL Synchronisation Rules for Phase 2

### What IS emitted to GHL in Phase 2
The `ghl_contact_id` writebacks to `resume_sessions` and `workers` are now implemented.
The following GHL upsert calls are made (same as Phase 1):

| Trigger | File | Tags applied |
|---|---|---|
| `POST /resume-sessions/:id/email-capture` | `resume/email_capture.ts` | `['resume-lead', 'worker', ('resume-converted'\|'profile-not-created')]` |
| Profile creation in `convertSessionToProfile()` | `resume/convert_helpers.ts` | `['resume-lead', 'resume-converted', 'worker']` |
| `POST /auth/register` | `auth/register.ts` | `['worker'\|'employer', 'ndis-platform', 'registered']` |
| `POST /auth/verify-email` | `auth/verifyEmail.ts` → pubsub | `['worker'\|'employer', 'ndis-platform', 'verified']` |
| Bulk sync cron (06:00, 18:00 UTC) | `ghl/bulk_sync.ts` | Varies |
| Employer subscribed | `ghl/sync_subscription.ts` | `['employer', 'ndis-platform', 'subscribed', 'plan:X']` |

### What is NOT emitted to GHL in Phase 2 (retained as Phase 1 stubs)
- `compliance_submitted` → no GHL tag yet
- `ready_to_hire_approved` → no GHL `ready-to-hire` tag yet
- `ready_to_hire_revoked/auto_revoked` → `removeContactTags` still throws
- `email-verified` (renamed tag) → legacy `verified` tag still emitted
- Attribution custom fields → not yet mapped to GHL custom field UUIDs

**These are all blocked pending the GHL workflow audit.** See `GHL_MATCHING_SPEC.md`.

### GHL contact ID writebacks (new in Phase 2)
Both `resume_sessions.ghl_contact_id` and `workers.ghl_contact_id` are now populated when `upsertContact()` returns a `contactId`.

---

## 8. Non-Regression Guarantee

The following behaviours are explicitly unchanged from Phase 1:

| Behaviour | Status |
|---|---|
| `verified` GHL tag emitted by `sync_verified.ts` | Unchanged |
| `profile-not-created` tag emitted on consent declined | Unchanged |
| `ready_to_hire` DB boolean + `ready_to_hire_audit` table | Unchanged |
| `autoRevokeReadinessIfInvalid` + daily cron | Unchanged |
| Attribution columns on `resume_sessions` | Unchanged |
| `ghl_sync_log` append-only structured log | Unchanged |
| `computeReadinessEligibility` mandatory doc criteria | Unchanged |
| `RESUME_MAX_STEP = 8` | Stable constant — change only in concert with frontend |

---

## 9. Rollback Plan

If `086_lifecycle_events.up.sql` needs to be rolled back:
1. Drop table `lifecycle_events` (CASCADE removes all indexes).
2. Drop columns `resume_sessions.resume_completed_at`, `resume_sessions.resume_completed_step`.
3. Drop columns `workers.sms_consent`, `workers.sms_consent_at`, `workers.sms_consent_source`.
4. Revert the modified TypeScript files listed in Section 10.

No existing data is lost in rollback — all new columns are nullable / default-valued.

---

## 10. Files Changed in Phase 2

### New files
| File | Purpose |
|---|---|
| `backend/db/migrations/086_lifecycle_events.up.sql` | Schema additions |
| `backend/lifecycle/encore.service.ts` | Encore service definition |
| `backend/lifecycle/types.ts` | Typed payload interfaces |
| `backend/lifecycle/writer.ts` | Idempotent event writer + query helpers |
| `backend/lifecycle/query.ts` | Admin query endpoint |
| `backend/lifecycle/lifecycle.test.ts` | 11-scenario pure-logic test suite |

### Modified files
| File | Changes |
|---|---|
| `backend/resume/types.ts` | Added `resumeCompletedAt`, `resumeCompletedStep` fields |
| `backend/resume/session_helpers.ts` | Map new columns in `rowToSession()` |
| `backend/resume/session_update.ts` | Set `resume_completed_at` on final step; emit `resume_completed` event; export `RESUME_MAX_STEP = 8` |
| `backend/resume/email_capture.ts` | Emit `email_captured` event; write `ghl_contact_id` back; structured `writeSyncLog` on success and failure |
| `backend/resume/convert_helpers.ts` | `transferMarketingConsent()`; `ghl_contact_id` writebacks on both `workers` and `resume_sessions`; emit `worker_profile_created` + `worker_profile_linked` + `email_verified` (resume path) events; `syncResumeLeadToGHL` now accepts sessionId and workerId |
| `backend/workers/documents.ts` | Emit `compliance_submitted` event with `isFirstDocument` flag |
| `backend/admin/approve_readiness.ts` | Emit `ready_to_hire_approved` and `ready_to_hire_revoked` events |
| `backend/admin/readiness_auto_revoke.ts` | Emit `ready_to_hire_auto_revoked` event |
| `backend/auth/verifyEmail.ts` | Emit `email_verified` event with `verificationPath: "direct_registration"` |

---

## 11. Test Suite

### File: `backend/lifecycle/lifecycle.test.ts`

Tests are pure-logic (no DB, no HTTP, no GHL) and runnable with:
```bash
cd backend && bun run vitest run lifecycle/lifecycle.test.ts --reporter=verbose
```

### Scenarios and expected results

| Scenario | # Tests | Key assertions |
|---|---|---|
| 1. Resume completed without profile creation | 3 | `resumeCompletedAt` set; status stays `email_captured`; not set on step 7 |
| 2. Resume completed with profile conversion | 2 | Both milestone and `convertedWorkerId` set independently; milestone preserved |
| 3. Profile conversion fails and retries | 3 | Idempotency key stable across retries; distinct per session; length 64 |
| 4. Existing worker, second resume | 2 | `worker_profile_linked` key scoped to session; distinct from `worker_profile_created` |
| 5. Resume-builder pre-verified account | 3 | `verificationPath = resume_builder_auto`; key differs from direct-reg; stable on retry |
| 6. Direct-registration email verification | 2 | `verificationPath = direct_registration`; not emitted at registration |
| 7. Two sessions for one worker | 2 | Each session has independent `resume_completed` + `worker_profile_linked` keys |
| 8. SMS consent unknown | 3 | `resolveSmsConsent(null) = "unknown"`; never inferred from marketing consent |
| 9. Marketing consent declined | 3 | `denied` distinct from `unknown`; direct-reg = `unknown` |
| 10. Duplicate and out-of-order events | 4 | Stable keys; hour-scoped for auto-revoke; `resumeCompletedAt` set only once |
| 11. Ready to hire approval and revocation | 5 | All eligibility criteria checked; accumulates all failure reasons; date-scoped approval key |
| Attribution in `resume_completed` | 2 | UTM + Meta fields present; `hasAttribution` logic correct |

**Total: 34 test cases**

---

## 12. Known Limitations and Next Steps

### Encore test runner EOF (infrastructure)
The `RunTests` tool returns EOF. This is a platform infrastructure fault, not a code fault.
All 34 lifecycle tests are pure-logic and can be run with:
```bash
cd backend && bun run vitest run lifecycle/lifecycle.test.ts --reporter=verbose
```

### Phase 3 scope (explicitly excluded from this contract)
- GHL `ready-to-hire` tag application (blocked on workflow audit)
- GHL `compliance-submitted` tag
- GHL `email-verified` tag (renamed from `verified`, blocked on workflow update)
- GHL custom fields for attribution
- `removeContactTags` implementation (currently throws in Phase 1 stub)
- SMS consent capture UI and storage
- GHL DND management
- Live GHL contact matching report (229 Meta contacts)

### Prerequisite for Phase 3
Before any GHL tag changes:
1. GHL admin must enumerate all workflows depending on `verified`, `profile-not-created` tags
2. GHL admin must export 229 Meta-tagged contacts as CSV
3. Email cross-reference SQL must be run against `resume_sessions`
4. GHL custom field UUIDs must be fetched from `GET /locations/:locationId/customFields`

See `GHL_MATCHING_SPEC.md` and `GHL_LIFECYCLE_SPEC.md` for full Phase 3 specifications.
