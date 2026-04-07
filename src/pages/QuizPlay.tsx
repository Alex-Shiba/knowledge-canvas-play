import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight, Trophy, RotateCcw, Timer } from "lucide-react";
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

const LETTERS = ["А", "Б", "В", "Г", "Д", "Е", "Ж", "З"];
const TIME_PER_QUESTION = 15;

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
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [resultDetails, setResultDetails] = useState<{ question_text: string; correct_answer: string; user_answer: string; isCorrect: boolean }[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const [{ data: quiz }, { data: questionsData }] = await Promise.all([
        supabase.from("quizzes").select("title").eq("id", id).single(),
        supabase.rpc("get_quiz_questions", { _quiz_id: id }),
      ]);
      if (quiz) setQuizTitle(quiz.title);
      if (questionsData) setQuestions(questionsData as unknown as Question[]);
      setLoading(false);
    };
    load();
  }, [id]);

  const current = questions[currentIdx];

  // Auto-confirm with no answer when time runs out
  const handleTimeUp = useCallback(async () => {
    if (confirmed || finished || !current) return;
    // Record as wrong answer with no selection
    setUserAnswers((prev) => [
      ...prev,
      { questionId: current.id, answerId: "", isCorrect: false },
    ]);
    setConfirmed(true);
  }, [confirmed, finished, current]);

  // Timer effect
  useEffect(() => {
    if (loading || finished || confirmed) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(TIME_PER_QUESTION);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIdx, loading, finished, confirmed, handleTimeUp]);

  const handleConfirm = async () => {
    if (!selectedAnswer || !current) return;
    setChecking(true);
    if (timerRef.current) clearInterval(timerRef.current);
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
      const details = questions.map((q, i) => {
        const ua = userAnswers[i];
        const selectedAns = q.answers.find((a) => a.id === ua?.answerId);
        return {
          question_text: q.question_text,
          user_answer: selectedAns?.answer_text ?? "",
          correct_answer: "",
          isCorrect: ua?.isCorrect ?? false,
        };
      });
      setResultDetails(details);
      setFinished(true);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (finished) {
    const score = userAnswers.filter((a) => a.isCorrect).length;
    const pct = Math.round((score / questions.length) * 100);
    const level = pct >= 90 ? "Эксперт 🏆" : pct >= 70 ? "Аналитик 🎯" : pct >= 50 ? "Знаток 📚" : "Новичок 🌱";

    return (
      <div className="container max-w-xl py-8 px-4 animate-fade-in">
        <div className="text-center mb-8">
          <Trophy className={cn("mx-auto h-14 w-14 mb-4", pct >= 70 ? "text-accent" : "text-muted-foreground")} />
          <h2 className="font-display text-3xl font-bold uppercase">
            {pct >= 90 ? "Отлично!" : pct >= 70 ? "Хороший результат!" : pct >= 50 ? "Неплохо!" : "Можно лучше!"}
          </h2>
          <p className="text-5xl font-bold text-primary mt-3">{score}/{questions.length}</p>
          <p className="text-muted-foreground mt-1">{pct}% правильных ответов</p>
          <div className="mt-3 inline-block border border-accent/40 text-accent text-xs uppercase tracking-wider px-4 py-1.5 rounded">
            {level}
          </div>
        </div>

        <div className="space-y-3">
          {resultDetails.map((item, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border p-4",
                item.isCorrect ? "border-success/30 bg-success/5" : "border-primary/30 bg-primary/5"
              )}
            >
              <div className="flex items-start gap-3">
                {item.isCorrect ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                )}
                <div>
                  <p className="font-medium text-sm">{item.question_text}</p>
                  {!item.isCorrect && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ваш ответ: <span className="text-primary font-medium">{item.user_answer}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
            К квизам
          </Button>
          <Button onClick={() => window.location.reload()} className="flex-1">
            <RotateCcw className="mr-1 h-4 w-4" /> Пройти снова
          </Button>
        </div>
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
    <div className="container max-w-xl py-8 px-4 animate-fade-in">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        {questions.map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-3 h-3 rounded-full transition-colors",
              i === currentIdx && "bg-success",
              i < currentIdx && "bg-muted-foreground/50",
              i > currentIdx && "bg-border"
            )}
          />
        ))}
      </div>

      {/* Question label + Timer */}
      <div className="flex items-center justify-between mb-5">
        <div className="inline-block border border-accent/40 text-accent text-[10px] uppercase tracking-wider px-3 py-1.5 rounded">
          Вопрос {currentIdx + 1} из {questions.length}
        </div>
        {!confirmed && (
          <div className={cn(
            "flex items-center gap-1.5 text-sm font-mono font-semibold px-3 py-1.5 rounded border",
            timeLeft <= 5 ? "text-primary border-primary/40 animate-pulse" : "text-accent border-accent/40"
          )}>
            <Timer className="h-3.5 w-3.5" />
            {timeLeft}с
          </div>
        )}
      </div>

      {/* Question box */}
      <div className="bg-[hsl(0_0%_3%/0.5)] border-l-[3px] border-l-accent pl-5 pr-4 py-5 mb-6 rounded-r-md select-none" onCopy={(e) => e.preventDefault()}>
        <p className="text-lg leading-relaxed italic">{current.question_text}</p>
        <p className="text-muted-foreground text-sm mt-3 italic">Выберите правильный ответ</p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {current.answers.map((ans, idx) => {
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
                "w-full rounded-md border p-4 text-left transition-all flex items-center gap-3.5",
                !confirmed && !isSelected && "border-border bg-[hsl(0_0%_5%)] hover:bg-[hsl(0_0%_8%)] hover:border-muted-foreground/30",
                !confirmed && isSelected && "border-success bg-success/10",
                showCorrect && "border-success bg-success/15",
                showWrong && "border-primary bg-primary/10",
                (confirmed || checking) && "cursor-default"
              )}
            >
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                !confirmed && !isSelected && "bg-border text-muted-foreground",
                (!confirmed && isSelected || showCorrect) && "bg-success text-success-foreground",
                showWrong && "bg-primary text-primary-foreground"
              )}>
                {LETTERS[idx] || idx + 1}
              </span>
              <span className="text-[15px]">{ans.answer_text}</span>
              {showCorrect && <CheckCircle2 className="ml-auto h-5 w-5 text-success shrink-0" />}
              {showWrong && <XCircle className="ml-auto h-5 w-5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Time up message */}
      {confirmed && !selectedAnswer && (
        <div className="text-center text-primary font-semibold text-sm mb-4 uppercase tracking-wider">
          ⏰ Время вышло!
        </div>
      )}

      {/* Action button */}
      {!confirmed ? (
        <Button onClick={handleConfirm} disabled={!selectedAnswer || checking} className="uppercase tracking-wider text-xs py-5 w-full">
          {checking ? "Проверка..." : "Ответить"}
        </Button>
      ) : (
        <Button onClick={handleNext} className="uppercase tracking-wider text-xs py-5 w-full">
          {currentIdx < questions.length - 1 ? (
            <>Следующий вопрос <ArrowRight className="ml-2 h-4 w-4" /></>
          ) : (
            "Завершить квиз"
          )}
        </Button>
      )}
    </div>
  );
}
