-- SPEC 13: rls_auto_enable() solo la invoca el event trigger ensure_rls
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
