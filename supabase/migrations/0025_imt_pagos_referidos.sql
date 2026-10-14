-- IA Master Tech: pago directo con Stripe + programa de referidos.
-- Todo se escribe con service role (checkout, webhook, acciones de servidor);
-- los admins activos solo leen. anon no tiene acceso a nada.
-- NOT APPLIED YET: pendiente de aprobación de Alexander.

-- ── Referidores ─────────────────────────────────────────────────────────
create table if not exists public.imt_referidores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  codigo text not null unique check (codigo ~ '^[A-Z0-9]{4,24}$'),
  -- Secreto del panel /referidos/panel/<token>. Solo se entrega por correo.
  token_panel text not null unique default replace(gen_random_uuid()::text, '-', ''),

  nombre text not null check (char_length(nombre) between 2 and 80),
  email text not null check (char_length(email) <= 160),
  whatsapp text not null check (char_length(whatsapp) between 7 and 20),

  estado text not null default 'activo' check (estado in ('activo', 'pausado')),
  -- Ley 1581 de 2012: autorización explícita y cuándo se dio.
  consentimiento boolean not null check (consentimiento),
  consentimiento_at timestamptz not null default now(),
  notas text check (char_length(notas) <= 500)
);

create unique index if not exists imt_referidores_email_idx on public.imt_referidores (lower(email));

-- ── Pedidos ─────────────────────────────────────────────────────────────
create table if not exists public.imt_pedidos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  plan text not null check (plan in ('automatiza', 'acelera', 'escala')),
  periodo text not null check (periodo in ('mensual', 'anual')),
  -- Primer cobro en COP enteros (anual = fee x 10).
  importe_cop bigint not null check (importe_cop > 0),
  moneda text not null default 'COP' check (moneda = 'COP'),

  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'pagado', 'fallido', 'expirado', 'reembolsado')),
  -- Solo aplica a mensual: estado de la suscripción en Stripe.
  suscripcion_estado text check (suscripcion_estado in ('activa', 'en_mora', 'cancelada')),

  nombre text not null check (char_length(nombre) between 2 and 80),
  empresa text not null check (char_length(empresa) between 2 and 120),
  email text not null check (char_length(email) <= 160),
  whatsapp text not null check (char_length(whatsapp) between 7 and 20),
  consentimiento boolean not null check (consentimiento),
  consentimiento_at timestamptz not null default now(),

  stripe_session_id text unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_intent_id text,

  referidor_id uuid references public.imt_referidores (id) on delete set null,
  ref_codigo text,

  pagado_at timestamptz,
  -- Fin del contrato mínimo de 3 meses (pagado_at + 3 meses).
  minimo_hasta timestamptz
);

create index if not exists imt_pedidos_estado_idx on public.imt_pedidos (estado, created_at desc);
create index if not exists imt_pedidos_email_idx on public.imt_pedidos (lower(email));
create index if not exists imt_pedidos_subscription_idx on public.imt_pedidos (stripe_subscription_id);
create index if not exists imt_pedidos_customer_idx on public.imt_pedidos (stripe_customer_id);
create index if not exists imt_pedidos_pi_idx on public.imt_pedidos (stripe_payment_intent_id);
create index if not exists imt_pedidos_referidor_idx on public.imt_pedidos (referidor_id);

-- ── Cobros (cada factura/pago confirmado, para ver renovaciones) ─────────
create table if not exists public.imt_cobros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pedido_id uuid not null references public.imt_pedidos (id) on delete cascade,
  stripe_invoice_id text unique,
  monto_cop bigint not null check (monto_cop >= 0),
  pagado_at timestamptz not null default now()
);

create index if not exists imt_cobros_pedido_idx on public.imt_cobros (pedido_id, pagado_at desc);

-- ── Comisiones (una por pedido: solo el primer pago comisiona) ───────────
create table if not exists public.imt_comisiones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  referidor_id uuid not null references public.imt_referidores (id) on delete restrict,
  pedido_id uuid not null unique references public.imt_pedidos (id) on delete restrict,

  base_cop bigint not null check (base_cop > 0),
  porcentaje numeric(5, 2) not null check (porcentaje > 0 and porcentaje <= 100),
  monto_cop bigint not null check (monto_cop > 0),

  -- en_revision: hubo reembolso cuando la comisión ya estaba pagada.
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'pagada', 'anulada', 'en_revision')),
  pagada_at timestamptz,
  referencia_pago text check (char_length(referencia_pago) <= 200),
  notas text check (char_length(notas) <= 500)
);

create index if not exists imt_comisiones_referidor_idx on public.imt_comisiones (referidor_id, created_at desc);
create index if not exists imt_comisiones_estado_idx on public.imt_comisiones (estado);

-- ── Eventos de Stripe (idempotencia del webhook) ─────────────────────────
create table if not exists public.imt_eventos_stripe (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  stripe_event_id text not null unique,
  tipo text not null,
  livemode boolean not null default true,
  estado text not null default 'recibido' check (estado in ('recibido', 'procesado', 'ignorado', 'error')),
  error text,
  procesado_at timestamptz,
  payload jsonb not null
);

-- ── RLS: admins activos leen; service role escribe; anon nada ────────────
do $$
declare
  t text;
begin
  foreach t in array array['imt_referidores', 'imt_pedidos', 'imt_cobros', 'imt_comisiones', 'imt_eventos_stripe']
  loop
    execute format('alter table public.%I enable row level security', t);

    if not exists (select 1 from pg_policies where tablename = t and policyname = 'admin reads ' || t) then
      execute format(
        'create policy %I on public.%I for select to authenticated
           using (exists (select 1 from public.admin_users where auth_user_id = auth.uid() and is_active))',
        'admin reads ' || t, t);
    end if;

    if not exists (select 1 from pg_policies where tablename = t and policyname = 'service role full access on ' || t) then
      execute format(
        'create policy %I on public.%I for all using (auth.role() = ''service_role'')',
        'service role full access on ' || t, t);
    end if;
  end loop;
end $$;

-- Sin acceso directo para anon/authenticated a las escrituras: solo service role.
revoke insert, update, delete on public.imt_referidores, public.imt_pedidos, public.imt_cobros,
  public.imt_comisiones, public.imt_eventos_stripe from anon, authenticated;
