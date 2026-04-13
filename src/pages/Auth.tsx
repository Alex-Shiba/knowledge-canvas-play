import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail } from "lucide-react";

type AuthMethod = "email" | "phone";
type EmailMode = "login" | "register" | "forgot";

export default function Auth() {
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [emailMode, setEmailMode] = useState<EmailMode>("login");

  // Email fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Phone fields
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword, signInWithPhone, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- Email flow ---
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (emailMode === "forgot") {
      const { error } = await resetPassword(email);
      setLoading(false);
      if (error) {
        toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Письмо отправлено", description: "Проверьте почту для сброса пароля" });
        setEmailMode("login");
      }
      return;
    }

    if (emailMode === "register") {
      const { error } = await signUp(email, password, displayName);
      setLoading(false);
      if (error) {
        toast({ title: "Ошибка регистрации", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Регистрация успешна", description: "Проверьте почту для подтверждения" });
        setEmailMode("login");
      }
      return;
    }

    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      if (error.message === "Invalid login credentials") {
        setEmailMode("register");
        toast({ title: "Аккаунт не найден", description: "Заполните имя и зарегистрируйтесь" });
      } else {
        toast({ title: "Ошибка входа", description: error.message, variant: "destructive" });
      }
    } else {
      navigate("/");
    }
  };

  // --- Phone flow ---
  const handlePhoneSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithPhone(phone);
    setLoading(false);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      setOtpSent(true);
      toast({ title: "Код отправлен", description: "Введите код из SMS" });
    }
  };

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await verifyOtp(phone, otpCode);
    setLoading(false);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
  };

  const subtitle = () => {
    if (authMethod === "phone") return otpSent ? "Введите код из SMS" : "Введите номер телефона";
    if (emailMode === "login") return "Введите данные для входа";
    if (emailMode === "register") return "Создайте аккаунт";
    return "Введите email для сброса";
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
          <p className="text-muted-foreground text-sm mt-2">{subtitle()}</p>
        </div>

        {/* Method toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={authMethod === "email" ? "default" : "outline"}
            className="flex-1 text-xs uppercase tracking-wider"
            onClick={() => { setAuthMethod("email"); setOtpSent(false); }}
          >
            <Mail className="mr-1 h-4 w-4" /> Email
          </Button>
          <Button
            type="button"
            variant={authMethod === "phone" ? "default" : "outline"}
            className="flex-1 text-xs uppercase tracking-wider"
            onClick={() => { setAuthMethod("phone"); setEmailMode("login"); }}
          >
            <Phone className="mr-1 h-4 w-4" /> Телефон
          </Button>
        </div>

        {/* Form */}
        <div className="rounded-lg border border-border bg-card p-6">
          {authMethod === "email" ? (
            <>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {emailMode === "register" && (
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
                {emailMode !== "forgot" && (
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
                  {loading ? "Загрузка..." : emailMode === "login" ? "Войти" : emailMode === "register" ? "Зарегистрироваться" : "Отправить ссылку"}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                {emailMode === "login" && (
                  <>
                    <button onClick={() => setEmailMode("forgot")} className="text-accent hover:underline">
                      Забыли пароль?
                    </button>
                    <span className="mx-2 text-border">·</span>
                    <button onClick={() => setEmailMode("register")} className="text-accent hover:underline">
                      Создать аккаунт
                    </button>
                  </>
                )}
                {emailMode === "register" && (
                  <button onClick={() => setEmailMode("login")} className="text-accent hover:underline">
                    Уже есть аккаунт? Войти
                  </button>
                )}
                {emailMode === "forgot" && (
                  <button onClick={() => setEmailMode("login")} className="text-accent hover:underline">
                    Вернуться к входу
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {!otpSent ? (
                <form onSubmit={handlePhoneSendOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">Номер телефона</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+7 999 123 45 67"
                      required
                      className="bg-background border-border"
                    />
                    <p className="text-xs text-muted-foreground">Формат: +7XXXXXXXXXX</p>
                  </div>
                  <Button type="submit" className="w-full uppercase tracking-wider text-xs py-5" disabled={loading}>
                    {loading ? "Отправка..." : "Получить код"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handlePhoneVerify} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-xs uppercase tracking-wider text-muted-foreground">Код из SMS</Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      required
                      maxLength={6}
                      className="bg-background border-border text-center text-lg tracking-[0.5em]"
                    />
                  </div>
                  <Button type="submit" className="w-full uppercase tracking-wider text-xs py-5" disabled={loading}>
                    {loading ? "Проверка..." : "Войти"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(""); }}
                    className="w-full text-center text-sm text-accent hover:underline"
                  >
                    Изменить номер
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
