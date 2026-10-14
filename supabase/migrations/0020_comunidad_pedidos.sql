-- ============================================================
-- 0020 · Comunidad Master IA 360 — compra y pagos (Stripe)
--
-- Solo el servidor escribe y lee estas tablas (service role). RLS activo y
-- SIN politicas: ni anon ni authenticated pueden tocarlas desde el navegador.
--
-- Reglas de dinero (heredadas de Imperio CRM):
--   * El webhook nunca confia en el cuerpo del evento: consulta a Stripe.
--   * Monto y moneda se comparan con el pedido; si no calzan, va a 'revision'.
--   * Un pago confirmado no retrocede por un evento tardio (fallido/expirado).
--   * Cada evento de Stripe se procesa una sola vez (stripe_event_id unico).
-- ============================================================

create table if not exists public.mia_pedidos (
  id                       uuid primary key default gen_random_uuid(),
  email                    text not null,
  nombre                   text not null,
  whatsapp                 text,
  monto_centavos           integer not null check (monto_centavos > 0),
  moneda                   text not null default 'usd',
  estado                   text not null default 'pendiente'
                           check (estado in ('pendiente','pagado','fallido','abandonado',
                                             'reembolsado','disputa','revision')),
  motivo_revision          text,
  origen                   text not null default 'web' check (origen in ('web','stand')),
  stripe_session_id        text unique,
  stripe_payment_intent    text,
  checkout_url             text,
  -- Consentimiento Ley 1581: lo da el comprador, en su pantalla, antes de pagar.
  privacidad_aceptada_en   timestamptz not null,
  privacidad_ip            text,
  -- Resultado de la compra
  user_id                  uuid references auth.users(id) on delete set null,
  cohorte_id               uuid references public.mia_cohortes(id),
  aprovisionado_en         timestamptz,
  error_aprovisionamiento  text,
  pagado_en                timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists mia_pedidos_email_idx  on public.mia_pedidos (lower(email));
create index if not exists mia_pedidos_estado_idx on public.mia_pedidos (estado, created_at desc);
create index if not exists mia_pedidos_pi_idx     on public.mia_pedidos (stripe_payment_intent);

drop trigger if exists mia_pedidos_touch on public.mia_pedidos;
create trigger mia_pedidos_touch before update on public.mia_pedidos
  for each row execute function public.mia_touch_updated_at();

-- Bitacora cruda de webhooks. La unicidad del id del evento es la defensa
-- contra el reintento y la doble entrega.
create table if not exists public.mia_eventos_stripe (
  stripe_event_id  text primary key,
  tipo             text not null,
  payload          jsonb not null,
  resultado        text,
  error            text,
  recibido_en      timestamptz not null default now(),
  procesado_en     timestamptz
);
create index if not exists mia_eventos_stripe_tipo_idx on public.mia_eventos_stripe (tipo, recibido_en desc);

alter table public.mia_pedidos        enable row level security;
alter table public.mia_eventos_stripe enable row level security;

revoke all on public.mia_pedidos, public.mia_eventos_stripe from anon, authenticated;
