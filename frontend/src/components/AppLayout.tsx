import { UserButton, useUser, useClerk } from "@clerk/clerk-react";
import { LogOut, Palette } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { isAdminEmail, normalizeEmail } from "@/lib/schoolRules";
import { getLocalTokenPayload, clearLocalToken } from "@/lib/auth";
import { useTheme, Theme } from "@/components/ThemeProvider";
import { useState, useRef, useEffect } from "react";

export default function AppLayout({
  memberLeaderboardOnly,
  onSignOut
}: {
  memberLeaderboardOnly?: boolean;
  onSignOut?: () => void;
}) {
  const { pathname } = useLocation();
  const { user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const themesList: { id: Theme; name: string; iconBg: string; borderCol: string }[] = [
    { id: "light", name: "Light Minimalist", iconBg: "bg-slate-100", borderCol: "border-slate-300" },
    { id: "nordic", name: "Nordic Frost", iconBg: "bg-blue-50", borderCol: "border-sky-300" },
    { id: "paper", name: "Vintage Print", iconBg: "bg-[#f4f1ea]", borderCol: "border-stone-400" },
    { id: "dark", name: "Carbon Space", iconBg: "bg-zinc-900", borderCol: "border-zinc-700" },
    { id: "cyberpunk", name: "Cyberpunk Neon", iconBg: "bg-purple-950", borderCol: "border-purple-500" },
    { id: "matrix", name: "Retro Matrix", iconBg: "bg-black", borderCol: "border-emerald-500" },
    { id: "solarized", name: "Solarized Amber", iconBg: "bg-amber-950", borderCol: "border-amber-600" }
  ];
  
  const localUser = getLocalTokenPayload();
  
  const email = normalizeEmail(clerkUser?.primaryEmailAddress?.emailAddress ?? "");
  const isAdmin = email.length > 0 && isAdminEmail(email);

  const navItems = [];
  
  if (isAdmin) {
    navItems.push(
      { name: "Admin Dashboard", path: "/admin" },
      { name: "Queue", path: "/admin/queue" }
    );
  }

  if (!memberLeaderboardOnly || isAdmin) {
    navItems.push(
      { name: "Competition", path: "/competition" },
      { name: "Interpreter", path: "/interpreter" }
    );
  }

  navItems.push({ name: "Leaderboard", path: "/leaderboard" });

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    } else {
      clearLocalToken();
      if (isAdmin) {
        void clerkSignOut();
      } else {
        window.location.href = "/";
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center space-x-3 transition-opacity hover:opacity-80">
              <img src="/codify-logo.png" alt="Codify logo" className="h-8 w-8 rounded-lg object-cover" />
              <span className="font-semibold tracking-tight text-lg">Codify</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1.5 ml-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname === item.path
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin ? (
              <UserButton appearance={{ elements: { userButtonAvatarBox: "ring-2 ring-primary" } }} />
            ) : (
              <div className="hidden sm:flex text-sm text-foreground/80 break-all font-medium bg-secondary/50 px-3 py-1.5 rounded-full">
                 {localUser?.name || localUser?.email}
              </div>
            )}
            {/* Theme Picker Dropdown */}
            <div className="relative" ref={themeMenuRef}>
              <Button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                variant="outline"
                size="icon"
                className="rounded-full h-9 w-9 p-0 hover:bg-secondary/80 click-press"
                title="Change Theme"
              >
                <Palette className="h-4.5 w-4.5" />
              </Button>

              {showThemeMenu && (
                <div className="absolute right-0 mt-2.5 w-56 rounded-2xl border border-border bg-card p-2.5 shadow-lg z-50 animate-fade-in">
                  <div className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Choose Theme
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {themesList.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl text-left hover:bg-secondary transition-colors ${
                          theme === t.id ? "bg-secondary font-semibold" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`h-4.5 w-4.5 rounded-full border ${t.iconBg} ${t.borderCol} shrink-0`} />
                          <span>{t.name}</span>
                        </div>
                        {theme === t.id && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleSignOut} variant="outline" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] flex-1 p-6 sm:p-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
