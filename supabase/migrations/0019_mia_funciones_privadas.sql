-- ============================================================
-- 0019 · Comunidad: las funciones auxiliares no se llaman desde la API
-- mia_es_staff() la usa la RLS (rol authenticated) y mia_ficha_bloqueo() es
-- solo de trigger. Ninguna debe ser ejecutable por anon via /rest/v1/rpc.
-- ============================================================

revoke execute on function public.mia_es_staff()      from public, anon;
revoke execute on function public.mia_ficha_bloqueo() from public, anon, authenticated;
grant  execute on function public.mia_es_staff()      to authenticated;
