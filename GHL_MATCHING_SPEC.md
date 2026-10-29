# GHL Integration – Reconciliation Scope Clarification and Matching Specification

## Clarification: What the Reconciliation Report Actually Does

`GET /admin/ghl/reconciliation-report` is an **internal Kizazi reconciliation report only**.

It does **not**:
- Read any data from GHL's API
- Query live GHL contacts
- Verify that a Kizazi record corresponds to any GHL contact
- Detect duplicate or merged GHL contacts
- Confirm that a stored `ghl_contact_id` still exists in GHL

It does:
- Query Kizazi's database (`workers`, `users`, `resume_sessions`, `ghl_sync_log`)
- Report on the internal state of GHL sync tracking columns (`ghl_contact_id`, `ghl_last_synced_at`, `ghl_sync_failed_at`, `ghl_sync_error`)
- Deduplicate by email across worker accounts and unconverted resume sessions
- Surface records that have never been synced, records where the last sync failed, and the 50 most recent sync failures from `ghl_sync_log`

The label in the API response already includes `"generatedAt"` to convey that it reflects a point-in-time snapshot, but the endpoint **must be described to operators** as:

> "Internal sync-state report. This report shows what Kizazi believes about GHL sync status. It does not read live GHL data."

This will be enforced by adding a `disclaimer` field to the response in Phase 2.

---

## The 229 Meta-Tagged GHL Contacts vs 101 Kizazi Resume Leads

### Background

The current state, as established by the audit:

| Set | Source | Count (as provided) |
|---|---|---|
| GHL contacts with `meta` (or similar) tag | Live GHL contacts | 229 |
| Kizazi `resume_sessions` with email captured | Kizazi database | 101 |

These two sets exist independently. There is no `ghl_contact_id` stored against Kizazi resume sessions for contacts created before Phase 1 was deployed (all 101 are legacy records). The 229 GHL contacts were created by various means — some by the existing `upsertContact` calls, others potentially by GHL Ads leads, manual entry, or GHL's own Meta ad integration if enabled.

### What "Matching" Would Mean

Matching means: for each GHL contact, determine whether a corresponding Kizazi record exists (by email), and produce a reconciled view of:
- Which GHL contacts have no Kizazi account at all
- Which GHL contacts map to a Kizazi resume session only (not a full account)
- Which GHL contacts map to a full verified Kizazi worker account
- Which Kizazi resume leads have no corresponding GHL contact

### Specification for the Matching Process

**This requires a new GHL API capability that does not yet exist in the codebase.** It requires:

1. **A GHL contact search/list function** — calls `GET /contacts/search` or `GET /contacts` with location filtering and tag filtering. The GHL API supports this via:
   - `GET /contacts?locationId={id}&query={email}` for individual lookups
   - `GET /contacts?locationId={id}&tags=meta` for bulk tag filtering (pagination required)

2. **A matching algorithm** — by normalised email address (lowercase, trimmed). Phone-based fallback only as secondary.

3. **A read-only report endpoint** — produces the reconciled view without writing to either system.

4. **No writes to GHL contacts** — matching is purely a read operation.

### Proposed Implementation (Phase 2, after GHL workflow audit)

#### New function: `backend/ghl/client.ts`

```typescript
export interface GHLContactSearchResult {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  tags: string[];
  dateAdded: string;
}

export async function searchContactsByTag(
  tag: string,
  limit = 100
): Promise<GHLContactSearchResult[]>
```

Calls `GET /contacts?locationId={id}&tags={tag}&limit={limit}` with pagination.  
All results are returned read-only. No writes.

#### New endpoint: `backend/ghl/match_report.ts`

```
GET /admin/ghl/match-report?tag=meta
```

Auth: SysAdmin only.

Steps:
1. Fetch all GHL contacts with the requested tag via `searchContactsByTag`
2. For each GHL contact, normalise email and look up in Kizazi:
   - `users` table → worker account present?
   - `resume_sessions` table → resume session present?
3. For all Kizazi resume sessions with emails, look up GHL contacts:
   - Match by normalised email against the fetched GHL contact list
4. Return three groups:
   - `ghlOnly` — GHL contacts with no matching Kizazi record
   - `sessionOnly` — Kizazi resume sessions with no matching GHL contact
   - `matched` — records found in both, with their GHL contact ID and Kizazi session/worker IDs

Response structure:
```typescript
interface MatchReport {
  generatedAt: Date;
  disclaimer: string;
  ghlTagQueried: string;
  totalGhlContacts: number;
  totalKizaziLeads: number;
  matchedCount: number;
  ghlOnlyCount: number;
  sessionOnlyCount: number;
  ghlOnly: MatchedContact[];
  sessionOnly: MatchedContact[];
  matched: MatchedContact[];
}
```

**Constraint:** This endpoint makes only `GET` calls to GHL. It never calls `POST /contacts/upsert` or any mutation endpoint. It cannot merge, delete, or modify any GHL contact.

### Immediate Next Step (Before Phase 2 Code)

Before implementing the match report, someone with GHL admin access must:

1. Export the list of 229 contacts with the `meta` tag (or whichever tag identifies Meta Ads leads) from GHL → Contacts → Export CSV
2. Cross-reference the exported email column against the 101 emails in Kizazi's `resume_sessions` table using:
   ```sql
   SELECT rs.email, rs.id, rs.status, rs.converted_worker_id
   FROM resume_sessions rs
   WHERE rs.email IS NOT NULL
   ORDER BY rs.created_at DESC;
   ```
3. Identify: how many of the 101 are in the 229? How many of the 229 have no Kizazi record?
4. Share findings before any code is written for the match report — the gap size determines whether automated matching is even worth building vs. a one-time manual reconciliation.

### Constraints in All Phases

- No GHL contacts are merged, deleted, or modified
- No Kizazi records are modified based on GHL state
- Matching is read-only and advisory
- GHL remains the source of truth for contact-level data; Kizazi remains the source of truth for compliance and readiness data
