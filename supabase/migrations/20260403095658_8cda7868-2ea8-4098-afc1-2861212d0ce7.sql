
-- Drop the old permissive SELECT policy that exposed is_correct
DROP POLICY IF EXISTS "Answers visible via question" ON public.answers;

-- New policy: only admins can SELECT answers directly
CREATE POLICY "Only admins can read answers directly"
ON public.answers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
