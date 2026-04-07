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
        className="pointer-events-none absolute left-1/2 top-[-18rem] h-[44rem] w-[120rem] -translate-x-1/2 rounded-[50%] bg-primary/[0.10] blur-[180px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-4rem] h-[34rem] w-[96rem] -translate-x-1/2 rounded-[50%] bg-primary/[0.05] blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[60rem] opacity-[0.18] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "120px 120px",
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
