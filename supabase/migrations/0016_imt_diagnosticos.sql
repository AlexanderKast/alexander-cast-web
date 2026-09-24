-- IA Master Tech: leads from the /diagnostico qualification form.
-- Written by app/actions/diagnostico.ts with the service role only.
-- NOT APPLIED YET: pending Alexander's approval.

create table if not exists public.imt_diagnosticos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  nombre text not null check (char_length(nombre) between 2 and 80),
  empresa text not null check (char_length(empresa) between 2 and 120),
  cargo text check (char_length(cargo) <= 80),
  whatsapp text not null check (char_length(whatsapp) between 7 and 20),
  email text not null check (char_length(email) <= 160),

  ventas_mensuales text check (ventas_mensuales in ('lt_50m', '50m_200m', '200m_1000m', 'gt_1000m')),
  tamano_equipo text check (tamano_equipo in ('1_5', '6_20', '21_50', '50_plus')),
  dolor text not null check (char_length(dolor) between 10 and 2000),
  herramientas text[] not null default '{}'
    check (herramientas <@ array['shopify', 'siigo', 'hubspot', 'excel', 'otras']::text[]),
  herramientas_otras text check (char_length(herramientas_otras) <= 200),
  inversion_mensual text check (inversion_mensual in ('lt_3_9m', '3_9m_7m', '7m_10m', 'gt_10m')),
  plan text check (plan in ('automatiza', 'acelera', 'escala')),

  -- Ley 1581 de 2012: explicit authorization and when it was given.
  consentimiento boolean not null check (consentimiento),
  consentimiento_at timestamptz not null default now(),

  estado text not null default 'nuevo' check (estado in ('nuevo', 'contactado', 'agendado', 'descartado', 'cliente'))
);

create index if not exists imt_diagnosticos_created_idx on public.imt_diagnosticos (created_at desc);
create index if not exists imt_diagnosticos_email_idx on public.imt_diagnosticos (lower(email));

alter table public.imt_diagnosticos enable row level security;

-- Same pattern as ac_contacts (0003): active admins read and update,
-- the service role (server action) has full access, anon has nothing.
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'imt_diagnosticos' and policyname = 'admin reads imt_diagnosticos') then
    create policy "admin reads imt_diagnosticos" on public.imt_diagnosticos for select to authenticated
      using (exists (select 1 from public.admin_users where auth_user_id = auth.uid() and is_active));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'imt_diagnosticos' and policyname = 'admin updates imt_diagnosticos') then
    create policy "admin updates imt_diagnosticos" on public.imt_diagnosticos for update to authenticated
      using (exists (select 1 from public.admin_users where auth_user_id = auth.uid() and is_active))
      with check (exists (select 1 from public.admin_users where auth_user_id = auth.uid() and is_active));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'imt_diagnosticos' and policyname = 'service role full access on imt_diagnosticos') then
    create policy "service role full access on imt_diagnosticos" on public.imt_diagnosticos for all
      using (auth.role() = 'service_role');
  end if;
end $$;
