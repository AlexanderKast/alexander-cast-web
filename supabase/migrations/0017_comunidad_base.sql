-- ============================================================
-- 0017 · Comunidad Master IA 360 — Fase 0
-- Modulo nuevo y aislado: todas las tablas llevan prefijo mia_.
-- No toca ninguna tabla existente.
--
-- Modelo de acceso:
--   * El alumno lee SOLO lo suyo (perfil, inscripcion, ficha).
--   * Escribe SOLO su ficha, y solo hasta la clase 1 (trigger).
--   * Todo lo demas (altas, roles, privacidad) lo escribe el servidor
--     con service role, despues de verificar la sesion.
-- ============================================================

-- ── 1. Cohortes ──────────────────────────────────────────────
create table if not exists public.mia_cohortes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  clase1_en   timestamptz,           -- las fichas se bloquean a partir de aqui
  clase8_en   timestamptz,           -- la comunidad vence 60 dias despues
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── 2. Perfiles ──────────────────────────────────────────────
create table if not exists public.mia_perfiles (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  email                   text not null,
  nombre                  text not null,
  whatsapp                text,
  rol                     text not null default 'alumno'
                          check (rol in ('alumno', 'moderador', 'admin')),
  privacidad_aceptada_en  timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create unique index if not exists mia_perfiles_email_unique
  on public.mia_perfiles (lower(email));

-- ── 3. Inscripciones ─────────────────────────────────────────
create table if not exists public.mia_inscripciones (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.mia_perfiles(user_id) on delete cascade,
  cohorte_id          uuid not null references public.mia_cohortes(id),
  entrada             text not null check (entrada in ('regular', 'preventa', 'vip')),
  comunidad_vence_en  timestamptz,
  created_at          timestamptz not null default now(),
  unique (user_id, cohorte_id)
);
create index if not exists mia_inscripciones_cohorte_idx
  on public.mia_inscripciones (cohorte_id);

-- ── 4. Fichas del negocio (una por inscripcion) ──────────────
create table if not exists public.mia_fichas (
  id              uuid primary key default gen_random_uuid(),
  inscripcion_id  uuid not null unique references public.mia_inscripciones(id) on delete cascade,
  vende           text not null check (char_length(vende)   between 3 and 1000),
  a_quien         text not null check (char_length(a_quien) between 3 and 1000),
  quiere          text not null check (char_length(quiere)  between 3 and 1000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 5. Funciones auxiliares ──────────────────────────────────
-- security definer + search_path fijo: evitan recursion de RLS y secuestro
-- de search_path. Leen SOLO mia_perfiles; nunca asumen que "autenticado"
-- significa "alumno" (auth.users se comparte con admin y portal).
create or replace function public.mia_es_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mia_perfiles
    where user_id = auth.uid() and rol in ('admin', 'moderador')
  );
$$;

create or replace function public.mia_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mia_perfiles_touch on public.mia_perfiles;
create trigger mia_perfiles_touch before update on public.mia_perfiles
  for each row execute function public.mia_touch_updated_at();

drop trigger if exists mia_fichas_touch on public.mia_fichas;
create trigger mia_fichas_touch before update on public.mia_fichas
  for each row execute function public.mia_touch_updated_at();

-- Una ficha solo se edita hasta la clase 1. El servidor (service role,
-- auth.uid() nulo) puede saltarse el bloqueo para correcciones del admin.
create or replace function public.mia_ficha_bloqueo()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  limite timestamptz;
begin
  if auth.uid() is null then
    return new;
  end if;

  select c.clase1_en into limite
  from public.mia_inscripciones i
  join public.mia_cohortes c on c.id = i.cohorte_id
  where i.id = new.inscripcion_id;

  if limite is not null and now() >= limite then
    raise exception 'La ficha ya no se puede editar: la clase 1 ya empezo.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists mia_fichas_bloqueo on public.mia_fichas;
create trigger mia_fichas_bloqueo before insert or update on public.mia_fichas
  for each row execute function public.mia_ficha_bloqueo();

-- ── 6. RLS ───────────────────────────────────────────────────
alter table public.mia_cohortes      enable row level security;
alter table public.mia_perfiles      enable row level security;
alter table public.mia_inscripciones enable row level security;
alter table public.mia_fichas        enable row level security;

revoke all on public.mia_cohortes, public.mia_perfiles,
              public.mia_inscripciones, public.mia_fichas from anon;

-- cohortes: cualquier usuario con sesion las ve (nombre y fechas), nadie escribe.
drop policy if exists mia_cohortes_select on public.mia_cohortes;
create policy mia_cohortes_select on public.mia_cohortes
  for select to authenticated using (true);

-- perfiles: cada uno ve el suyo; el staff ve todos. Sin escritura directa
-- (el rol y la privacidad se cambian solo desde el servidor).
drop policy if exists mia_perfiles_select on public.mia_perfiles;
create policy mia_perfiles_select on public.mia_perfiles
  for select to authenticated
  using (user_id = auth.uid() or public.mia_es_staff());

-- inscripciones: idem.
drop policy if exists mia_inscripciones_select on public.mia_inscripciones;
create policy mia_inscripciones_select on public.mia_inscripciones
  for select to authenticated
  using (user_id = auth.uid() or public.mia_es_staff());

-- fichas: lee la suya (o staff); inserta/edita solo la suya.
drop policy if exists mia_fichas_select on public.mia_fichas;
create policy mia_fichas_select on public.mia_fichas
  for select to authenticated
  using (
    public.mia_es_staff()
    or exists (
      select 1 from public.mia_inscripciones i
      where i.id = inscripcion_id and i.user_id = auth.uid()
    )
  );

drop policy if exists mia_fichas_insert on public.mia_fichas;
create policy mia_fichas_insert on public.mia_fichas
  for insert to authenticated
  with check (
    exists (
      select 1 from public.mia_inscripciones i
      where i.id = inscripcion_id and i.user_id = auth.uid()
    )
  );

drop policy if exists mia_fichas_update on public.mia_fichas;
create policy mia_fichas_update on public.mia_fichas
  for update to authenticated
  using (
    exists (
      select 1 from public.mia_inscripciones i
      where i.id = inscripcion_id and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.mia_inscripciones i
      where i.id = inscripcion_id and i.user_id = auth.uid()
    )
  );

-- ── 7. Cohorte 1 ─────────────────────────────────────────────
-- Hora de la clase 1: PLACEHOLDER (18:00 hora Colombia). Ajustar al horario real.
insert into public.mia_cohortes (nombre, clase1_en)
values ('Cohorte 1', '2026-10-22 18:00:00-05')
on conflict (nombre) do nothing;
