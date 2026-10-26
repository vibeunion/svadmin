#!/usr/bin/env bash
set -euo pipefail

: "${SVADMIN_TEST_DB_PASSWORD:?set SVADMIN_TEST_DB_PASSWORD}"
: "${SVADMIN_TEST_DB_HOST:=127.0.0.1}"
: "${SVADMIN_TEST_DB_PORT:=15432}"

psql "postgresql://postgres:${SVADMIN_TEST_DB_PASSWORD}@${SVADMIN_TEST_DB_HOST}:${SVADMIN_TEST_DB_PORT}/svadmin_test" \
  -v ON_ERROR_STOP=1 \
  -v db_password="$SVADMIN_TEST_DB_PASSWORD" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT;
  END IF;
END
$$;

ALTER ROLE authenticator LOGIN PASSWORD :'db_password' NOINHERIT;
GRANT anon, authenticated TO authenticator;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.enterprise_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  title text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enterprise_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS enterprise_records_tenant_isolation ON public.enterprise_records;
CREATE POLICY enterprise_records_tenant_isolation
  ON public.enterprise_records
  FOR ALL
  TO authenticated
  USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id')
  WITH CHECK (tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_records TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

TRUNCATE public.enterprise_records;
INSERT INTO public.enterprise_records (tenant_id, title)
VALUES ('tenant-a', 'A private record'), ('tenant-b', 'B private record');
SQL
