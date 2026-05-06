ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation text;

CREATE OR REPLACE FUNCTION public.get_quiz_questions(_quiz_id uuid)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT json_agg(
    json_build_object(
      'id', q.id,
      'question_text', q.question_text,
      'explanation', q.explanation,
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
$function$;