
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name plan_type NOT NULL UNIQUE,
  price numeric(10,2) NOT NULL DEFAULT 0,
  benefits_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans read" ON public.subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans admin write" ON public.subscription_plans FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

INSERT INTO public.subscription_plans (name, price, benefits_json) VALUES
  ('free', 0, '{"daily_likes":"limited","max_matches":5,"chat":["text","audio"]}'::jsonb),
  ('gold', 29.90, '{"daily_likes":"unlimited","max_matches":20,"chat":["text","audio","image"],"undo":true,"who_liked_you":5,"no_ads":true}'::jsonb),
  ('diamond', 59.90, '{"daily_likes":"unlimited","max_matches":"unlimited","chat":["text","audio","image"],"undo":true,"who_liked_you":"all","weekly_boost":true,"advanced_filters":true,"badge":true,"priority_support":true}'::jsonb)
ON CONFLICT (name) DO UPDATE SET price=EXCLUDED.price, benefits_json=EXCLUDED.benefits_json;

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_subs_user ON public.user_subscriptions(user_id);
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs self read" ON public.user_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "subs self insert" ON public.user_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "subs admin update" ON public.user_subscriptions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.profile_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_boosts_user ON public.profile_boosts(user_id);
ALTER TABLE public.profile_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boost self read" ON public.profile_boosts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "boost self insert" ON public.profile_boosts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.profile_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_phistory_user ON public.profile_history(user_id);
ALTER TABLE public.profile_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phistory self read" ON public.profile_history FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "phistory insert" ON public.profile_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fields text[] := ARRAY['name','bio','photo_url','goal','training_level','training_split','sexual_orientation','gender','plan','status','hide_orientation','hide_hours'];
  f text;
  old_v text;
  new_v text;
BEGIN
  FOREACH f IN ARRAY fields LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', f, f) INTO old_v, new_v USING OLD, NEW;
    IF old_v IS DISTINCT FROM new_v THEN
      INSERT INTO public.profile_history(user_id, field_changed, old_value, new_value)
        VALUES (NEW.id, f, old_v, new_v);
    END IF;
  END LOOP;
  IF OLD.modalities IS DISTINCT FROM NEW.modalities THEN
    INSERT INTO public.profile_history(user_id,field_changed,old_value,new_value)
      VALUES (NEW.id,'modalities',array_to_string(OLD.modalities,','),array_to_string(NEW.modalities,','));
  END IF;
  IF OLD.interests IS DISTINCT FROM NEW.interests THEN
    INSERT INTO public.profile_history(user_id,field_changed,old_value,new_value)
      VALUES (NEW.id,'interests',array_to_string(OLD.interests,','),array_to_string(NEW.interests,','));
  END IF;
  IF OLD.available_hours IS DISTINCT FROM NEW.available_hours THEN
    INSERT INTO public.profile_history(user_id,field_changed,old_value,new_value)
      VALUES (NEW.id,'available_hours',array_to_string(OLD.available_hours::text[],','),array_to_string(NEW.available_hours::text[],','));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_profile_changes ON public.profiles;
CREATE TRIGGER trg_log_profile_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_changes();
