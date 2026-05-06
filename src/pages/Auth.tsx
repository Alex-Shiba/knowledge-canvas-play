import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { phoneLogin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\+\d{10,15}$/.test(phone)) {
      toast({
        title: "Неверный формат",
        description: "Номер должен начинаться с + и содержать 10–15 цифр",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await phoneLogin(phone);
    setLoading(false);

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-10 h-10 bg-primary rounded flex items-center justify-center text-sm font-bold text-primary-foreground">
            QF
          </div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-wider">
            Quiz<span className="text-primary">Flow</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2">Введите номер телефона</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">
                Номер телефона
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+996555703050"
                required
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground">Формат: +XXXXXXXXXXXX</p>
            </div>
            <Button type="submit" className="w-full uppercase tracking-wider text-xs py-5" disabled={loading}>
              {loading ? "Загрузка..." : "Войти / Зарегистрироваться"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
