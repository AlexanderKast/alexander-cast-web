-- ============================================================
-- 0024 · Comunidad: plataforma MULTIPROGRAMA (cuenta primero, compra dentro)
--
-- MIGRACION LOCAL, ADITIVA Y REVERSIBLE (ver bloque REVERSA al final). NO aplicada en remoto.
--
-- Modelo:
--   mia_productos      programas (y upsells) del catalogo. Master IA 360 es el primero y unico conocido.
--   mia_cohortes       ahora pertenecen a un producto y pueden tener capacidad.
--   mia_ofertas        variantes con precio, ventana de venta, cupos propios y derechos que otorgan.
--   mia_inscripciones  = DERECHO DE ACCESO por producto/cohorte (se conserva el nombre por compatibilidad):
--                      una persona puede tener varios, uno por programa/cohorte.
--   mia_pedidos        cada pedido NUEVO exige user_id verificado + producto + oferta + snapshot.
--                      Los anteriores (compra invitada) quedan marcados historico = true.
--   mia_oportunidades  venta asistida: vinculada a cuenta y producto, con comercial asignado.
--
-- Reglas de seguridad aqui, en la base (no solo en la interfaz):
--   * Crear cuenta / pedir asesor NO reserva cupo ni da acceso.
--   * mia_crear_pedido valida oferta, ventana, requisitos de upsell, solape y cupos de forma ATOMICA.
--   * Una oportunidad solo pasa a 'ganada' si su pedido esta 'pagado'.
--   * Solo el servidor (service role) concede derechos; ningun rol de la API escribe pedidos/derechos.
-- ============================================================

-- ── Rol comercial (minimo privilegio: NO es staff ni admin) ──
alter table public.mia_perfiles drop constraint if exists mia_perfiles_rol_check;
alter table public.mia_perfiles
  add constraint mia_perfiles_rol_check check (rol in ('alumno', 'moderador', 'admin', 'comercial'));

create or replace function public.mia_es_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.mia_perfiles where user_id = auth.uid() and rol = 'admin');
$$;

create or replace function public.mia_es_comercial()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.mia_perfiles where user_id = auth.uid() and rol = 'comercial');
$$;

-- ── Productos ────────────────────────────────────────────────
create table if not exists public.mia_productos (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique
                        check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  nombre                text not null check (char_length(nombre) between 2 and 120),
  resumen               text,
  tipo                  text not null default 'programa' check (tipo in ('programa', 'upsell')),
  -- Un upsell exige tener antes este programa base.
  requiere_producto_id  uuid references public.mia_productos(id),
  estado                text not null default 'borrador' check (estado in ('borrador', 'publicado', 'archivado')),
  created_at            timestamptz not null default now(),
  check (tipo = 'upsell' or requiere_producto_id is null)
);

-- ── Cohortes: pertenecen a un producto y pueden tener tope ───
alter table public.mia_cohortes add column if not exists producto_id uuid references public.mia_productos(id);
alter table public.mia_cohortes add column if not exists capacidad integer check (capacidad is null or capacidad >= 0);

-- ── Ofertas ──────────────────────────────────────────────────
create table if not exists public.mia_ofertas (
  id                    uuid primary key default gen_random_uuid(),
  producto_id           uuid not null references public.mia_productos(id),
  cohorte_id            uuid references public.mia_cohortes(id),   -- opcional (producto sin cohorte)
  slug                  text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre                text not null,
  nota                  text,
  precio_centavos       integer not null check (precio_centavos > 0),
  moneda                text not null default 'cop' check (moneda ~ '^[a-z]{3}$'),
  disponible_desde      timestamptz,
  disponible_hasta      timestamptz,
  cupos                 integer check (cupos is null or cupos >= 0),   -- tope propio de la oferta (p. ej. VIP)
  derechos              text[] not null default '{}',                  -- p. ej. {sesion_arranque,sesion_1a1}
  extras                text[] not null default '{}',                  -- textos visibles de lo que añade
  requiere_producto_id  uuid references public.mia_productos(id),      -- upsell: derecho vigente previo
  orden                 integer not null default 0,
  activa                boolean not null default true,
  created_at            timestamptz not null default now(),
  unique (producto_id, slug),
  check (disponible_hasta is null or disponible_desde is null or disponible_hasta > disponible_desde)
);
create index if not exists mia_ofertas_producto_idx on public.mia_ofertas (producto_id, orden);

