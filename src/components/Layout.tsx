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
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { handleSignOut(); setMenuOpen(false); }}>
        <LogOut className="mr-1 h-4 w-4" />
        Выйти
      </Button>
    </>
  );

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Top accent bar */}
      <div className="bg-primary px-4 py-2 flex justify-between items-center text-[11px] uppercase tracking-wider text-primary-foreground/90">
        <span>Проверь свои знания</span>
        <span className="hidden sm:inline">Интерактивные квизы</span>
        <span className="hidden md:inline">Узнай свой уровень</span>
      </div>

      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 bg-primary rounded flex items-center justify-center text-xs font-bold text-primary-foreground">
              QF
            </div>
            <span className="font-display text-sm font-semibold tracking-wider uppercase">
              Quiz<span className="text-primary">Flow</span>
            </span>
          </Link>

          {user && (
            <>
              <nav className="hidden sm:flex items-center gap-1">
                {navLinks}
              </nav>

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
          <div className="sm:hidden border-t bg-card px-4 py-3 flex flex-col gap-1 animate-fade-in">
            {navLinks}
          </div>
        )}
      </header>
      <main className="overflow-x-hidden">{children}</main>
    </div>
  );
}
