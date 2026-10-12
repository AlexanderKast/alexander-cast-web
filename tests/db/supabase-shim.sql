-- Shim mínimo de Supabase para probar las migraciones mia_* sobre PostgreSQL REAL.
-- Reproduce lo que las migraciones asumen: roles de la API, auth.users y auth.uid()
-- (leído de request.jwt.claim.sub o de request.jwt.claims, como PostgREST). NO es Supabase
-- completo: no hay PostgREST ni GoTrue.

do $$ begin create role anon nologin noinherit; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin noinherit; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin noinherit bypassrls; exception when duplicate_object then null; end $$;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'), '')
  )::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Privilegios por defecto equivalentes a los de un proyecto Supabase (las migraciones los revocan donde toca).
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