-- ── Oportunidades (venta asistida) ───────────────────────────
create table if not exists public.mia_oportunidades (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  producto_id             uuid not null references public.mia_productos(id),
  oferta_id               uuid references public.mia_ofertas(id),
  estado                  text not null default 'nueva'
                          check (estado in ('nueva','asignada','contactada','propuesta','pendiente_pago','ganada','perdida')),
  asignado_a              uuid references auth.users(id) on delete set null,
  canal                   text not null default 'whatsapp' check (canal in ('whatsapp', 'correo')),
  origen                  text not null default 'web' check (origen in ('web', 'stand')),
  utm_source              text check (char_length(utm_source)   <= 100),
  utm_medium              text check (char_length(utm_medium)   <= 100),
  utm_campaign            text check (char_length(utm_campaign) <= 100),
  -- Pidió ser contactado por ESTE canal: consentimiento explicito, no equivale a campañas.
  contacto_autorizado_en  timestamptz not null,
  pedido_id               uuid,
  proxima_accion          text check (char_length(proxima_accion) <= 300),
  proxima_accion_en       timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
-- Una oportunidad ABIERTA por cuenta y producto.
create unique index if not exists mia_oportunidades_abierta_idx
  on public.mia_oportunidades (user_id, producto_id) where estado not in ('ganada', 'perdida');
create index if not exists mia_oportunidades_asignado_idx on public.mia_oportunidades (asignado_a, estado);

create table if not exists public.mia_oportunidad_notas (
  id               uuid primary key default gen_random_uuid(),
  oportunidad_id   uuid not null references public.mia_oportunidades(id) on delete cascade,
  autor            uuid references auth.users(id) on delete set null,
  texto            text not null check (char_length(texto) between 1 and 2000),
  created_at       timestamptz not null default now()
);

drop trigger if exists mia_oportunidades_touch on public.mia_oportunidades;
create trigger mia_oportunidades_touch before update on public.mia_oportunidades
  for each row execute function public.mia_touch_updated_at();

-- ── Pedidos: propiedad, producto, oferta y snapshot ──────────
alter table public.mia_pedidos add column if not exists producto_id    uuid references public.mia_productos(id);
alter table public.mia_pedidos add column if not exists oferta_id      uuid references public.mia_ofertas(id);
alter table public.mia_pedidos add column if not exists snapshot       jsonb;
alter table public.mia_pedidos add column if not exists creado_por     uuid references auth.users(id) on delete set null;
alter table public.mia_pedidos add column if not exists oportunidad_id uuid references public.mia_oportunidades(id) on delete set null;
alter table public.mia_pedidos add column if not exists historico      boolean not null default false;

alter table public.mia_pedidos drop constraint if exists mia_pedidos_nivel_check;
create index if not exists mia_pedidos_user_idx   on public.mia_pedidos (user_id, created_at desc);
create index if not exists mia_pedidos_oferta_idx on public.mia_pedidos (oferta_id, estado);

alter table public.mia_oportunidades
  add constraint mia_oportunidades_pedido_fk foreign key (pedido_id) references public.mia_pedidos(id) on delete set null;

-- ── Derechos de acceso = mia_inscripciones, ahora por producto ──
alter table public.mia_inscripciones add column if not exists producto_id   uuid references public.mia_productos(id);
alter table public.mia_inscripciones add column if not exists oferta_id     uuid references public.mia_ofertas(id);
alter table public.mia_inscripciones add column if not exists pedido_id     uuid references public.mia_pedidos(id) on delete set null;
alter table public.mia_inscripciones add column if not exists origen        text not null default 'pago'
  check (origen in ('pago', 'admin', 'cortesia', 'historico'));
alter table public.mia_inscripciones add column if not exists derechos      text[] not null default '{}';
alter table public.mia_inscripciones add column if not exists concedido_por uuid references auth.users(id) on delete set null;
alter table public.mia_inscripciones add column if not exists motivo        text check (char_length(motivo) <= 500);

alter table public.mia_inscripciones drop constraint if exists mia_inscripciones_entrada_check;
alter table public.mia_inscripciones alter column cohorte_id drop not null;
alter table public.mia_inscripciones drop constraint if exists mia_inscripciones_user_id_cohorte_id_key;

-- ── Datos del registro pendiente: intencion validada en servidor ──
alter table public.mia_registros_pendientes add column if not exists producto_slug           text;
alter table public.mia_registros_pendientes add column if not exists oferta_slug             text;
alter table public.mia_registros_pendientes add column if not exists asesor                  boolean not null default false;
alter table public.mia_registros_pendientes add column if not exists canal                   text check (canal in ('whatsapp', 'correo'));
alter table public.mia_registros_pendientes add column if not exists contacto_autorizado_en  timestamptz;
alter table public.mia_registros_pendientes add column if not exists origen                  text not null default 'web' check (origen in ('web', 'stand'));
alter table public.mia_registros_pendientes add column if not exists utm_source              text check (char_length(utm_source)   <= 100);
alter table public.mia_registros_pendientes add column if not exists utm_medium              text check (char_length(utm_medium)   <= 100);
alter table public.mia_registros_pendientes add column if not exists utm_campaign            text check (char_length(utm_campaign) <= 100);

-- ============================================================
-- MIGRACION DE DATOS HISTORICOS: todo lo existente pasa a Master IA 360
-- ============================================================
insert into public.mia_productos (slug, nombre, resumen, tipo, estado)
values (
  'master-ia-360',
  'Master IA 360',
  'Programa en vivo de 4 semanas (8 clases de 2,5 h), entregables y 60 días de comunidad activa.',
  'programa',
  'publicado'
)
on conflict (slug) do nothing;

update public.mia_cohortes
   set producto_id = (select id from public.mia_productos where slug = 'master-ia-360'),
       capacidad   = coalesce(capacidad, 200)
 where producto_id is null;

-- Ofertas de la cohorte 1 (fuente: master-ia-360/00-contexto-y-estado-actual.md; Regular $1.290.000 por indicacion de Alexander).
insert into public.mia_ofertas
  (producto_id, cohorte_id, slug, nombre, nota, precio_centavos, moneda, disponible_desde, disponible_hasta, cupos, derechos, extras, orden)
select p.id, c.id, v.slug, v.nombre, v.nota, v.precio, 'cop', v.desde, v.hasta, v.cupos, v.derechos, v.extras, v.orden
from public.mia_productos p
join public.mia_cohortes c on c.producto_id = p.id and c.nombre = 'Cohorte 1'
cross join (values
  ('preventa', 'Preventa · precio de feria',
   'Hasta el domingo 18 de octubre a medianoche. Ahorras $500.000 frente al precio regular.',
   79000000, null::timestamptz, '2026-10-18 23:59:59-05'::timestamptz, null::integer,
   array['sesion_arranque']::text[],
   array['Sesión grupal de arranque antes del 22 de octubre']::text[], 1),
  ('regular', 'Regular',
   'Desde el 19 de octubre. Inscripciones hasta el miércoles 21, 8 p. m.',
   129000000, '2026-10-19 00:00:00-05'::timestamptz, '2026-10-21 20:00:00-05'::timestamptz, null::integer,
   array[]::text[], array[]::text[], 2),
  ('vip', 'VIP',
   'Para salir con tu negocio armado. Solo 10 cupos.',
   150000000, null::timestamptz, '2026-10-21 20:00:00-05'::timestamptz, 10,
   array['sesion_arranque','sesion_1a1','revision_proyecto','seguimiento_30d']::text[],
   array['Sesión grupal de arranque antes del 22 de octubre',
         'Sesión privada 1:1 de 45 min: la arquitectura de tu negocio',
         'Revisión personal de tu proyecto final',
         '30 días de seguimiento directo por WhatsApp']::text[], 3)
) as v(slug, nombre, nota, precio, desde, hasta, cupos, derechos, extras, orden)
on conflict (producto_id, slug) do nothing;

-- Derechos existentes: al producto y a la oferta que corresponde a su entrada.
update public.mia_inscripciones i
   set producto_id = o.producto_id,
       oferta_id   = o.id,
       derechos    = o.derechos,
       origen      = 'historico'
  from public.mia_ofertas o
 where i.producto_id is null
   and o.slug = i.entrada
   and o.cohorte_id is not distinct from i.cohorte_id;

-- Cualquier derecho que no calce con una oferta igual queda en Master IA 360 (no se pierde nada).
update public.mia_inscripciones
   set producto_id = (select id from public.mia_productos where slug = 'master-ia-360'),
       origen = 'historico'
 where producto_id is null;

-- Pedidos existentes: historicos (compra invitada). Se conservan tal cual, con su precio real cobrado.
update public.mia_pedidos p
   set producto_id = o.producto_id,
       oferta_id   = o.id,
       historico   = true,
       snapshot    = jsonb_build_object(
                       'producto', jsonb_build_object('slug', 'master-ia-360'),
                       'oferta',   jsonb_build_object('slug', o.slug, 'nombre', o.nombre),
                       'monto_centavos', p.monto_centavos,
                       'moneda', p.moneda,
                       'historico', true)
  from public.mia_ofertas o
 where p.producto_id is null
   and o.slug = p.nivel
   and o.producto_id = (select id from public.mia_productos where slug = 'master-ia-360');

update public.mia_pedidos set historico = true where producto_id is null;

alter table public.mia_inscripciones alter column producto_id set not null;

-- Un derecho por persona, producto y cohorte (y uno por producto si no tiene cohorte).
create unique index if not exists mia_inscripciones_unica_cohorte
  on public.mia_inscripciones (user_id, producto_id, cohorte_id) where cohorte_id is not null;
create unique index if not exists mia_inscripciones_unica_sin_cohorte
  on public.mia_inscripciones (user_id, producto_id) where cohorte_id is null;

-- Todo pedido NUEVO nace con dueño verificado, producto, oferta y snapshot.
alter table public.mia_pedidos
  add constraint mia_pedidos_nuevo_ck
  check (historico or (user_id is not null and producto_id is not null and oferta_id is not null and snapshot is not null));

-- ============================================================
-- FUNCIONES ATOMICAS (solo service role)
-- ============================================================

-- Cupos libres de una oferta: el MENOR entre lo que queda de la cohorte y de la propia oferta.
-- Cuenta derechos activos + pagos sin aprovisionar + reservas vigentes de OTROS pedidos.
create or replace function public.mia_cupos_libres(p_oferta uuid, p_excluir_pedido uuid default null)
returns integer
language plpgsql stable security definer
set search_path = public
as $$
declare
  o       public.mia_ofertas;
  cap     integer;
  ocup    integer;
  libre   integer := 2147483647;
begin
  select * into o from public.mia_ofertas where id = p_oferta;
  if not found then return 0; end if;

  if o.cohorte_id is not null then
    select capacidad into cap from public.mia_cohortes where id = o.cohorte_id;
    if cap is not null then
      select
        (select count(*) from public.mia_inscripciones i
          where i.cohorte_id = o.cohorte_id and i.estado = 'activa')
      + (select count(*) from public.mia_pedidos p join public.mia_ofertas x on x.id = p.oferta_id
          where x.cohorte_id = o.cohorte_id and p.estado = 'pagado' and p.aprovisionado_en is null)
      + (select count(*) from public.mia_pedidos p join public.mia_ofertas x on x.id = p.oferta_id
          where x.cohorte_id = o.cohorte_id and p.estado = 'pendiente' and p.reservado_hasta > now()
            and p.id is distinct from p_excluir_pedido)
      into ocup;
      libre := least(libre, cap - ocup);
    end if;
  end if;

  if o.cupos is not null then
    select
      (select count(*) from public.mia_inscripciones i where i.oferta_id = o.id and i.estado = 'activa')
    + (select count(*) from public.mia_pedidos p
        where p.oferta_id = o.id and p.estado = 'pagado' and p.aprovisionado_en is null)
    + (select count(*) from public.mia_pedidos p
        where p.oferta_id = o.id and p.estado = 'pendiente' and p.reservado_hasta > now()
          and p.id is distinct from p_excluir_pedido)
    into ocup;
    libre := least(libre, o.cupos - ocup);
  end if;

  return greatest(libre, 0);
end;
$$;

-- ¿Tiene la persona un derecho VIGENTE sobre este producto?
create or replace function public.mia_tiene_derecho(p_user uuid, p_producto uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mia_inscripciones i
    where i.user_id = p_user and i.producto_id = p_producto and i.estado = 'activa'
      and (i.comunidad_vence_en is null or i.comunidad_vence_en > now())
  );
$$;

-- Crea (o reanuda) el pedido PROPIO de una cuenta verificada para una oferta.
-- Todo se valida aqui, bajo un lock, con datos de la base: nada llega del cliente salvo la oferta elegida.
-- Devuelve {estado, pedido_id?}. estado ∈ ok | oferta_no_disponible | oferta_cerrada | sin_perfil |
-- privacidad_pendiente | requisito_no_cumplido | ya_adquirido | sin_cupo.
create or replace function public.mia_crear_pedido(
  p_user         uuid,
  p_oferta       uuid,
  p_creado_por   uuid default null,
  p_oportunidad  uuid default null
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  o         public.mia_ofertas;
  pr        public.mia_productos;
  per       public.mia_perfiles;
  req       uuid;
  abierto   uuid;
  nuevo     uuid;
begin
  perform pg_advisory_xact_lock(hashtext('mia_cupos'));

  select * into o from public.mia_ofertas where id = p_oferta;
  if not found or not o.activa then return jsonb_build_object('estado', 'oferta_no_disponible'); end if;
  select * into pr from public.mia_productos where id = o.producto_id;
  if pr.estado <> 'publicado' then return jsonb_build_object('estado', 'oferta_no_disponible'); end if;

  if (o.disponible_desde is not null and now() < o.disponible_desde)
     or (o.disponible_hasta is not null and now() > o.disponible_hasta) then
    return jsonb_build_object('estado', 'oferta_cerrada');
  end if;

  select * into per from public.mia_perfiles where user_id = p_user;
  if not found then return jsonb_build_object('estado', 'sin_perfil'); end if;
  if per.privacidad_aceptada_en is null then return jsonb_build_object('estado', 'privacidad_pendiente'); end if;

  -- Upsell: exige un derecho vigente sobre el programa base.
  req := coalesce(o.requiere_producto_id, pr.requiere_producto_id);
  if req is not null and not public.mia_tiene_derecho(p_user, req) then
    return jsonb_build_object('estado', 'requisito_no_cumplido');
  end if;

  -- Compras repetidas o solapadas: mismo producto y cohorte ya adquiridos (o pagados en tránsito).
  if exists (
       select 1 from public.mia_inscripciones i
        where i.user_id = p_user and i.producto_id = o.producto_id
          and i.cohorte_id is not distinct from o.cohorte_id
          and i.estado = 'activa' and (i.comunidad_vence_en is null or i.comunidad_vence_en > now()))
     or exists (
       select 1 from public.mia_pedidos p
        where p.user_id = p_user and p.estado = 'pagado' and p.aprovisionado_en is null
          and p.producto_id = o.producto_id)
  then
    return jsonb_build_object('estado', 'ya_adquirido');
  end if;

  -- ¿Ya tiene un pedido abierto para esta oferta? Se reanuda (no se duplica) si todavía hay cupo.
  select id into abierto from public.mia_pedidos
   where user_id = p_user and oferta_id = p_oferta and estado = 'pendiente'
   order by created_at desc limit 1;

  if public.mia_cupos_libres(p_oferta, abierto) <= 0 then
    return jsonb_build_object('estado', 'sin_cupo');
  end if;

  if abierto is not null then
    update public.mia_pedidos
       set reservado_hasta = now() + interval '35 minutes'
     where id = abierto;
    return jsonb_build_object('estado', 'ok', 'pedido_id', abierto, 'reanudado', true);
  end if;

  insert into public.mia_pedidos (
    email, nombre, whatsapp, monto_centavos, moneda, estado, origen, nivel,
    privacidad_aceptada_en, bonus_incluido,
    user_id, producto_id, oferta_id, creado_por, oportunidad_id, snapshot, reservado_hasta, historico
  ) values (
    per.email, per.nombre, per.whatsapp, o.precio_centavos, o.moneda, 'pendiente', 'web', o.slug,
    per.privacidad_aceptada_en, 'sesion_arranque' = any(o.derechos),
    p_user, o.producto_id, o.id, p_creado_por, p_oportunidad,
    jsonb_build_object(
      'producto', jsonb_build_object('slug', pr.slug, 'nombre', pr.nombre),
      'oferta',   jsonb_build_object('slug', o.slug, 'nombre', o.nombre, 'derechos', to_jsonb(o.derechos),
                                     'extras', to_jsonb(o.extras)),
      'monto_centavos', o.precio_centavos,
      'moneda', o.moneda,
      'creado_en', now()),
    now() + interval '35 minutes', false
  ) returning id into nuevo;

  return jsonb_build_object('estado', 'ok', 'pedido_id', nuevo, 'reanudado', false);
end;
$$;

-- Concede (o reactiva) el derecho de acceso de una cuenta sobre el producto/cohorte de una oferta.
-- Es el UNICO camino de concesion: lo usan el pago verificado, el alta de un admin y la cortesia.
-- Idempotente: repetirlo no duplica y reactiva un derecho revocado.
create or replace function public.mia_conceder_derecho(
  p_user     uuid,
  p_oferta   uuid,
  p_pedido   uuid,
  p_origen   text,
  p_por      uuid default null,
  p_motivo   text default null
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  o   public.mia_ofertas;
  id_ uuid;
begin
  if p_origen not in ('pago', 'admin', 'cortesia', 'historico') then
    raise exception 'origen no valido: %', p_origen;
  end if;
  -- Todo lo que no sea un pago exige quien lo concede y un motivo (queda auditado).
  if p_origen in ('admin', 'cortesia') and (p_por is null or coalesce(trim(p_motivo), '') = '') then
    raise exception 'una concesion manual exige autor y motivo';
  end if;

  select * into o from public.mia_ofertas where id = p_oferta;
  if not found then raise exception 'oferta inexistente'; end if;

  if o.cohorte_id is null then
    insert into public.mia_inscripciones
      (user_id, producto_id, cohorte_id, oferta_id, pedido_id, entrada, estado, origen, derechos,
       bonus_clase_privada, concedido_por, motivo)
    values
      (p_user, o.producto_id, null, o.id, p_pedido, o.slug, 'activa', p_origen, o.derechos,
       'sesion_arranque' = any(o.derechos), p_por, p_motivo)
    on conflict (user_id, producto_id) where cohorte_id is null
    do update set estado = 'activa', oferta_id = excluded.oferta_id, pedido_id = excluded.pedido_id,
                  entrada = excluded.entrada, origen = excluded.origen, derechos = excluded.derechos,
                  bonus_clase_privada = excluded.bonus_clase_privada,
                  concedido_por = excluded.concedido_por, motivo = excluded.motivo
    returning id into id_;
  else
    insert into public.mia_inscripciones
      (user_id, producto_id, cohorte_id, oferta_id, pedido_id, entrada, estado, origen, derechos,
       bonus_clase_privada, concedido_por, motivo)
    values
      (p_user, o.producto_id, o.cohorte_id, o.id, p_pedido, o.slug, 'activa', p_origen, o.derechos,
       'sesion_arranque' = any(o.derechos), p_por, p_motivo)
    on conflict (user_id, producto_id, cohorte_id) where cohorte_id is not null
    do update set estado = 'activa', oferta_id = excluded.oferta_id, pedido_id = excluded.pedido_id,
                  entrada = excluded.entrada, origen = excluded.origen, derechos = excluded.derechos,
                  bonus_clase_privada = excluded.bonus_clase_privada,
                  concedido_por = excluded.concedido_por, motivo = excluded.motivo
    returning id into id_;
  end if;

  return id_;
end;
$$;

-- ── Oportunidad: 'ganada' solo con pago confirmado ───────────
create or replace function public.mia_oportunidad_guardia()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.estado = 'ganada' and (tg_op = 'INSERT' or old.estado is distinct from 'ganada') then
    if new.pedido_id is null
       or not exists (select 1 from public.mia_pedidos p where p.id = new.pedido_id and p.estado = 'pagado') then
      raise exception 'una oportunidad solo puede quedar ganada con un pedido pagado'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists mia_oportunidad_guardia_trg on public.mia_oportunidades;
create trigger mia_oportunidad_guardia_trg before insert or update on public.mia_oportunidades
  for each row execute function public.mia_oportunidad_guardia();

-- Al confirmarse el pago, la oportunidad vinculada pasa a 'ganada' (derivado del pago, nunca manual).
create or replace function public.mia_pedido_pagado_cierra_oportunidad()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.estado = 'pagado' and old.estado is distinct from 'pagado' then
    update public.mia_oportunidades
       set estado = 'ganada', pedido_id = new.id
     where (id = new.oportunidad_id or (pedido_id = new.id))
       and estado <> 'ganada';
  end if;
  return new;
end;
$$;

drop trigger if exists mia_pedido_pagado_trg on public.mia_pedidos;
create trigger mia_pedido_pagado_trg after update of estado on public.mia_pedidos
  for each row execute function public.mia_pedido_pagado_cierra_oportunidad();

-- ============================================================
-- RLS Y PERMISOS
-- ============================================================
alter table public.mia_productos          enable row level security;
alter table public.mia_ofertas            enable row level security;
alter table public.mia_oportunidades      enable row level security;
alter table public.mia_oportunidad_notas  enable row level security;

revoke all on public.mia_productos, public.mia_ofertas, public.mia_oportunidades,
              public.mia_oportunidad_notas from anon, authenticated;
grant select on public.mia_productos, public.mia_ofertas, public.mia_oportunidades,
                public.mia_oportunidad_notas to authenticated;

-- Catálogo: cualquier cuenta con sesión ve lo PUBLICADO (nada de borradores).
drop policy if exists mia_productos_select on public.mia_productos;
create policy mia_productos_select on public.mia_productos
  for select to authenticated using (estado = 'publicado');

drop policy if exists mia_ofertas_select on public.mia_ofertas;
create policy mia_ofertas_select on public.mia_ofertas
  for select to authenticated
  using (activa and exists (select 1 from public.mia_productos p where p.id = producto_id and p.estado = 'publicado'));

-- Oportunidades: la propia cuenta, el comercial ASIGNADO y el admin. Nadie escribe desde la API.
drop policy if exists mia_oportunidades_select on public.mia_oportunidades;
create policy mia_oportunidades_select on public.mia_oportunidades
  for select to authenticated
  using (user_id = auth.uid() or asignado_a = auth.uid() or public.mia_es_admin());

drop policy if exists mia_oportunidad_notas_select on public.mia_oportunidad_notas;
create policy mia_oportunidad_notas_select on public.mia_oportunidad_notas
  for select to authenticated
  using (
    exists (select 1 from public.mia_oportunidades o
             where o.id = oportunidad_id
               and (o.asignado_a = auth.uid() or public.mia_es_admin()))
  );

-- Pedidos: la cuenta lee SOLO los suyos (antes: nadie desde la API).
grant select on public.mia_pedidos to authenticated;
drop policy if exists mia_pedidos_select_propio on public.mia_pedidos;
create policy mia_pedidos_select_propio on public.mia_pedidos
  for select to authenticated using (user_id = auth.uid());

-- Las funciones atomicas NO son llamables desde la API.
revoke execute on function public.mia_cupos_libres(uuid, uuid)                       from public, anon, authenticated;
revoke execute on function public.mia_crear_pedido(uuid, uuid, uuid, uuid)           from public, anon, authenticated;
revoke execute on function public.mia_conceder_derecho(uuid, uuid, uuid, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.mia_tiene_derecho(uuid, uuid)                      from public, anon, authenticated;
revoke execute on function public.mia_oportunidad_guardia()                          from public, anon, authenticated;
revoke execute on function public.mia_pedido_pagado_cierra_oportunidad()             from public, anon, authenticated;
revoke execute on function public.mia_es_admin()                                     from public, anon;
revoke execute on function public.mia_es_comercial()                                 from public, anon;
grant  execute on function public.mia_es_admin()                                     to authenticated;
grant  execute on function public.mia_es_comercial()                                 to authenticated;

-- Defensa en profundidad: ademas de la RLS, la API no tiene privilegios de ESCRITURA sobre cohortes,
-- perfiles ni derechos (solo el servidor los modifica). mia_fichas conserva insert/update, acotados por RLS.
revoke insert, update, delete, truncate on public.mia_cohortes, public.mia_perfiles, public.mia_inscripciones
  from anon, authenticated;
grant select on public.mia_cohortes, public.mia_perfiles, public.mia_inscripciones to authenticated;

-- La reserva atomica de la compra invitada ya no se usa.
drop function if exists public.mia_fijar_nivel(uuid, text, integer, boolean, integer, integer);

-- ============================================================
-- REVERSA (manual, si hiciera falta volver atras ANTES de usar el multiprograma):
--   drop table mia_oportunidad_notas, mia_oportunidades;
--   drop function mia_crear_pedido, mia_conceder_derecho, mia_cupos_libres, mia_tiene_derecho, ...;
--   alter table mia_pedidos drop column producto_id, oferta_id, snapshot, creado_por, oportunidad_id, historico;
--   alter table mia_inscripciones drop column producto_id, oferta_id, pedido_id, origen, derechos, concedido_por, motivo;
--   drop table mia_ofertas, mia_productos;
-- Los pedidos y derechos historicos NO se borran: la migracion solo agrega columnas y tablas.
-- ============================================================
