-- get_profile_deck: returns swipe deck for current user
CREATE OR REPLACE FUNCTION public.get_profile_deck(
  current_user_id uuid,
  page_limit int DEFAULT 20,
  page_offset int DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  name text,
  age int,
  gender text,
  goal text,
  training_level text,
  preferred_modalities text[],
  available_hours text[],
  photo_url text,
  bio text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_gym uuid;
  current_goal text;
  current_pref_genders text[];
BEGIN
  SELECT p.gym_id, p.goal::text,
         (SELECT array_agg(g::text) FROM unnest(p.gender_preference) g)
    INTO current_gym, current_goal, current_pref_genders
  FROM public.profiles p
  WHERE p.id = current_user_id;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.age,
    p.gender::text,
    p.goal::text,
    p.training_level::text,
    p.modalities,
    CASE WHEN p.hide_hours THEN NULL ELSE (SELECT array_agg(h::text) FROM unnest(p.available_hours) h) END,
    p.photo_url,
    p.bio
  FROM public.profiles p
  WHERE p.gym_id = current_gym
    AND p.id <> current_user_id
    AND p.status = 'active'
    AND p.profile_complete = true
    AND p.photo_url IS NOT NULL
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
  ORDER BY random()
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- handle_swipe: insert like/reject, enforce free plan limit, return match info
CREATE OR REPLACE FUNCTION public.handle_swipe(
  from_user uuid,
  to_user uuid,
  swipe_action text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_like_bool boolean;
  free_match_count int;
  user_plan text;
  match_row record;
BEGIN
  IF swipe_action NOT IN ('like', 'reject') THEN
    RAISE EXCEPTION 'invalid swipe_action: %', swipe_action;
  END IF;
  is_like_bool := (swipe_action = 'like');

  IF is_like_bool THEN
    SELECT plan::text INTO user_plan FROM public.profiles WHERE id = from_user;
    IF user_plan = 'free' THEN
      SELECT COUNT(*) INTO free_match_count
      FROM public.matches m
      WHERE m.active = true
        AND (m.user_a = from_user OR m.user_b = from_user);
      IF free_match_count >= 5 THEN
        RETURN json_build_object('matched', false, 'reason', 'free_limit_reached');
      END IF;
    END IF;
  END IF;

  INSERT INTO public.likes (from_user, to_user, is_like)
  VALUES (from_user, to_user, is_like_bool)
  ON CONFLICT DO NOTHING;

  IF is_like_bool THEN
    SELECT * INTO match_row
    FROM public.matches m
    WHERE (m.user_a = LEAST(from_user, to_user) AND m.user_b = GREATEST(from_user, to_user))
    LIMIT 1;

    IF FOUND THEN
      RETURN json_build_object('matched', true, 'match_id', match_row.id);
    END IF;
  END IF;

  RETURN json_build_object('matched', false);
END;
$$;

-- Ensure likes uniqueness so ON CONFLICT works
CREATE UNIQUE INDEX IF NOT EXISTS likes_from_to_unique ON public.likes (from_user, to_user);
