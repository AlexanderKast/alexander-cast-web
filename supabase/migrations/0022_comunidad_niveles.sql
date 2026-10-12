-- ============================================================
-- 0022 · Comunidad: niveles de entrada (Preventa / Regular / VIP) y cobro en COP
--
-- El nivel decide el precio y la entrada (mia_inscripciones.entrada usa los
-- mismos tres valores). Los precios y fechas viven en lib/comunidad/oferta.ts;
-- aqui solo se guarda el nivel elegido y el monto realmente cobrado.
-- ============================================================

alter table public.mia_pedidos
  add column if not exists nivel text not null default 'regular'
  check (nivel in ('preventa','regular','vip'));

alter table public.mia_pedidos alter column moneda set default 'cop';

create index if not exists mia_pedidos_nivel_idx on public.mia_pedidos (nivel, estado);
