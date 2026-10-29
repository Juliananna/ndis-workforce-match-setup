# Phase 1 Migration Handover — GHL Integration

**Scope:** Additive database changes and new backend logic.  
**Phase 1 constraint:** No existing GHL contacts, tags, or workflows are altered.  
**Migrations:** 083, 084, 085

---

## Migration 083 — `083_ghl_attribution.up.sql`

### Table: `resume_sessions` — new columns

All columns are nullable. Existing rows receive `NULL` for all new columns.  
**First-touch semantics:** attribution columns are written once at session creation and never overwritten by subsequent requests.

| Column | Type | Description |
|---|---|---|
| `utm_source` | TEXT | UTM source parameter captured on landing (e.g. `meta`, `google`, `email`). `NULL` means attribution is unknown — not assumed organic. |
| `utm_medium` | TEXT | UTM medium (e.g. `cpc`, `social`, `email`). |
| `utm_campaign` | TEXT | UTM campaign name or ID. |
| `utm_content` | TEXT | UTM content variant. |
| `utm_term` | TEXT | UTM keyword term. |
| `meta_campaign_id` | TEXT | Meta Ads campaign ID from `_fbc` / `campaign_id` URL param. |
| `meta_adset_id` | TEXT | Meta Ads adset ID. |
| `meta_ad_id` | TEXT | Meta Ads ad creative ID. |
| `meta_lead_id` | TEXT | Meta Instant Form lead ID (from Meta Leads webhook). |
| `fbclid` | TEXT | Facebook click identifier from URL. Presence alone is sufficient to classify source as Meta. |
| `landing_page` | TEXT | URL path of the first page the session visitor landed on. |
| `ghl_contact_id` | TEXT | GHL contact ID written back after the first successful upsert. |
| `ghl_last_synced_at` | TIMESTAMPTZ | Timestamp of the most recent successful GHL sync for this session. |

### Indexes added on `resume_sessions`

- `resume_sessions_ghl_contact_id_idx` — partial index on `ghl_contact_id WHERE ghl_contact_id IS NOT NULL`

### Table: `workers` — new columns

| Column | Type | Description |
|---|---|---|
| `ghl_contact_id` | TEXT | GHL contact ID written back after the first successful upsert. |
| `ghl_last_synced_at` | TIMESTAMPTZ | Timestamp of the most recent successful GHL sync. |
| `ghl_sync_failed_at` | TIMESTAMPTZ | Timestamp of the most recent failed GHL sync attempt. `NULL` if no failure. |
| `ghl_sync_error` | TEXT | Error message from the most recent failed sync. Truncated to 500 chars. |
| `marketing_consent` | BOOLEAN | Denormalised from `resume_session_consents.consent_type = 'marketing_emails'`. `NULL` = never captured (existing accounts). |
| `marketing_consent_at` | TIMESTAMPTZ | Timestamp of the consent decision. |

### Indexes added on `workers`

- `workers_ghl_contact_id_idx` — partial index on `ghl_contact_id WHERE ghl_contact_id IS NOT NULL`

---

## Migration 084 — `084_ghl_sync_log.up.sql`

### Table: `ghl_sync_log` — new table

Append-only structured log of every GHL API attempt. Used by the reconciliation report and monitoring queries. Never deleted, never updated.

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Row identifier. |
| `attempted_at` | TIMESTAMPTZ | When the attempt was made. |
| `email` | TEXT | Email address of the contact being synced. |
| `entity_type` | TEXT CHECK | `resume_session`, `worker`, or `user`. |
| `entity_id` | TEXT | UUID of the entity (session ID, worker_id, or user_id). |
| `operation` | TEXT | Description of what was attempted (e.g. `upsert_contact`). |
| `success` | BOOLEAN | Whether the GHL API call succeeded. |
| `ghl_contact_id` | TEXT | GHL contact ID returned by a successful upsert. |
| `error_message` | TEXT | Error detail on failure. |
| `http_status` | INTEGER | HTTP status code returned by GHL. |

### Indexes

- `ghl_sync_log_email_idx` — `(email, attempted_at DESC)` for per-contact history
- `ghl_sync_log_failed_idx` — partial index on `success = FALSE` for failure monitoring
- `ghl_sync_log_entity_idx` — `(entity_type, entity_id, attempted_at DESC)` for per-entity history

