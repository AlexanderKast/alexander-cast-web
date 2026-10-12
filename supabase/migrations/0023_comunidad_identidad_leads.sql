-- ============================================================
-- 0023 · Comunidad: identidad ≠ lead ≠ pedido ≠ inscripcion
--
-- MIGRACION LOCAL, ADITIVA. NO aplicada en remoto: aplicar antes de desplegar
-- el codigo que la usa (columnas nuevas en mia_perfiles / mia_inscripciones /
-- mia_pedidos y las tablas mia_leads y mia_registros_pendientes).
--
-- Resumen:
--   * mia_leads: solicitudes de informacion y lista de espera. Sin lectura
--     publica, sin cuenta, sin pedido, sin reserva de cupo.
--   * mia_registros_pendientes: datos del registro hasta verificar el correo
--     (caducan a las 48 h). Solo se aplican a la identidad VERIFICADA.
--   * mia_inscripciones.estado: 'activa' | 'revocada' (reembolso total / disputa).
--   * mia_perfiles: consentimiento de marketing separado del de privacidad.
--   * mia_pedidos.reservado_hasta + mia_fijar_nivel(): el cupo se reserva de
--     forma ATOMICA (advisory lock) al elegir entrada, no con un conteo previo.
--   * RLS de mia_fichas: ademas de ser el dueno, la inscripcion debe estar vigente.
-- ============================================================

-- ── Leads ────────────────────────────────────────────────────
create table if not exists public.mia_leads (
  id                      uuid primary key default gen_random_uuid(),
  -- Idempotencia: el formulario genera una llave por carga; reintentar no duplica.
  request_key             uuid not null unique,
  nombre                  text not null check (char_length(nombre) between 2 and 120),
  email_normalized        text not null check (email_normalized = lower(email_normalized)
                                               and char_length(email_normalized) <= 200),
  whatsapp                text check (whatsapp is null or char_length(whatsapp) <= 30),
  intencion               text not null check (intencion in ('informacion', 'lista_espera')),
  origen                  text not null default 'web' check (origen in ('web', 'stand')),
  utm_source              text check (char_length(utm_source)   <= 100),
  utm_medium              text check (char_length(utm_medium)   <= 100),
  utm_campaign            text check (char_length(utm_campaign) <= 100),
  utm_content             text check (char_length(utm_content)  <= 100),
  utm_term                text check (char_length(utm_term)     <= 100),
  privacidad_aceptada_en  timestamptz not null,
  privacidad_version      text not null,
  -- Solo si lo marco: contactar para promociones. Distinto del consentimiento de servicio.
  marketing_aceptado_en   timestamptz,
  created_at              timestamptz not null default now()
);
create index if not exists mia_leads_email_idx on public.mia_leads (email_normalized, created_at desc);
create index if not exists mia_leads_intencion_idx on public.mia_leads (intencion, created_at desc);

-- ── Registros pendientes de verificar ────────────────────────
create table if not exists public.mia_registros_pendientes (
  id                      uuid primary key default gen_random_uuid(),
  email_normalized        text not null check (email_normalized = lower(email_normalized)),
  nombre                  text not null check (char_length(nombre) between 2 and 120),
  whatsapp                text check (whatsapp is null or char_length(whatsapp) <= 30),
  privacidad_aceptada_en  timestamptz not null,
  privacidad_version      text not null,
  marketing_aceptado_en   timestamptz,
  created_at              timestamptz not null default now(),
  expires_at              timestamptz not null default (now() + interval '48 hours')
);
create index if not exists mia_registros_pendientes_email_idx on public.mia_registros_pendientes (email_normalized);
create index if not exists mia_registros_pendientes_exp_idx   on public.mia_registros_pendientes (expires_at);

alter table public.mia_leads                 enable row level security;
alter table public.mia_registros_pendientes  enable row level security;
revoke all on public.mia_leads, public.mia_registros_pendientes from anon, authenticated;

-- ── Perfiles: consentimientos separados ──────────────────────
alter table public.mia_perfiles add column if not exists marketing_aceptado_en timestamptz;
alter table public.mia_perfiles add column if not exists privacidad_version text;

-- ── Inscripciones: estado del derecho de acceso ──────────────
alter table public.mia_inscripciones
  add column if not exists estado text not null default 'activa'
  check (estado in ('activa', 'revocada'));

