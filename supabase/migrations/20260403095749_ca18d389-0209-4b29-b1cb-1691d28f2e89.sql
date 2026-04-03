
-- Remove direct INSERT policy on attempt_answers (now handled by submit_quiz_attempt RPC)
DROP POLICY IF EXISTS "Users can insert own attempt answers" ON public.attempt_answers;

-- Also remove direct INSERT on quiz_attempts (handled by RPC)
DROP POLICY IF EXISTS "Users can insert own attempts" ON public.quiz_attempts;
