import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "forgot") {
      const { error } = await resetPassword(email);
      setLoading(false);
      if (error) {
        toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Письмо отправлено", description: "Проверьте почту для сброса пароля" });
        setMode("login");
      }
      return;
    }

    if (mode === "register") {
      const { error } = await signUp(email, password, displayName);
      setLoading(false);
      if (error) {
        toast({ title: "Ошибка регистрации", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Регистрация успешна", description: "Проверьте почту для подтверждения" });
        setMode("login");
      }
      return;
    }

    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      if (error.message === "Invalid login credentials") {
        setMode("register");
        toast({ title: "Аккаунт не найден", description: "Заполните имя и зарегистрируйтесь" });
      } else {
        toast({ title: "Ошибка входа", description: error.message, variant: "destructive" });
      }
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-10 h-10 bg-primary rounded flex items-center justify-center text-sm font-bold text-primary-foreground">
            QF
          </div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
            Quiz<span className="text-primary">Flow</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            {mode === "login" && "Введите данные для входа"}
            {mode === "register" && "Создайте аккаунт"}
            {mode === "forgot" && "Введите email для сброса"}
          </p>
        </div>

        {/* Form */}
        <div className="rounded-lg border border-border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Имя</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ваше имя"
                  required
                  className="bg-background border-border"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="bg-background border-border"
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-background border-border"
                />
              </div>
            )}
            <Button type="submit" className="w-full uppercase tracking-wider text-xs py-5" disabled={loading}>
              {loading ? "Загрузка..." : mode === "login" ? "Войти" : mode === "register" ? "Зарегистрироваться" : "Отправить ссылку"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("forgot")} className="text-accent hover:underline">
                  Забыли пароль?
                </button>
                <span className="mx-2 text-border">·</span>
                <button onClick={() => setMode("register")} className="text-accent hover:underline">
                  Создать аккаунт
                </button>
              </>
            )}
            {mode === "register" && (
              <button onClick={() => setMode("login")} className="text-accent hover:underline">
                Уже есть аккаунт? Войти
              </button>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} className="text-accent hover:underline">
                Вернуться к входу
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
