# Resume Session Token — Migration History Notes

## Summary

Migrations 087, 089, 090, and 091 together implement secure session tokens for the resume
builder. This document records what each migration actually does in existing and fresh
environments.

---

## Migration 087 — `087_resume_session_token.up.sql`

**Status in production DB:** Applied. In the prior session, migration 087 was applied with
different content (it added a `session_token TEXT DEFAULT gen_random_uuid()` column).
That column is now an orphan — no code reads or writes it.

**Current file content:** `SELECT 1` (deliberate no-op).

**Fresh environments:** Runs `SELECT 1` — has no effect. `session_token_hash` is added by 089.

**Production environments:** Already applied at an earlier version. Golang-migrate tracks only
version number, not file checksum, so re-running is not attempted. No action required.

**Column `session_token` (orphan):**
The original column (`session_token TEXT`) is present in production but unused.
It can be dropped in a future maintenance migration:

```sql
-- Safe to run as a future migration (e.g., 092):
ALTER TABLE resume_sessions DROP COLUMN IF EXISTS session_token;
```

---

## Migration 089 — `089_session_token_hash.up.sql`

**Effect:** Adds `session_token_hash TEXT` (nullable) with a partial index.

```sql
ALTER TABLE resume_sessions ADD COLUMN IF NOT EXISTS session_token_hash TEXT;
CREATE INDEX IF NOT EXISTS resume_sessions_token_hash_idx
  ON resume_sessions (session_token_hash)
  WHERE session_token_hash IS NOT NULL;
```

**Fresh environments:** Adds the column after 087's no-op. No conflict.
**Production environments:** `ADD COLUMN IF NOT EXISTS` is idempotent. Safe.
**Planned Codex / migration environment:** Same — idempotent, no conflict with 087.

---

## Migration 090 — `090_pending_link_worker.up.sql`

**Effect:** Adds `pending_link_worker_id UUID` with a FK to `workers(worker_id)`.

```sql
ALTER TABLE resume_sessions
  ADD COLUMN IF NOT EXISTS pending_link_worker_id UUID
    REFERENCES workers(worker_id) ON DELETE SET NULL;
```

**All environments:** `ADD COLUMN IF NOT EXISTS` — idempotent. Safe.

---

## Migration 091 — `091_backfill_session_token_hashes.up.sql`

**Effect:** Stamps a random MD5 placeholder hash on all legacy sessions that have a known
`converted_worker_id` but no `session_token_hash`.

```sql
UPDATE resume_sessions
SET session_token_hash = md5(random()::text || id::text || clock_timestamp()::text),
    updated_at = NOW()
WHERE session_token_hash IS NULL
  AND converted_worker_id IS NOT NULL;
```

**Why MD5 and not a real token?**
The placeholder hash is never usable for direct session access — nobody knows the corresponding
pre-hash string. Its only purpose is to change the column from NULL to non-NULL, which:
1. Prevents `verifySessionToken` from returning the "legacy session" 403 message.
2. Allows `workerCreateOrGetSession` (authenticated endpoint) to ROTATE it to a real token
   on the worker's next login, via `ensureTokenOnSession`.

**Recovery flow:**
1. Worker logs in → calls `workerCreateOrGetSession` (authenticated).
2. `ensureTokenOnSession` sees `session_token_hash IS NOT NULL` → generates fresh token,
   replaces the MD5 placeholder with the real hash.
3. Returns the new plain token to the frontend.
4. Frontend stores it in localStorage.
5. All subsequent protected calls succeed.

The placeholder hash does NOT permanently block access; it is always rotated by the
authenticated recovery path.

**Sessions with `converted_worker_id = NULL` and `session_token_hash = NULL`:**
These are anonymous legacy sessions (no linked account). They remain permanently blocked
with a 403 directing the user to contact support. This is the correct security posture.

---

## Fresh Install Sequence

On a brand-new database, migrations run in order:

| # | File | Effect |
|---|------|--------|
| 087 | `087_resume_session_token.up.sql` | `SELECT 1` — no-op |
| 089 | `089_session_token_hash.up.sql` | Adds `session_token_hash TEXT` |
| 090 | `090_pending_link_worker.up.sql` | Adds `pending_link_worker_id UUID FK` |
| 091 | `091_backfill_session_token_hashes.up.sql` | UPDATE with 0 rows affected (no legacy data) |

Result: schema is correct, no conflicts, no orphan columns (087 no-op means `session_token`
is never created in fresh environments).

---

## Codex / Google Migration Environment

The Codex environment receives a fresh schema. The migration sequence above applies cleanly.
No destructive operations in any of these migrations. No `DROP COLUMN`, no `ALTER TYPE`,
no `TRUNCATE`.
