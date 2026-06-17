import { LogOut, Palette, Radio } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getLocalTokenPayload, clearLocalToken } from "@/lib/auth";
import { useTheme, Theme } from "@/components/ThemeProvider";
import { useState, useRef, useEffect } from "react";
import type { CompetitionPhase } from "@/types/models";

export default function AppLayout({
  competitionPhase = "idle",
  onSignOut,
}: {
  competitionPhase?: CompetitionPhase;
  onSignOut?: () => void;
}) {
  const { pathname } = useLocation();
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
    { id: "sakura", name: "Sakura Blossom", iconBg: "bg-rose-100", borderCol: "border-rose-300" },
    { id: "ethereal", name: "Ethereal Dreamscape", iconBg: "bg-purple-100", borderCol: "border-purple-300" },
    { id: "dark", name: "Carbon Space", iconBg: "bg-zinc-900", borderCol: "border-zinc-700" },
    { id: "academia", name: "Dark Academia", iconBg: "bg-[#24211f]", borderCol: "border-red-900" },
    { id: "forest", name: "Emerald Moss", iconBg: "bg-[#0c1a15]", borderCol: "border-emerald-700" },
    { id: "synthwave", name: "Synthwave Outrun", iconBg: "bg-fuchsia-950", borderCol: "border-pink-500" },
    { id: "cyberpunk", name: "Cyberpunk Neon", iconBg: "bg-purple-950", borderCol: "border-purple-500" },
    { id: "matrix", name: "Retro Matrix", iconBg: "bg-black", borderCol: "border-emerald-500" },
    { id: "dracula", name: "Dracula Classic", iconBg: "bg-[#282a36]", borderCol: "border-purple-400" },
    { id: "solarized", name: "Solarized Amber", iconBg: "bg-amber-950", borderCol: "border-amber-600" },
    { id: "ocean", name: "Ocean Depth", iconBg: "bg-cyan-950", borderCol: "border-cyan-600" },
    { id: "sunset", name: "Crimson Sunset", iconBg: "bg-orange-950", borderCol: "border-orange-500" },
  ];

  const localUser = getLocalTokenPayload();
  const isAdmin = localUser?.role === "admin";
  const isLive = competitionPhase === "live";

  const navItems: { name: string; path: string; live?: boolean }[] = [];

  if (isAdmin) {
    navItems.push(
      { name: "Admin Dashboard", path: "/admin" },
      { name: "Queue", path: "/admin/queue" }
    );
  }

  if (isAdmin || isLive) {
    navItems.push({ name: "Competition", path: "/competition", live: isLive && !isAdmin });
    navItems.push({ name: "Interpreter", path: "/interpreter" });
  }

  navItems.push({ name: "Leaderboard", path: "/leaderboard" });

  const handleSignOut = () => {
    clearLocalToken();
    if (onSignOut) {
      onSignOut();
    } else {
      window.location.href = "/";
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
                  className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    pathname === item.path || pathname.startsWith(item.path + "/")
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  {item.name}
                  {"live" in item && item.live && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Live indicator for admins */}
            {isAdmin && isLive && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600 dark:text-green-400 border border-green-500/20">
                <Radio className="size-3 animate-pulse" />
                LIVE
              </div>
            )}

            {/* User identity badge */}
            <div className="hidden sm:flex text-sm text-foreground/80 break-all font-medium bg-secondary/50 px-3 py-1.5 rounded-full">
              {localUser?.name || localUser?.email}
            </div>

            {/* Theme Picker */}
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
                  <div className="mt-1.5 space-y-1 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {themesList.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setTheme(t.id); setShowThemeMenu(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl text-left hover:bg-secondary transition-colors ${
                          theme === t.id ? "bg-secondary font-semibold" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`h-4.5 w-4.5 rounded-full border ${t.iconBg} ${t.borderCol} shrink-0`} />
                          <span>{t.name}</span>
                        </div>
                        {theme === t.id && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
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
