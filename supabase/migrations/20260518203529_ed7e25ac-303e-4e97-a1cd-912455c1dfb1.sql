REVOKE EXECUTE ON FUNCTION public.get_profile_deck(uuid, int, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_swipe(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_deck(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_swipe(uuid, uuid, text) TO authenticated;