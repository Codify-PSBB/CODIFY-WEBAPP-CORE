import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import type { CompetitionPhase, CompetitionProblem } from "@/types/models";
import { clearLocalToken, getLocalTokenPayload, setLocalToken } from "./lib/auth";
import AppLayout from "./components/AppLayout";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CompetitionLobbyPage from "./pages/CompetitionLobbyPage";
import CompetitionPage from "./pages/CompetitionPage";
import InterpreterPage from "./pages/InterpreterPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import SubmissionQueuePage from "./pages/SubmissionQueuePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import "./App.css";

interface CompetitionStatusResponse {
  phase?: CompetitionPhase;
  competition_id?: number | null;
  started_at?: string | null;
  problems?: CompetitionProblem[];
}

// ── Auth guards ──────────────────────────────────────────────────────────────

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
  const payload = getLocalTokenPayload();
  if (payload?.role !== "admin") {
    return <Navigate to="/leaderboard" replace />;
  }
  return children;
}

// ── Login form ───────────────────────────────────────────────────────────────

function LoginForm({ onLogin }: { onLogin: () => void }) {
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

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {error && (
            <div className="text-sm text-red-500 text-center font-medium bg-red-500/10 p-2 rounded">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">EDU ID</label>
            <Input
              required
              value={eduId}
              onChange={(e) => setEduId(e.target.value)}
              placeholder="e.g. s220162"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button disabled={loading} type="submit" size="lg" className="btn-primary w-full mt-2">
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [localPayload, setLocalPayload] = useState(getLocalTokenPayload());
  const [competitionPhase, setCompetitionPhase] = useState<CompetitionPhase>("idle");
  const [competitionId, setCompetitionId] = useState<number | null>(null);
  const [competitionProblems, setCompetitionProblems] = useState<CompetitionProblem[]>([]);

  // Sync local token state on storage changes (e.g. logout from another tab)
  useEffect(() => {
    const handleAuthChange = () => setLocalPayload(getLocalTokenPayload());
    window.addEventListener("local-auth-change", handleAuthChange);
    return () => window.removeEventListener("local-auth-change", handleAuthChange);
  }, []);

  const isAuthenticated = !!localPayload;
  const isAdmin = localPayload?.role === "admin";

  // Poll competition status for members
  useEffect(() => {
    if (!isAuthenticated || isAdmin) return;

    let active = true;
    let intervalId: number | null = null;

    const fetchStatus = async () => {
      try {
        const response = await apiRequest<CompetitionStatusResponse>("/api/competition/status");
        if (!active) return;
        setCompetitionPhase(response.data?.phase ?? "idle");
        setCompetitionId(response.data?.competition_id ?? null);
        setCompetitionProblems(
          Array.isArray(response.data?.problems) ? response.data.problems : []
        );
      } catch {
        if (!active) return;
        setCompetitionPhase("idle");
      }
    };

    void fetchStatus();
    intervalId = window.setInterval(() => { void fetchStatus(); }, 20000);

    return () => {
      active = false;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [isAuthenticated, isAdmin]);

  // Not logged in → show login form
  if (!isAuthenticated) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[1100px] p-8">
        <LoginForm onLogin={() => setLocalPayload(getLocalTokenPayload())} />
      </main>
    );
  }

  const handleSignOut = () => {
    clearLocalToken();
    setLocalPayload(null);
  };

  const defaultRedirect = isAdmin
    ? "/admin"
    : competitionPhase === "live"
    ? "/competition"
    : "/leaderboard";

  return (
    <Routes>
      <Route
        path="/"
        element={
          <AppLayout competitionPhase={competitionPhase} onSignOut={handleSignOut} />
        }
      >
        <Route index element={<Navigate to={defaultRedirect} replace />} />

        {/* Member: competition */}
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
            competitionPhase !== "live" ? (
              <Navigate to="/leaderboard" replace />
            ) : (
              <InterpreterPage />
            )
          }
        />

        <Route path="leaderboard" element={<LeaderboardPage />} />

        {/* Admin only */}
        <Route
          path="admin"
          element={
            <AdminRouteGuard>
              <AdminDashboardPage />
            </AdminRouteGuard>
          }
        />
        <Route
          path="admin/queue"
          element={
            <AdminRouteGuard>
              <SubmissionQueuePage />
            </AdminRouteGuard>
          }
        />
      </Route>
    </Routes>
  );
}