---

## Migration 085 — `085_ready_to_hire.up.sql`

### Table: `workers` — additional columns

| Column | Type | Description |
|---|---|---|
| `ready_to_hire` | BOOLEAN NOT NULL DEFAULT FALSE | Current readiness state. Set to `TRUE` only via `POST /admin/workers/:workerId/approve-readiness`. Automatically set to `FALSE` when mandatory compliance expires or is revoked. |
| `ready_to_hire_approved_at` | TIMESTAMPTZ | When approval was granted. |
| `ready_to_hire_approved_by` | TEXT | Email of the admin who approved. |
| `ready_to_hire_revoked_at` | TIMESTAMPTZ | When readiness was revoked (manual or automatic). |
| `ready_to_hire_revoked_by` | TEXT | Email or `'system'` for automated revocations. |
| `ready_to_hire_revoke_reason` | TEXT | Free-text reason for revocation. |

### Table: `ready_to_hire_audit` — new table

Immutable append-only audit history of every readiness decision.

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Row identifier. |
| `worker_id` | UUID FK → workers | The worker this decision applies to. Cascades on delete. |
| `action` | TEXT CHECK | `approved`, `revoked`, or `auto_revoked`. |
| `acted_by_user_id` | UUID FK → users | Admin who acted. `NULL` for `auto_revoked`. |
| `acted_by_email` | TEXT | Email for display. `'system'` for `auto_revoked`. |
| `reason` | TEXT | Required for `revoked` and `auto_revoked`. |
| `eligible_doc_count` | INTEGER | Number of non-expired, non-flagged documents at time of decision. |
| `verified_doc_count` | INTEGER | Number of admin-verified, non-expired documents at time of decision. |
| `verified_ref_count` | INTEGER | Number of admin-verified references at time of decision. |
| `mandatory_doc_types` | TEXT[] | Which mandatory doc types were present at time of decision. |
| `eligibility_snapshot` | JSONB | Full `EligibilitySnapshot` object for retrospective audit. |
| `created_at` | TIMESTAMPTZ | When the record was created. |

### Index

- `ready_to_hire_audit_worker_idx` — `(worker_id, created_at DESC)`

---

## New API Endpoints

### Readiness Approval

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/workers/:workerId/readiness-eligibility` | Admin or Compliance | Returns current eligibility snapshot without making any changes. |
| `POST` | `/admin/workers/:workerId/approve-readiness` | Admin or Compliance | Approves readiness. Fails with `FailedPrecondition` if eligibility not met. Writes audit record and admin audit log. |
| `POST` | `/admin/workers/:workerId/revoke-readiness` | Admin or Compliance | Manually revokes readiness. Reason is required. Writes audit record and admin audit log. |
| `GET` | `/admin/workers/:workerId/readiness-audit` | Admin or Compliance | Full decision history in reverse chronological order. |

### GHL Reconciliation

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/ghl/reconciliation-report` | SysAdmin only | Read-only. Returns deduplicated unique-person list, GHL sync summary, and recent failures. Makes zero GHL API calls. |

---

## Readiness Eligibility Rules

A worker is eligible for the `ready_to_hire` flag if and only if **all** of the following are true:

1. **Email is verified** (`users.is_verified = TRUE`)
2. **NDIS Worker Screening Check** — at least one verified, non-expired document of this type
3. **Police Clearance** — at least one verified, non-expired document of this type
4. **Two verified professional references** — `worker_references.status = 'Verified'` count ≥ 2

### Automatic Revocation

Readiness is automatically revoked (without admin action) when:
- A mandatory compliance document is flagged via `POST /admin/documents/:documentId/verify` with `action: "flag"`
- `syncOnboardingStatus` drops the worker to `compliance_required` (triggered when the last eligible document expires or is removed)

Automatic revocations write an `auto_revoked` record to `ready_to_hire_audit` with `acted_by_email = 'system'` and a machine-generated reason string describing exactly which condition failed.

---

## Attribution Semantics

### First-touch rule

Attribution columns on `resume_sessions` are written once at session creation (`POST /resume-sessions`) and are never overwritten by subsequent `PATCH /resume-sessions/:id` calls.

If no UTM or Meta params are present at session creation time, all attribution columns remain `NULL`. `NULL` means **unknown** — it is never assumed to be organic traffic.

