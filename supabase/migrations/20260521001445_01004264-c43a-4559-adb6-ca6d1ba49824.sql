
-- 1) Tabela de vínculos usuário ↔ academias
CREATE TABLE IF NOT EXISTS public.user_gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, gym_id)
);

CREATE INDEX IF NOT EXISTS user_gyms_user_idx ON public.user_gyms(user_id);
CREATE INDEX IF NOT EXISTS user_gyms_gym_idx ON public.user_gyms(gym_id);

ALTER TABLE public.user_gyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_gyms self read"
  ON public.user_gyms FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_gyms self insert"
  ON public.user_gyms FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_gyms self delete"
  ON public.user_gyms FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 2) Migrar vínculos existentes
INSERT INTO public.user_gyms (user_id, gym_id)
SELECT id, gym_id FROM public.profiles
WHERE gym_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3) Atualizar RPC get_profile_deck para múltiplas academias + filtros de ocultação
CREATE OR REPLACE FUNCTION public.get_profile_deck(current_user_id uuid, page_limit integer DEFAULT 20, page_offset integer DEFAULT 0)
 RETURNS TABLE(user_id uuid, name text, age integer, gender text, goal text, training_level text, preferred_modalities text[], available_hours text[], photo_url text, bio text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_goal text;
  current_pref_genders text[];
BEGIN
  SELECT p.goal::text,
         (SELECT array_agg(g::text) FROM unnest(p.gender_preference) g)
    INTO current_goal, current_pref_genders
  FROM public.profiles p
  WHERE p.id = current_user_id;

  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id,
    p.name,
    p.age,
    p.gender::text,
    p.goal::text,
    p.training_level::text,
    p.modalities,
    CASE WHEN p.hide_hours THEN NULL
         ELSE (SELECT array_agg(h::text) FROM unnest(p.available_hours) h) END,
    p.photo_url,
    p.bio
  FROM public.profiles p
  WHERE p.id <> current_user_id
    AND p.status = 'active'
    AND p.profile_complete = true
    AND p.photo_url IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_gyms ug_other
      WHERE ug_other.user_id = p.id
        AND ug_other.gym_id IN (
          SELECT ug_me.gym_id FROM public.user_gyms ug_me
          WHERE ug_me.user_id = current_user_id
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.likes l
      WHERE l.from_user = current_user_id AND l.to_user = p.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = current_user_id AND b.blocked_id = p.id)
         OR (b.blocker_id = p.id AND b.blocked_id = current_user_id)
    )
    AND (
      current_goal <> 'romance'
      OR current_pref_genders IS NULL
      OR array_length(current_pref_genders, 1) IS NULL
      OR p.gender::text = ANY(current_pref_genders)
    )
  ORDER BY p.id, random()
  LIMIT page_limit
  OFFSET page_offset;
END;
$function$;
