import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, ArrowRight } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  question_count: number;
}

export default function Index() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizzes = async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("id, title, description, category, questions(id)")
        .eq("is_published", true);

      if (data) {
        setQuizzes(
          data.map((q) => ({
            id: q.id,
            title: q.title,
            description: q.description,
            category: q.category,
            question_count: q.questions?.length ?? 0,
          }))
        );
      }
      setLoading(false);
    };
    fetchQuizzes();
  }, []);

  const filtered = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.category?.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(quizzes.map((q) => q.category).filter(Boolean))];

  return (
    <div className="container py-8 px-4 max-w-2xl">
      <div className="mb-8 text-center animate-fade-in">
        <img src="/logo_main.svg" alt="Соловьёв Квиз" className="mx-auto mb-4 h-7 w-auto" />
        <h1 className="text-4xl font-bold uppercase leading-tight md:text-5xl" style={{ fontFamily: "'Oswald', sans-serif" }}>
          Соловьёв <span className="text-primary">Квиз</span>
        </h1>
        <p className="mt-4 text-muted-foreground italic max-w-md mx-auto">
          Выберите квиз, ответьте на вопросы и узнайте свой уровень знаний
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или категории..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge
            variant={search === "" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSearch("")}
          >
            Все
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={search === cat ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSearch(cat!)}
            >
              {cat}
            </Badge>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-border bg-card p-5">
              <div className="h-5 w-2/3 rounded bg-muted mb-2" />
              <div className="h-4 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg">Квизы не найдены</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((quiz, i) => (
            <Link
              key={quiz.id}
              to={`/quiz/${quiz.id}`}
              className="group block rounded-lg border border-border bg-[hsl(0_0%_3%/0.5)] p-5 transition-all hover:bg-card hover:border-primary/30 animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="text-2xl shrink-0 mt-0.5">🎯</div>
                  <div className="min-w-0">
                    <h3 className="text-xs uppercase tracking-wider text-accent mb-1.5">
                      {quiz.category || "Квиз"}
                    </h3>
                    <p className="font-medium text-foreground">{quiz.title}</p>
                    {quiz.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {quiz.question_count} {quiz.question_count === 1 ? "вопрос" : quiz.question_count < 5 ? "вопроса" : "вопросов"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 text-center text-xs tracking-[3px] text-muted-foreground/50 uppercase">
        Соловьёв<span className="text-primary/50"> LIVE</span>
      </div>
    </div>
  );
}
