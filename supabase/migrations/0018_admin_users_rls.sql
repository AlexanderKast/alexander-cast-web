-- ============================================================
-- 0018 · Cerrar public.admin_users (RLS apagado + permisos totales)
--
-- PROBLEMA: admin_users tenia RLS desactivado y anon/authenticated con
-- INSERT/UPDATE/DELETE/TRUNCATE. Cualquiera con la anon key (publica en el
-- navegador) podia leer la tabla o insertarse como 'founder' y entrar a /admin.
--
-- QUE HACE ESTA MIGRACION:
--   1. Activa RLS.
--   2. Quita todo permiso a anon, y a authenticated deja solo SELECT.
--   3. Politica: un usuario con sesion solo puede ver SU propia fila.
--      Esto mantiene vivas las 9 politicas existentes (ac_*, imt_diagnosticos)
--      que hacen "exists (select 1 from admin_users where auth_user_id = auth.uid())":
--      su subconsulta solo necesita la fila propia.
--
-- NO ROMPE NADA DEL SITIO (verificado leyendo el codigo):
--   * lib/auth.ts, lib/portal/*, app/portal/[slug], lib/proyectos, lib/guiones,
--     lib/ideas, lib/mcp y app/admin/* leen admin_users con service role,
--     que ignora RLS.
--   * is_admin_user() es SECURITY DEFINER y pertenece a postgres: ignora RLS.
--   * Ningun componente de navegador consulta admin_users.
--
-- Las altas/bajas de admins se siguen haciendo con service role o desde el
-- SQL Editor de Supabase, nunca desde el navegador.
--
-- REVERSA (si algo inesperado falla):
--   alter table public.admin_users disable row level security;
--   (los permisos revocados no hacen falta para reactivar el panel, porque
--    el servidor usa service role)
-- ============================================================

alter table public.admin_users enable row level security;

revoke all on public.admin_users from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.admin_users from authenticated;
grant select on public.admin_users to authenticated;

drop policy if exists admin_users_select_propia on public.admin_users;
create policy admin_users_select_propia on public.admin_users
  for select to authenticated
  using (auth_user_id = auth.uid());
