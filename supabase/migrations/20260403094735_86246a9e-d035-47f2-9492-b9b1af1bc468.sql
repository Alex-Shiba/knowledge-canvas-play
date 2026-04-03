
-- Function to get quiz questions with answers but WITHOUT is_correct for regular users
CREATE OR REPLACE FUNCTION public.get_quiz_questions(_quiz_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_agg(
    json_build_object(
      'id', q.id,
      'question_text', q.question_text,
      'order_num', q.order_num,
      'answers', (
        SELECT json_agg(
          json_build_object(
            'id', a.id,
            'answer_text', a.answer_text,
            'order_num', a.order_num
          ) ORDER BY a.order_num
        )
        FROM answers a WHERE a.question_id = q.id
      )
    ) ORDER BY q.order_num
  )
  FROM questions q
  JOIN quizzes qz ON qz.id = q.quiz_id
  WHERE q.quiz_id = _quiz_id
    AND (qz.is_published = true OR has_role(auth.uid(), 'admin'))
$$;

-- Function to check answer and return if correct
CREATE OR REPLACE FUNCTION public.check_answer(_answer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_correct FROM answers WHERE id = _answer_id
$$;

-- Submit full quiz attempt securely (server-side scoring)
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  _quiz_id uuid,
  _answers jsonb -- array of {question_id, selected_answer_id}
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _attempt_id uuid;
  _score int := 0;
  _total int := 0;
  _item jsonb;
  _is_correct boolean;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify quiz is published
  IF NOT EXISTS (SELECT 1 FROM quizzes WHERE id = _quiz_id AND is_published = true) THEN
    RAISE EXCEPTION 'Quiz not available';
  END IF;

  -- Create attempt
  INSERT INTO quiz_attempts (quiz_id, user_id, score, total_questions)
  VALUES (_quiz_id, _user_id, 0, 0)
  RETURNING id INTO _attempt_id;

  -- Process each answer
  FOR _item IN SELECT * FROM jsonb_array_elements(_answers)
  LOOP
    SELECT a.is_correct INTO _is_correct
    FROM answers a
    WHERE a.id = (_item->>'selected_answer_id')::uuid;

    INSERT INTO attempt_answers (attempt_id, question_id, selected_answer_id, is_correct)
    VALUES (
      _attempt_id,
      (_item->>'question_id')::uuid,
      (_item->>'selected_answer_id')::uuid,
      COALESCE(_is_correct, false)
    );

    _total := _total + 1;
    IF _is_correct THEN _score := _score + 1; END IF;
  END LOOP;

  -- Update attempt with final score
  UPDATE quiz_attempts SET score = _score, total_questions = _total WHERE id = _attempt_id;

  RETURN json_build_object(
    'attempt_id', _attempt_id,
    'score', _score,
    'total_questions', _total
  );
END;
$$;
