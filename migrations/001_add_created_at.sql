-- Existing D1 databases: run once
-- wrangler d1 execute <DB_NAME> --file=./migrations/001_add_created_at.sql
ALTER TABLE short_url ADD COLUMN created_at TEXT;
