
-- 1. Recreate plan_type enum: free | gold | diamond
ALTER TYPE public.plan_type RENAME TO plan_type_old;
CREATE TYPE public.plan_type AS ENUM ('free','gold','diamond');

-- 2. Migrate profiles.plan
ALTER TABLE public.profiles
  ALTER COLUMN plan DROP DEFAULT,
  ALTER COLUMN plan TYPE public.plan_type USING (
    CASE plan::text WHEN 'premium' THEN 'gold' ELSE plan::text END
  )::public.plan_type,
  ALTER COLUMN plan SET DEFAULT 'free'::public.plan_type;

-- 3. Migrate subscription_plans.name
ALTER TABLE public.subscription_plans
  ALTER COLUMN name TYPE public.plan_type USING (
    CASE name::text WHEN 'premium' THEN 'gold' ELSE name::text END
  )::public.plan_type;

DROP TYPE public.plan_type_old;

-- 4. Seed/upsert plans
INSERT INTO public.subscription_plans (name, price, benefits_json) VALUES
  ('free',    0.00,  '{"daily_likes": 20, "max_matches": 5,  "images_in_chat": false, "undo": false, "see_likes": 0,  "boost": false, "advanced_filters": false}'::jsonb),
  ('gold',    29.90, '{"daily_likes": -1, "max_matches": 20, "images_in_chat": true,  "undo": true,  "see_likes": 5,  "boost": false, "advanced_filters": false}'::jsonb),
  ('diamond', 59.90, '{"daily_likes": -1, "max_matches": -1, "images_in_chat": true,  "undo": true,  "see_likes": -1, "boost": true,  "advanced_filters": true}'::jsonb)
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, benefits_json = EXCLUDED.benefits_json;

-- 5. Update handle_swipe with daily-like limit + new caps
CREATE OR REPLACE FUNCTION public.handle_swipe(from_user uuid, to_user uuid, swipe_action text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_like_bool boolean;
  active_count int;
  daily_count int;
  user_plan text;
  cap int;
  match_row record;
BEGIN
  IF swipe_action NOT IN ('like', 'reject') THEN
    RAISE EXCEPTION 'invalid swipe_action: %', swipe_action;
  END IF;
  is_like_bool := (swipe_action = 'like');

  SELECT plan::text INTO user_plan FROM public.profiles WHERE id = from_user;

  IF is_like_bool THEN
    -- Daily like cap (Free = 20). Gold/Diamond unlimited.
    IF user_plan = 'free' THEN
      SELECT COUNT(*) INTO daily_count FROM public.likes
        WHERE from_user = handle_swipe.from_user
          AND is_like = true
          AND created_at >= CURRENT_DATE;
      IF daily_count >= 20 THEN
        RETURN json_build_object('matched', false, 'blocked', true, 'reason', 'daily_limit_reached', 'plan', user_plan);
      END IF;
    END IF;

    -- Active matches cap
    cap := CASE user_plan
      WHEN 'free' THEN 5
      WHEN 'gold' THEN 20
      ELSE NULL  -- diamond / unknown = unlimited
    END;
    IF cap IS NOT NULL THEN
      SELECT COUNT(*) INTO active_count FROM public.matches m
        WHERE m.active = true AND (m.user_a = from_user OR m.user_b = from_user);
      IF active_count >= cap THEN
        RETURN json_build_object('matched', false, 'blocked', true, 'reason', 'limit_reached', 'plan', user_plan, 'cap', cap);
      END IF;
    END IF;
  END IF;

  INSERT INTO public.likes (from_user, to_user, is_like)
    VALUES (from_user, to_user, is_like_bool)
    ON CONFLICT DO NOTHING;

  IF is_like_bool THEN
    SELECT * INTO match_row FROM public.matches m
      WHERE m.user_a = LEAST(from_user, to_user) AND m.user_b = GREATEST(from_user, to_user)
      LIMIT 1;
    IF FOUND THEN
      RETURN json_build_object('matched', true, 'match_id', match_row.id);
    END IF;
  END IF;
  RETURN json_build_object('matched', false);
END
$function$;
