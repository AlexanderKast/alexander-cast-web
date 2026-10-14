-- ============================================================
-- 0021 · Comunidad: bono «clase privada» para quien compra hasta el 18 de oct
--
-- mia_pedidos.bonus_incluido  : el pedido se creó dentro de la ventana del bono.
-- mia_inscripciones.bonus_clase_privada : el alumno tiene acceso a la clase privada.
-- La fecha límite vive en el código (lib/comunidad/oferta.ts), no en la base.
-- ============================================================

alter table public.mia_pedidos
  add column if not exists bonus_incluido boolean not null default false;

alter table public.mia_inscripciones
  add column if not exists bonus_clase_privada boolean not null default false;
