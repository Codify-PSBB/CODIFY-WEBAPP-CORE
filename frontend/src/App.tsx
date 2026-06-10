import { SignInButton, useAuth, useUser, useClerk } from "@clerk/clerk-react";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import type { CompetitionPhase, CompetitionProblem } from "@/types/models";
import { clearAuthTokenProvider, getLocalTokenPayload, setAuthTokenProvider, setLocalToken, clearLocalToken } from "./lib/auth";
import SchoolEmailGuard from "./components/SchoolEmailGuard";
import { isAdminEmail, normalizeEmail } from "./lib/schoolRules";
import AppLayout from "./components/AppLayout";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CompetitionLobbyPage from "./pages/CompetitionLobbyPage";
import CompetitionPage from "./pages/CompetitionPage";
import InterpreterPage from "./pages/InterpreterPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import SubmissionQueuePage from "./pages/SubmissionQueuePage";
import "./App.css";

interface CompetitionStatusResponse {
  phase?: CompetitionPhase;
  competition_id?: number | null;
  started_at?: string | null;
  problems?: CompetitionProblem[];
}

function MemberCompetitionGuard({
  children,
  phase,
}: {
  children: ReactElement;
  phase: CompetitionPhase;
}) {
  if (phase !== "live") {
    return <Navigate to="/leaderboard" replace />;
  }
  return children;
}

function AdminRouteGuard({ children }: { children: ReactElement }) {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  const email = normalizeEmail(user?.primaryEmailAddress?.emailAddress ?? "");
  if (!isAdminEmail(email)) {
    console.warn(`SECURITY: Non-admin attempted admin access: ${email}`);
    return <Navigate to="/leaderboard" replace />;
  }
  return children;
}

// ----- Login Form -----

function LoginRegisterForm({ onLogin }: { onLogin: () => void }) {
  const [eduId, setEduId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: { eduId, password },
      });
      if (res.data?.token) {
        setLocalToken(res.data.token);
        onLogin();
      } else {
        throw new Error(res.message || "Authentication failed");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="card-modern mx-auto mt-16 max-w-xl">
      <CardContent className="space-y-5 p-8 text-center">
        <img
          src="/codify-logo.png"
          alt="Codify logo"
          className="mx-auto h-16 w-16 rounded-2xl border border-border object-cover"
          loading="eager"
        />
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Codify</h1>
          <p className="text-base text-muted-foreground">
            Sign in to access competitions and rankings.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-3 text-xs font-semibold uppercase tracking-widest text-primary border border-border rounded-full">
            If you're a member
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 text-left mt-2">
            {error && <div className="text-sm text-red-500 text-center font-medium bg-red-500/10 p-2 rounded">{error}</div>}
            <div className="space-y-2">
              <label className="text-sm font-medium">EDU ID</label>
              <Input required value={eduId} onChange={(e) => setEduId(e.target.value)} placeholder="Enter your EDU ID" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button disabled={loading} type="submit" size="lg" className="btn-primary w-full mt-2">
              Login
            </Button>
          </form>
        </div>

        <div className="pt-6 relative mt-2">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-3/4 bg-border"></div>
          <div className="bg-background relative inline-block px-4 -mt-3 mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            If you're an Admin
          </div>
          <SignInButton mode="modal">
            <Button variant="outline" className="w-full mt-2">
              Login as Admin (Google Clerk)
            </Button>
          </SignInButton>
        </div>
      </CardContent>
    </Card>
  );
}

// ----- Main App -----

