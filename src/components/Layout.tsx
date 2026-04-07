import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, BarChart3, Menu, X } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = (
    <>
      <Button
        variant={isActive("/") ? "secondary" : "ghost"}
        size="sm"
        asChild
        onClick={() => setMenuOpen(false)}
      >
        <Link to="/">Квизы</Link>
      </Button>
      <Button
        variant={isActive("/my-results") ? "secondary" : "ghost"}
        size="sm"
        asChild
        onClick={() => setMenuOpen(false)}
      >
        <Link to="/my-results">
          <BarChart3 className="mr-1 h-4 w-4" />
          Результаты
        </Link>
      </Button>
      {isAdmin && (
        <Button
          variant={isActive("/admin") ? "secondary" : "ghost"}
          size="sm"
          asChild
          onClick={() => setMenuOpen(false)}
        >
          <Link to="/admin">
            <LayoutDashboard className="mr-1 h-4 w-4" />
            Админ
          </Link>
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => {
          handleSignOut();
          setMenuOpen(false);
        }}
      >
        <LogOut className="mr-1 h-4 w-4" />
        Выйти
      </Button>
    </>
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[60rem]"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 0%, hsl(var(--primary) / 0.38) 0%, hsl(var(--primary) / 0.14) 40%, transparent 80%)",
        }}
      />

      {/* Ticker */}
      <div className="bg-primary overflow-hidden whitespace-nowrap">
        <div className="animate-marquee inline-block py-2 text-[13px] font-bold uppercase text-primary-foreground" style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: '2px' }}>
          <span className="mx-16">КТО ТЫ — НОВИЧОК, АНАЛИТИК ИЛИ СЛЕДОВАТЕЛЬ? •</span>
          <span className="mx-16">СОЛОВЬЁВ LIVE · ЭКСКЛЮЗИВ •</span>
          <span className="mx-16">ПРОВЕРЬ СВОИ ЗНАНИЯ •</span>
          <span className="mx-16">12 ВОПРОСОВ О ГЕОПОЛИТИКЕ •</span>
          <span className="mx-16">КТО ТЫ — НОВИЧОК, АНАЛИТИК ИЛИ СЛЕДОВАТЕЛЬ? •</span>
          <span className="mx-16">СОЛОВЬЁВ LIVE · ЭКСКЛЮЗИВ •</span>
          <span className="mx-16">ПРОВЕРЬ СВОИ ЗНАНИЯ •</span>
          <span className="mx-16">12 ВОПРОСОВ О ГЕОПОЛИТИКЕ •</span>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="shrink-0">
            <img src="/logo_main.svg" alt="Соловьёв LIVE" className="h-7" />
          </Link>

          {user && (
            <>
              <nav className="hidden items-center gap-1 sm:flex">{navLinks}</nav>

              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </>
          )}
        </div>

        {user && menuOpen && (
          <div className="flex flex-col gap-1 border-t bg-card px-4 py-3 animate-fade-in sm:hidden">
            {navLinks}
          </div>
        )}
      </header>

      <main className="relative overflow-x-hidden">{children}</main>
    </div>
  );
}
