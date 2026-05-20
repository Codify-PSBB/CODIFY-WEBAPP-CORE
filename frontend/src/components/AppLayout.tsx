import { UserButton, useUser, useClerk } from "@clerk/clerk-react";
import { LogOut } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { isAdminEmail, normalizeEmail } from "@/lib/schoolRules";
import { getLocalTokenPayload, clearLocalToken } from "@/lib/auth";

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
