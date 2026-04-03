import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, ArrowRight, Trophy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Answer {
  id: string;
  answer_text: string;
  order_num: number;
}

interface Question {
  id: string;
  question_text: string;
  order_num: number;
  answers: Answer[];
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
  const [answerCorrectMap, setAnswerCorrectMap] = useState<Record<string, boolean>>({});
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [resultDetails, setResultDetails] = useState<{ question_text: string; correct_answer: string; user_answer: string; isCorrect: boolean }[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const [{ data: quiz }, { data: questionsData }] = await Promise.all([
        supabase.from("quizzes").select("title").eq("id", id).single(),
        supabase.rpc("get_quiz_questions", { _quiz_id: id }),
      ]);
      if (quiz) setQuizTitle(quiz.title);
      if (questionsData) setQuestions(questionsData as Question[]);
      setLoading(false);
    };
    load();
  }, [id]);

  const current = questions[currentIdx];
  const progress = questions.length > 0 ? ((currentIdx + (confirmed ? 1 : 0)) / questions.length) * 100 : 0;

  const handleConfirm = async () => {
    if (!selectedAnswer || !current) return;
    setChecking(true);

    // Check answer server-side
    const { data: isCorrect } = await supabase.rpc("check_answer", { _answer_id: selectedAnswer });
    const correct = !!isCorrect;

    setAnswerCorrectMap((prev) => ({ ...prev, [selectedAnswer]: correct }));
    setUserAnswers((prev) => [
      ...prev,
      { questionId: current.id, answerId: selectedAnswer, isCorrect: correct },
    ]);
    setConfirmed(true);
    setChecking(false);
  };

  const handleNext = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
      setConfirmed(false);
    } else {
      // Submit via secure server function
      if (user && id) {
        const payload = userAnswers.map((ua) => ({
          question_id: ua.questionId,
          selected_answer_id: ua.answerId,
        }));
        await supabase.rpc("submit_quiz_attempt", {
          _quiz_id: id,
          _answers: payload as any,
        });
      }

      // Build result details from local data
      const details = questions.map((q, i) => {
        const ua = userAnswers[i];
        const selectedAns = q.answers.find((a) => a.id === ua?.answerId);
        return {
          question_text: q.question_text,
          user_answer: selectedAns?.answer_text ?? "",
          correct_answer: "", // we don't know the correct text, only correctness
          isCorrect: ua?.isCorrect ?? false,
        };
      });
      setResultDetails(details);
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
            {resultDetails.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border p-4",
                  item.isCorrect ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
                )}
              >
                <div className="flex items-start gap-2">
                  {item.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium">{item.question_text}</p>
                    {!item.isCorrect && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Ваш ответ: <span className="text-destructive font-medium">{item.user_answer}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
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

  const currentCorrect = confirmed ? answerCorrectMap : {};

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
            const isCheckedCorrect = currentCorrect[ans.id];
            const showCorrect = confirmed && isSelected && isCheckedCorrect === true;
            const showWrong = confirmed && isSelected && isCheckedCorrect === false;
            return (
              <button
                key={ans.id}
                disabled={confirmed || checking}
                onClick={() => setSelectedAnswer(ans.id)}
                className={cn(
                  "w-full rounded-lg border p-4 text-left transition-all",
                  !confirmed && isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20",
                  !confirmed && !isSelected && "hover:border-primary/30 hover:bg-accent",
                  showCorrect && "border-success bg-success/10",
                  showWrong && "border-destructive bg-destructive/10",
                  (confirmed || checking) && "cursor-default"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>{ans.answer_text}</span>
                  {showCorrect && <CheckCircle2 className="h-5 w-5 text-success" />}
                  {showWrong && <XCircle className="h-5 w-5 text-destructive" />}
                </div>
              </button>
            );
          })}

          <div className="pt-4">
            {!confirmed ? (
              <Button onClick={handleConfirm} disabled={!selectedAnswer || checking} className="w-full">
                {checking ? "Проверка..." : "Ответить"}
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
