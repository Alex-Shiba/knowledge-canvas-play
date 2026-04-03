import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, LayoutDashboard, BarChart3, Brain } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-bold">QuizFlow</span>
          </Link>

          {user && (
            <nav className="flex items-center gap-1">
              <Button
                variant={isActive("/") ? "secondary" : "ghost"}
                size="sm"
                asChild
              >
                <Link to="/">Квизы</Link>
              </Button>
              <Button
                variant={isActive("/my-results") ? "secondary" : "ghost"}
                size="sm"
                asChild
              >
                <Link to="/my-results">
                  <BarChart3 className="mr-1 h-4 w-4" />
                  Мои результаты
                </Link>
              </Button>
              {isAdmin && (
                <Button
                  variant={isActive("/admin") ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                >
                  <Link to="/admin">
                    <LayoutDashboard className="mr-1 h-4 w-4" />
                    Админ
                  </Link>
                </Button>
              )}
              <div className="ml-2 h-6 w-px bg-border" />
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleSignOut}>
                <LogOut className="mr-1 h-4 w-4" />
                Выйти
              </Button>
            </nav>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
