import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, Pencil, Trash2, Users, BarChart3, ClipboardPaste } from "lucide-react";

interface QuizRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_published: boolean;
  questions: { id: string }[];
  attempts_count: number;
}

interface JsonQuiz {
  title: string;
  description?: string;
  category?: string;
  questions: {
    question_text: string;
    answers: { answer_text: string; is_correct: boolean }[];
  }[];
}

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editQuiz, setEditQuiz] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ title: string; description: string; category: string; questions: { id?: string; question_text: string; answers: { id?: string; answer_text: string; is_correct: boolean }[] }[] }>({ title: "", description: "", category: "", questions: [] });
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchQuizzes = async () => {
    const { data } = await supabase
      .from("quizzes")
      .select("id, title, description, category, is_published, questions(id)")
      .order("created_at", { ascending: false });

    if (data) {
      // Get attempt counts
      const quizIds = data.map((q) => q.id);
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("quiz_id")
        .in("quiz_id", quizIds);

      const countMap = new Map<string, number>();
      attempts?.forEach((a) => countMap.set(a.quiz_id, (countMap.get(a.quiz_id) || 0) + 1));

      setQuizzes(
        data.map((q) => ({
          ...q,
          questions: q.questions ?? [],
          attempts_count: countMap.get(q.id) || 0,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json: JsonQuiz = JSON.parse(text);

      if (!json.title || !json.questions?.length) {
        toast({ title: "Ошибка", description: "JSON должен содержать title и questions", variant: "destructive" });
        return;
      }

      const { data: quiz, error } = await supabase
        .from("quizzes")
        .insert({ title: json.title, description: json.description || null, category: json.category || null, created_by: user!.id })
        .select("id")
        .single();

      if (error || !quiz) {
        toast({ title: "Ошибка создания квиза", description: error?.message, variant: "destructive" });
        return;
      }

      for (let i = 0; i < json.questions.length; i++) {
        const q = json.questions[i];
        const { data: question } = await supabase
          .from("questions")
          .insert({ quiz_id: quiz.id, question_text: q.question_text, order_num: i })
          .select("id")
          .single();

        if (question) {
          await supabase.from("answers").insert(
            q.answers.map((a, j) => ({
              question_id: question.id,
              answer_text: a.answer_text,
              is_correct: a.is_correct,
              order_num: j,
            }))
          );
        }
      }

      toast({ title: "Квиз загружен" });
      fetchQuizzes();
    } catch {
      toast({ title: "Ошибка", description: "Неверный формат JSON", variant: "destructive" });
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const togglePublish = async (quizId: string, published: boolean) => {
    await supabase.from("quizzes").update({ is_published: published }).eq("id", quizId);
    setQuizzes((prev) => prev.map((q) => (q.id === quizId ? { ...q, is_published: published } : q)));
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm("Удалить квиз?")) return;
    await supabase.from("quizzes").delete().eq("id", quizId);
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    toast({ title: "Квиз удалён" });
  };

  const openEditor = async (quizId: string) => {
    const { data: quiz } = await supabase.from("quizzes").select("title, description, category").eq("id", quizId).single();
    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_text, order_num, answers(id, answer_text, is_correct, order_num)")
      .eq("quiz_id", quizId)
      .order("order_num");

    if (quiz && questions) {
      setEditQuiz(quizId);
      setEditData({
        title: quiz.title,
        description: quiz.description || "",
        category: quiz.category || "",
        questions: questions.map((q) => ({
          id: q.id,
          question_text: q.question_text,
          answers: (q.answers ?? []).sort((a, b) => a.order_num - b.order_num).map((a) => ({
            id: a.id,
            answer_text: a.answer_text,
            is_correct: a.is_correct,
          })),
        })),
      });
      setDialogOpen(true);
    }
  };

  const openNewEditor = () => {
    setEditQuiz(null);
    setEditData({ title: "", description: "", category: "", questions: [{ question_text: "", answers: [{ answer_text: "", is_correct: true }, { answer_text: "", is_correct: false }] }] });
    setDialogOpen(true);
  };

  const saveQuiz = async () => {
    setSaving(true);
    try {
      let quizId = editQuiz;

      if (quizId) {
        await supabase.from("quizzes").update({ title: editData.title, description: editData.description || null, category: editData.category || null }).eq("id", quizId);
        // Delete old questions (cascade deletes answers)
        await supabase.from("questions").delete().eq("quiz_id", quizId);
      } else {
        const { data } = await supabase
          .from("quizzes")
          .insert({ title: editData.title, description: editData.description || null, category: editData.category || null, created_by: user!.id })
          .select("id")
          .single();
        quizId = data?.id;
      }

      if (!quizId) throw new Error("No quiz ID");

      for (let i = 0; i < editData.questions.length; i++) {
        const q = editData.questions[i];
        const { data: question } = await supabase
          .from("questions")
          .insert({ quiz_id: quizId, question_text: q.question_text, order_num: i })
          .select("id")
          .single();

        if (question) {
          await supabase.from("answers").insert(
            q.answers.map((a, j) => ({
              question_id: question.id,
              answer_text: a.answer_text,
              is_correct: a.is_correct,
              order_num: j,
            }))
          );
        }
      }

      toast({ title: editQuiz ? "Квиз обновлён" : "Квиз создан" });
      setDialogOpen(false);
      fetchQuizzes();
    } catch (err: any) {
      toast({ title: "Ошибка", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const addQuestion = () => {
    setEditData((d) => ({
      ...d,
      questions: [...d.questions, { question_text: "", answers: [{ answer_text: "", is_correct: true }, { answer_text: "", is_correct: false }] }],
    }));
  };

  const removeQuestion = (idx: number) => {
    setEditData((d) => ({ ...d, questions: d.questions.filter((_, i) => i !== idx) }));
  };

  const updateQuestion = (idx: number, text: string) => {
    setEditData((d) => ({ ...d, questions: d.questions.map((q, i) => (i === idx ? { ...q, question_text: text } : q)) }));
  };

  const addAnswer = (qIdx: number) => {
    setEditData((d) => ({
      ...d,
      questions: d.questions.map((q, i) => (i === qIdx ? { ...q, answers: [...q.answers, { answer_text: "", is_correct: false }] } : q)),
    }));
  };

  const removeAnswer = (qIdx: number, aIdx: number) => {
    setEditData((d) => ({
      ...d,
      questions: d.questions.map((q, i) => (i === qIdx ? { ...q, answers: q.answers.filter((_, j) => j !== aIdx) } : q)),
    }));
  };

  const updateAnswer = (qIdx: number, aIdx: number, text: string) => {
    setEditData((d) => ({
      ...d,
      questions: d.questions.map((q, i) => (i === qIdx ? { ...q, answers: q.answers.map((a, j) => (j === aIdx ? { ...a, answer_text: text } : a)) } : q)),
    }));
  };

  const setCorrect = (qIdx: number, aIdx: number) => {
    setEditData((d) => ({
      ...d,
      questions: d.questions.map((q, i) => (i === qIdx ? { ...q, answers: q.answers.map((a, j) => ({ ...a, is_correct: j === aIdx })) } : q)),
    }));
  };

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold">Админ-панель</h1>
          <p className="text-muted-foreground">Управление квизами</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" /> Загрузить JSON
          </Button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleJsonUpload} />
          <Button onClick={openNewEditor}>
            <Plus className="mr-1 h-4 w-4" /> Создать квиз
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-5 w-1/3 rounded bg-muted" /></CardContent></Card>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          <p className="text-lg">Квизов пока нет. Создайте первый!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((q, i) => (
            <Card key={q.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="flex-1 min-w-[200px]">
                  <h3 className="font-display font-semibold">{q.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    {q.category && <Badge variant="secondary" className="text-xs">{q.category}</Badge>}
                    <span>{q.questions.length} вопр.</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{q.attempts_count} прохожд.</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`pub-${q.id}`} className="text-sm">Опубликован</Label>
                    <Switch id={`pub-${q.id}`} checked={q.is_published} onCheckedChange={(v) => togglePublish(q.id, v)} />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => openEditor(q.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => deleteQuiz(q.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editQuiz ? "Редактировать квиз" : "Новый квиз"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={editData.title} onChange={(e) => setEditData((d) => ({ ...d, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Категория</Label>
                <Input value={editData.category} onChange={(e) => setEditData((d) => ({ ...d, category: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={editData.description} onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Вопросы</Label>
                <Button variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="mr-1 h-3 w-3" /> Добавить вопрос
                </Button>
              </div>

              {editData.questions.map((q, qIdx) => (
                <Card key={qIdx} className="p-4">
                  <div className="flex items-start gap-2">
                    <span className="mt-2 text-sm font-medium text-muted-foreground">{qIdx + 1}.</span>
                    <div className="flex-1 space-y-3">
                      <Input
                        placeholder="Текст вопроса"
                        value={q.question_text}
                        onChange={(e) => updateQuestion(qIdx, e.target.value)}
                      />
                      {q.answers.map((a, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={a.is_correct}
                            onChange={() => setCorrect(qIdx, aIdx)}
                            className="h-4 w-4 accent-primary"
                          />
                          <Input
                            placeholder={`Вариант ${aIdx + 1}`}
                            value={a.answer_text}
                            onChange={(e) => updateAnswer(qIdx, aIdx, e.target.value)}
                            className="flex-1"
                          />
                          {q.answers.length > 2 && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeAnswer(qIdx, aIdx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        {q.answers.length < 4 && (
                          <Button variant="ghost" size="sm" onClick={() => addAnswer(qIdx)}>
                            <Plus className="mr-1 h-3 w-3" /> Вариант
                          </Button>
                        )}
                      </div>
                    </div>
                    {editData.questions.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeQuestion(qIdx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <Button onClick={saveQuiz} disabled={saving || !editData.title || editData.questions.some((q) => !q.question_text || q.answers.some((a) => !a.answer_text))} className="w-full">
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
