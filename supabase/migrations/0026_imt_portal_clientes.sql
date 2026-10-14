-- IA Master Tech: portal de clientes creado al pagar.
-- Aditiva y sin riesgo: dos columnas nuevas (con default / nulas) y un índice.
-- Aplicada en producción (proyecto Alexanderwebcenter) el 2026-10-14.

-- Tipo de portal: 'agencia' (tableros de campañas, el de siempre) o 'imt' (plan, pagos e informes).
alter table public.portal_clients
  add column if not exists tipo text not null default 'agencia';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_clients'::regclass and conname = 'portal_clients_tipo_check'
  ) then
    alter table public.portal_clients
      add constraint portal_clients_tipo_check check (tipo in ('agencia', 'imt'));
  end if;
end $$;

-- Cada pedido apunta al portal que se creó para su cliente.
alter table public.imt_pedidos
  add column if not exists portal_client_id uuid references public.portal_clients (id) on delete set null;

create index if not exists imt_pedidos_portal_client_idx on public.imt_pedidos (portal_client_id);
