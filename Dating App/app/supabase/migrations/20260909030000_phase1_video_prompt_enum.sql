-- A new enum value cannot be referenced (e.g. in a CHECK constraint or a
-- function body) inside the same transaction that adds it -- Postgres
-- refuses with "unsafe use of new value of enum type" until that
-- transaction commits. Kept as its own migration file for exactly that
-- reason: everything that reads 'video_prompt' lives in the next file.
alter type public.upload_kind add value 'video_prompt';
