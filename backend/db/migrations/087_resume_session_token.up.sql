-- Migration 087 was applied in a prior environment state with different content
-- (it added a 'session_token' TEXT column which is now unused).
-- Migration 089 adds the 'session_token_hash' column used by all current code.
-- This file is intentionally kept as a no-op to preserve migration numbering.
-- DO NOT re-apply or modify.
SELECT 1;
