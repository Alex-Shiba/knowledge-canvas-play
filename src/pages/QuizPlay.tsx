import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, ArrowRight, Trophy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question_text: string;
  order_num: number;
  answers: Answer[];
}

interface Answer {
  id: string;
  answer_text: string;
  is_correct: boolean;
  order_num: number;
}

interface UserAnswer {
  questionId: string;
  answerId: string;
  isCorrect: boolean;
}

export default function QuizPlay() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      const { data: quiz } = await supabase
        .from("quizzes")
        .select("title")
        .eq("id", id)
        .single();
      if (quiz) setQuizTitle(quiz.title);

      const { data } = await supabase
        .from("questions")
        .select("id, question_text, order_num, answers(id, answer_text, is_correct, order_num)")
        .eq("quiz_id", id)
        .order("order_num");

      if (data) {
        setQuestions(
          data.map((q) => ({
            ...q,
            answers: (q.answers ?? []).sort((a, b) => a.order_num - b.order_num),
          }))
        );
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  const current = questions[currentIdx];
  const progress = questions.length > 0 ? ((currentIdx + (confirmed ? 1 : 0)) / questions.length) * 100 : 0;

  const handleConfirm = () => {
    if (!selectedAnswer || !current) return;
    const answer = current.answers.find((a) => a.id === selectedAnswer);
    setUserAnswers((prev) => [
      ...prev,
      { questionId: current.id, answerId: selectedAnswer, isCorrect: answer?.is_correct ?? false },
    ]);
    setConfirmed(true);
  };

  const handleNext = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
      setConfirmed(false);
    } else {
      // Save attempt
      const score = userAnswers.filter((a) => a.isCorrect).length;
      if (user && id) {
        const { data: attempt } = await supabase
          .from("quiz_attempts")
          .insert({ user_id: user.id, quiz_id: id, score, total_questions: questions.length })
          .select("id")
          .single();

        if (attempt) {
          await supabase.from("attempt_answers").insert(
            userAnswers.map((ua) => ({
              attempt_id: attempt.id,
              question_id: ua.questionId,
              selected_answer_id: ua.answerId,
              is_correct: ua.isCorrect,
            }))
          );
        }
      }
      setFinished(true);
    }
  };

  if (loading) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (finished) {
    const score = userAnswers.filter((a) => a.isCorrect).length;
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="container max-w-2xl py-8 animate-fade-in">
        <Card>
          <CardHeader className="text-center">
            <Trophy className={cn("mx-auto h-12 w-12", pct >= 70 ? "text-yellow-500" : "text-muted-foreground")} />
            <CardTitle className="font-display text-3xl mt-2">
              {pct >= 90 ? "Отлично!" : pct >= 70 ? "Хороший результат!" : pct >= 50 ? "Неплохо!" : "Можно лучше!"}
            </CardTitle>
            <p className="text-4xl font-bold text-primary mt-2">{score}/{questions.length}</p>
            <p className="text-muted-foreground">{pct}% правильных ответов</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.map((q, i) => {
              const ua = userAnswers[i];
              const correctAnswer = q.answers.find((a) => a.is_correct);
              return (
                <div
                  key={q.id}
                  className={cn(
                    "rounded-lg border p-4",
                    ua?.isCorrect ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {ua?.isCorrect ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                    )}
                    <div>
                      <p className="font-medium">{q.question_text}</p>
                      {!ua?.isCorrect && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Правильный ответ: <span className="text-foreground font-medium">{correctAnswer?.answer_text}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
                К квизам
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1">
                <RotateCcw className="mr-1 h-4 w-4" /> Пройти снова
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="container py-8 text-center text-muted-foreground">
        Вопросы не найдены
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 animate-fade-in">
      <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
        <span>{quizTitle}</span>
        <span>{currentIdx + 1} / {questions.length}</span>
      </div>
      <Progress value={progress} className="mb-6 h-2" />

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">{current.question_text}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {current.answers.map((ans) => {
            const isSelected = selectedAnswer === ans.id;
            const showResult = confirmed;
            return (
              <button
                key={ans.id}
                disabled={confirmed}
                onClick={() => setSelectedAnswer(ans.id)}
                className={cn(
                  "w-full rounded-lg border p-4 text-left transition-all",
                  !confirmed && isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20",
                  !confirmed && !isSelected && "hover:border-primary/30 hover:bg-accent",
                  showResult && ans.is_correct && "border-success bg-success/10",
                  showResult && isSelected && !ans.is_correct && "border-destructive bg-destructive/10",
                  confirmed && "cursor-default"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{ans.answer_text}</span>
                  {showResult && ans.is_correct && <CheckCircle2 className="h-5 w-5 text-success" />}
                  {showResult && isSelected && !ans.is_correct && <XCircle className="h-5 w-5 text-destructive" />}
                </div>
              </button>
            );
          })}

          <div className="pt-4">
            {!confirmed ? (
              <Button onClick={handleConfirm} disabled={!selectedAnswer} className="w-full">
                Ответить
              </Button>
            ) : (
              <Button onClick={handleNext} className="w-full">
                {currentIdx < questions.length - 1 ? (
                  <>Далее <ArrowRight className="ml-1 h-4 w-4" /></>
                ) : (
                  "Завершить"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