export default function App() {
  const { getToken, isLoaded: clerkLoaded } = useAuth();
  const { user: clerkUser, isLoaded: clerkUserLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  const [localPayload, setLocalPayload] = useState(getLocalTokenPayload());
  const [competitionPhase, setCompetitionPhase] = useState<CompetitionPhase>("idle");
  const [competitionId, setCompetitionId] = useState<number | null>(null);
  const [competitionProblems, setCompetitionProblems] = useState<CompetitionProblem[]>([]);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    const handleAuthChange = () => setLocalPayload(getLocalTokenPayload());
    window.addEventListener("local-auth-change", handleAuthChange);
    return () => window.removeEventListener("local-auth-change", handleAuthChange);
  }, []);

  const clerkEmail = normalizeEmail(clerkUser?.primaryEmailAddress?.emailAddress ?? "");
  const isAdmin = clerkEmail.length > 0 && isAdminEmail(clerkEmail);
  const isMember = !!localPayload && !isAdmin;
  const isAuthenticated = isAdmin || isMember;
  const isFullyLoaded = clerkLoaded && clerkUserLoaded;

  useEffect(() => {
    setAuthTokenProvider(() => getToken());
    return () => { clearAuthTokenProvider(); };
  }, [getToken]);

  // Poll competition status for members
  useEffect(() => {
    if (!isFullyLoaded || !isAuthenticated || isAdmin) {
      setStatusLoading(false);
      return;
    }

    let active = true;
    let intervalId: number | null = null;

    const fetchStatus = async () => {
      try {
        const response = await apiRequest<CompetitionStatusResponse>("/api/competition/status");
        if (!active) return;
        const phase = response.data?.phase ?? "idle";
        setCompetitionPhase(phase);
        setCompetitionId(response.data?.competition_id ?? null);
        setCompetitionProblems(Array.isArray(response.data?.problems) ? response.data.problems : []);
      } catch {
        if (!active) return;
        setCompetitionPhase("idle");
      }
    };

    setStatusLoading(true);
    void fetchStatus().finally(() => { if (active) setStatusLoading(false); });

    // Poll every 20 seconds
    intervalId = window.setInterval(() => { void fetchStatus(); }, 20000);

    return () => {
      active = false;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [isAdmin, isFullyLoaded, isAuthenticated]);

  if (!isFullyLoaded) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1100px] items-center p-8">
        <Card className="card-modern w-full max-w-md mx-auto">
          <CardContent className="space-y-3 p-8">
            <img src="/codify-logo.png" alt="Codify logo" className="h-12 w-12 rounded-xl border border-border object-cover" loading="eager" />
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Authentication</p>
            <h1 className="text-3xl font-semibold tracking-tight">Loading access...</h1>
            <p className="text-muted-foreground">Loading your session...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1100px] p-8">
        <LoginRegisterForm onLogin={() => setLocalPayload(getLocalTokenPayload())} />
      </main>
    );
  }

  const handleSignOut = () => {
    clearLocalToken();
    if (isAdmin) void clerkSignOut();
    else window.location.href = "/";
  };

  const appLayoutElement = (
    <AppLayout
      competitionPhase={competitionPhase}
      onSignOut={handleSignOut}
    />
  );

  const defaultRedirect = isAdmin
    ? "/admin"
    : competitionPhase === "live"
    ? "/competition"
    : "/leaderboard";

  const routesElement = (
    <Routes>
      <Route path="/" element={appLayoutElement}>
        <Route index element={<Navigate to={defaultRedirect} replace />} />

        {/* Member-only: competition (lobby + actual page) */}
        <Route
          path="competition"
          element={
            <MemberCompetitionGuard phase={competitionPhase}>
              <CompetitionLobbyPage
                competitionId={competitionId}
                problems={competitionProblems}
                startedAt={null}
              />
            </MemberCompetitionGuard>
          }
        />
        <Route
          path="competition/enter"
          element={
            <MemberCompetitionGuard phase={competitionPhase}>
              <CompetitionPage
                competitionId={competitionId}
                problems={competitionProblems}
              />
            </MemberCompetitionGuard>
          }
        />

        <Route
          path="interpreter"
          element={
            competitionPhase !== "live" ? <Navigate to="/leaderboard" replace /> : <InterpreterPage />
          }
        />
        <Route path="leaderboard" element={<LeaderboardPage />} />

        {/* Admin-only */}
        <Route path="admin" element={<AdminRouteGuard><AdminDashboardPage /></AdminRouteGuard>} />
        <Route path="admin/queue" element={<AdminRouteGuard><SubmissionQueuePage /></AdminRouteGuard>} />
      </Route>
    </Routes>
  );

  if (isAdmin) {
    return <SchoolEmailGuard>{routesElement}</SchoolEmailGuard>;
  }

  return routesElement;
}
