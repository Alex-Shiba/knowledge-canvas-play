import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, ArrowRight } from "lucide-react";

interface AttemptGroup {
  quizId: string;
  quizTitle: string;
  attempts: {
    id: string;
    score: number;
    total_questions: number;
    completed_at: string;
  }[];
  bestScore: number;
  totalQuestions: number;
}

export default function MyResults() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<AttemptGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAttempts = async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("id, score, total_questions, completed_at, quiz_id, quizzes(title)")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      if (data) {
        const map = new Map<string, AttemptGroup>();
        for (const a of data) {
          const qTitle = (a.quizzes as any)?.title || "Без названия";
          if (!map.has(a.quiz_id)) {
            map.set(a.quiz_id, {
              quizId: a.quiz_id,
              quizTitle: qTitle,
              attempts: [],
              bestScore: 0,
              totalQuestions: a.total_questions,
            });
          }
          const g = map.get(a.quiz_id)!;
          g.attempts.push({ id: a.id, score: a.score, total_questions: a.total_questions, completed_at: a.completed_at });
          if (a.score > g.bestScore) g.bestScore = a.score;
        }
        setGroups(Array.from(map.values()));
      }
      setLoading(false);
    };
    fetchAttempts();
  }, [user]);

  return (
    <div className="container py-6 px-4">
      <h1 className="font-display text-3xl font-bold mb-6 animate-fade-in">Мои результаты</h1>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-5 w-1/3 rounded bg-muted" /></CardContent></Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground animate-fade-in">
          <Trophy className="mx-auto h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg">Вы ещё не прошли ни одного квиза</p>
          <Button asChild className="mt-4">
            <Link to="/">Перейти к квизам</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g, i) => (
            <Card key={g.quizId} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-display">{g.quizTitle}</CardTitle>
                <Badge variant="secondary">
                  Лучший: {g.bestScore}/{g.totalQuestions}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {g.attempts.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(a.completed_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <span className="font-medium">{a.score}/{a.total_questions} ({Math.round((a.score / a.total_questions) * 100)}%)</span>
                    </div>
                  ))}
                  {g.attempts.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">и ещё {g.attempts.length - 5} попыток</p>
                  )}
                </div>
                <Button variant="outline" size="sm" asChild className="mt-3">
                  <Link to={`/quiz/${g.quizId}`}>
                    Пройти снова <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