-- ── Pedidos: reserva de cupo con vencimiento ─────────────────
alter table public.mia_pedidos add column if not exists reservado_hasta timestamptz;
create index if not exists mia_pedidos_reserva_idx on public.mia_pedidos (reservado_hasta)
  where reservado_hasta is not null;

-- Elegir entrada Y reservar cupo en una sola operacion atomica.
-- Dos compradores simultaneos no pueden quedarse con el ultimo cupo: el lock los serializa.
-- Devuelve: 'ok' | 'sin_cupo_total' | 'sin_cupo_vip' | 'pedido_no_editable'.
create or replace function public.mia_fijar_nivel(
  p_pedido  uuid,
  p_nivel   text,
  p_monto   integer,
  p_bonus   boolean,
  p_total   integer,
  p_vip     integer
) returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_insc       integer;
  v_insc_vip   integer;
  v_pag        integer;
  v_pag_vip    integer;
  v_res        integer;
  v_res_vip    integer;
  v_filas      integer;
begin
  perform pg_advisory_xact_lock(hashtext('mia_cupos'));

  select count(*), count(*) filter (where entrada = 'vip')
    into v_insc, v_insc_vip
  from mia_inscripciones where estado = 'activa';

  select count(*), count(*) filter (where nivel = 'vip')
    into v_pag, v_pag_vip
  from mia_pedidos where estado = 'pagado' and aprovisionado_en is null;

  select count(*), count(*) filter (where nivel = 'vip')
    into v_res, v_res_vip
  from mia_pedidos
  where estado = 'pendiente' and reservado_hasta > now() and id <> p_pedido;

  if v_insc + v_pag + v_res >= p_total then
    return 'sin_cupo_total';
  end if;
  if p_nivel = 'vip' and v_insc_vip + v_pag_vip + v_res_vip >= p_vip then
    return 'sin_cupo_vip';
  end if;

  update mia_pedidos
     set nivel = p_nivel,
         monto_centavos = p_monto,
         bonus_incluido = p_bonus,
         estado = 'pendiente',
         reservado_hasta = now() + interval '35 minutes'
   where id = p_pedido
     and estado in ('pendiente', 'abandonado', 'fallido');
  get diagnostics v_filas = row_count;

  return case when v_filas = 1 then 'ok' else 'pedido_no_editable' end;
end;
$$;

revoke execute on function public.mia_fijar_nivel(uuid, text, integer, boolean, integer, integer)
  from public, anon, authenticated;

-- ── RLS de fichas: dueno + inscripcion vigente ───────────────
-- Una cuenta sin inscripcion, con la inscripcion revocada o vencida no lee ni escribe.
drop policy if exists mia_fichas_select on public.mia_fichas;
create policy mia_fichas_select on public.mia_fichas
  for select to authenticated
  using (
    public.mia_es_staff()
    or exists (
      select 1 from public.mia_inscripciones i
      where i.id = inscripcion_id
        and i.user_id = auth.uid()
        and i.estado = 'activa'
        and (i.comunidad_vence_en is null or i.comunidad_vence_en > now())
    )
  );

drop policy if exists mia_fichas_insert on public.mia_fichas;
create policy mia_fichas_insert on public.mia_fichas
  for insert to authenticated
  with check (
    exists (
      select 1 from public.mia_inscripciones i
      where i.id = inscripcion_id
        and i.user_id = auth.uid()
        and i.estado = 'activa'
        and (i.comunidad_vence_en is null or i.comunidad_vence_en > now())
    )
  );

drop policy if exists mia_fichas_update on public.mia_fichas;
create policy mia_fichas_update on public.mia_fichas
  for update to authenticated
  using (
    exists (
      select 1 from public.mia_inscripciones i
      where i.id = inscripcion_id
        and i.user_id = auth.uid()
        and i.estado = 'activa'
        and (i.comunidad_vence_en is null or i.comunidad_vence_en > now())
    )
  )
  with check (
    exists (
      select 1 from public.mia_inscripciones i
      where i.id = inscripcion_id
        and i.user_id = auth.uid()
        and i.estado = 'activa'
        and (i.comunidad_vence_en is null or i.comunidad_vence_en > now())
    )
  );
