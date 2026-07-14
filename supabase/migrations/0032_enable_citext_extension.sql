-- task-09m iteration 5: ensure citext exists for create_workspace slug casts.
-- 0001 creates citext but remote may have skipped extension bootstrap.
-- Superseded by 0034_citext_to_citext_helper.sql (to_citext helper + cast replacement).
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;
