
-- Restrict profiles to owner-only
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Update leaderboard function to not rely on profiles being publicly readable
-- (it already uses SECURITY DEFINER so it bypasses RLS)