### Source classification

| Condition | Classified as |
|---|---|
| `fbclid` IS NOT NULL | `meta` |
| `meta_campaign_id` IS NOT NULL | `meta` |
| `utm_source = 'meta'` or `'facebook'` | `meta` |
| `utm_source` IS NOT NULL (other value) | that value |
| All attribution columns NULL | `unknown` |

---

## Funnel Stats — New Fields

`GET /admin/stats` returns the following new fields alongside existing ones:

| Field | Description |
|---|---|
| `funnelUniquePeople` | Unique individuals (by email) across resume sessions and worker accounts. One person is counted once regardless of how many sessions they have. |
| `funnelResumeLeadsOnly` | Unique people with a resume session but no converted worker account. |
| `funnelConvertedToAccount` | Unique people who have a registered worker account (regardless of whether they came via resume builder). |
| `funnelVerifiedWorkers` | Unique people with a verified (`is_verified = TRUE`) worker account. |
| `funnelReadyToHire` | Unique people marked `ready_to_hire = TRUE`. |
| `funnelConversionRatePct` | `funnelConvertedToAccount / funnelUniquePeople * 100`, rounded to nearest integer. 0 if no people. |

---

## GHL Client Changes

### Retry policy

`upsertContact` now retries on HTTP 429, 502, 503, 504 with delays of 1 s, 3 s, 9 s before giving up. Non-retryable errors (400, 401, 403, 404, 422, 500) fail immediately.

### `removeContactTags` — Phase 1 stub

`removeContactTags(contactId, tags)` throws unconditionally in Phase 1. It must not be called in any Phase 1 code path. It will be implemented in Phase 2 after GHL workflow audit is complete.

### `writeSyncLog`

New exported function. Writes one row to `ghl_sync_log`. Should be called in every catch block that handles a GHL upsert failure, and after every successful upsert where a `ghl_contact_id` is returned.

---

## Files Changed

| File | Type | Description |
|---|---|---|
| `backend/db/migrations/083_ghl_attribution.up.sql` | New migration | Attribution + GHL tracking columns |
| `backend/db/migrations/084_ghl_sync_log.up.sql` | New migration | Sync log table |
| `backend/db/migrations/085_ready_to_hire.up.sql` | New migration | Readiness approval columns and audit table |
| `backend/ghl/client.ts` | Modified | Retry logic, structured logging, removeContactTags stub |
| `backend/ghl/reconciliation.ts` | New file | Read-only reconciliation report endpoint |
| `backend/ghl/client.test.ts` | New test | Retry policy, log shape, stub guard |
| `backend/ghl/reconciliation.test.ts` | New test | Deduplication and totals logic |
| `backend/resume/session_create.ts` | Modified | Attribution params, first-touch persistence |
| `backend/resume/session_helpers.ts` | Modified | rowToSession extended with attribution fields |
| `backend/resume/types.ts` | Modified | ResumeSession extended with attribution fields |
| `backend/resume/attribution.test.ts` | New test | Attribution classification and first-touch preservation |
| `backend/admin/readiness_eligibility.ts` | New file | Pure eligibility computation function |
| `backend/admin/readiness_auto_revoke.ts` | New file | Automatic revocation on compliance events |
| `backend/admin/approve_readiness.ts` | New file | Approval, revocation, and audit history endpoints |
| `backend/admin/readiness_eligibility.test.ts` | New test | Eligibility business rules |
| `backend/admin/funnel_stats.test.ts` | New test | Deduplication and conversion rate |
| `backend/admin/platform.ts` | Modified | New funnel stats fields; deduplicated CTE query |
| `backend/admin/verify_document.ts` | Modified | Calls autoRevokeReadinessIfInvalid after flag action |
| `backend/workers/compliance_status.ts` | Modified | Calls autoRevokeReadinessIfInvalid when status drops |

---

## What Is NOT Changed in Phase 1

- No existing GHL contacts are modified
- No existing tags are added, removed, or renamed
- No GHL workflows, pipelines, or automations are touched
- The `verified` tag continues to be applied exactly as before
- `bulk_sync.ts`, `sync_verified.ts`, `sync_subscription.ts` are unchanged
- `email_capture.ts`, `convert_helpers.ts`, `register.ts` GHL calls are unchanged

These are all Phase 2 changes, pending GHL workflow audit.
