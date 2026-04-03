import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    <div className="container py-6 px-4">
      <div className="mb-8 animate-fade-in">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Квизы</h1>
        <p className="mt-2 text-muted-foreground">Выберите квиз и проверьте свои знания</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или категории..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 w-2/3 rounded bg-muted" /><div className="mt-2 h-4 w-full rounded bg-muted" /></CardHeader>
              <CardContent><div className="h-8 w-24 rounded bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg">Квизы не найдены</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((quiz, i) => (
            <Card
              key={quiz.id}
              className="group transition-all hover:shadow-lg hover:border-primary/30 animate-fade-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-display">{quiz.title}</CardTitle>
                  {quiz.category && (
                    <Badge variant="secondary" className="shrink-0 ml-2">{quiz.category}</Badge>
                  )}
                </div>
                {quiz.description && (
                  <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {quiz.question_count} {quiz.question_count === 1 ? "вопрос" : quiz.question_count < 5 ? "вопроса" : "вопросов"}
                </span>
                <Button size="sm" asChild className="group-hover:translate-x-0.5 transition-transform">
                  <Link to={`/quiz/${quiz.id}`}>
                    Начать <ArrowRight className="ml-1 h-4 w-4" />
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
