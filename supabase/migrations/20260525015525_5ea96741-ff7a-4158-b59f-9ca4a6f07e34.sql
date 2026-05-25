DROP POLICY IF EXISTS "profile same gym read" ON public.profiles;

CREATE POLICY "profile same gym read" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND profile_complete = true
    AND photo_url IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_gyms ug_other
      WHERE ug_other.user_id = profiles.id
        AND ug_other.gym_id IN (
          SELECT ug_me.gym_id FROM public.user_gyms ug_me
          WHERE ug_me.user_id = auth.uid()
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE b.blocker_id = profiles.id AND b.blocked_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE b.blocker_id = auth.uid() AND b.blocked_id = profiles.id
    )
  );