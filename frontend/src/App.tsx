import { SignInButton, useAuth, useUser, useClerk } from "@clerk/clerk-react";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import type { AppStatus } from "@/types/models";
import { clearAuthTokenProvider, getLocalTokenPayload, setAuthTokenProvider, setLocalToken, clearLocalToken } from "./lib/auth";
import SchoolEmailGuard from "./components/SchoolEmailGuard";
import { isAdminEmail, normalizeEmail } from "./lib/schoolRules";
import AppLayout from "./components/AppLayout";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CompetitionPage from "./pages/CompetitionPage";
import InterpreterPage from "./pages/InterpreterPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import SubmissionQueuePage from "./pages/SubmissionQueuePage";
import "./App.css";

interface PublicStatusResponse {
  app_status?: AppStatus;
}

function MemberAppOnGuard({ children, leaderboardOnly }: { children: ReactElement; leaderboardOnly: boolean }) {
  if (leaderboardOnly) {
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
    return <Navigate to="/competition" replace />;
  }

  console.log(`SECURITY: Admin access granted to: ${email}`);
  return children;
}

// ----- Login Components for Custom Auth -----

function LoginRegisterForm({ onLogin }: { onLogin: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [eduId, setEduId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister ? { eduId, password, name } : { eduId, password };
      
      const res = await apiRequest<{ token: string }>(endpoint, { method: "POST", body });
      if (res.data?.token) {
        setLocalToken(res.data.token);
        onLogin();
      } else {
        throw new Error(res.error || "Authentication failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
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
            {isRegister ? "Register for the competition using your EDU ID" : "Sign in to access competitions and rankings."}
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
              <Input required value={eduId} onChange={e => setEduId(e.target.value)} placeholder="Enter your EDU ID" />
            </div>
            {isRegister && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="��������" />
            </div>
            
            <Button disabled={loading} type="submit" size="lg" className="btn-primary w-full">
              {isRegister ? "Register" : "Login"}
            </Button>
          </form>

          <div className="pt-4 flex flex-col space-y-2 items-center text-sm text-muted-foreground">
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="hover:text-primary underline underline-offset-4">
              {isRegister ? "Already registered? Sign in" : "Need an account? Register here"}
            </button>
          </div>
        </div>

        <div className="pt-6 relative">
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

// ----- Main App Component -----

export default function App() {
  const { getToken, isLoaded: clerkLoaded } = useAuth();
  const { user: clerkUser, isLoaded: clerkUserLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  
  const [localPayload, setLocalPayload] = useState(getLocalTokenPayload());
  const [memberAppStatus, setMemberAppStatus] = useState<AppStatus>("ON");
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

  const memberLeaderboardOnly = !isAdmin && memberAppStatus === "OFF";

  useEffect(() => {
    setAuthTokenProvider(() => getToken());
    return () => {
      clearAuthTokenProvider();
    };
  }, [getToken]);

  useEffect(() => {
    if (!isFullyLoaded || !isAuthenticated || isAdmin) {
      setStatusLoading(false);
      setMemberAppStatus("ON");
      return;
    }

    let active = true;
    let intervalId: number | null = null;

    const fetchStatus = async () => {
      try {
        const response = await apiRequest<PublicStatusResponse>("/api/status");
        if (!active) return;
        const status = response.data?.app_status === "OFF" ? "OFF" : "ON";
        setMemberAppStatus(status);
      } catch {
        if (!active) return;
        setMemberAppStatus("OFF");
      }
    };

    setStatusLoading(true);
    void fetchStatus().finally(() => {
      if (active) setStatusLoading(false);
    });

    intervalId = window.setInterval(() => {
      void fetchStatus();
    }, 30000);

    return () => {
      active = false;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [isAdmin, isFullyLoaded, isAuthenticated]);

  if (!isFullyLoaded || statusLoading) {
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
  };

  const appLayoutElement = (
    <AppLayout memberLeaderboardOnly={memberLeaderboardOnly} onSignOut={handleSignOut} />
  );

  const LayoutWrapper = isAdmin ? 
    ({ children }: { children: ReactElement }) => <SchoolEmailGuard>{children}</SchoolEmailGuard> :
    ({ children }: { children: ReactElement }) => <>{children}</>;

  return (
    <LayoutWrapper>
      <Routes>
        <Route path="/" element={appLayoutElement}>
          <Route index element={<Navigate to={memberLeaderboardOnly ? "/leaderboard" : "/competition"} replace />} />
          <Route path="competition" element={
            <MemberAppOnGuard leaderboardOnly={memberLeaderboardOnly}>
              <CompetitionPage />
            </MemberAppOnGuard>
          } />
          <Route path="interpreter" element={
            <MemberAppOnGuard leaderboardOnly={memberLeaderboardOnly}>
              <InterpreterPage />
            </MemberAppOnGuard>
          } />
          <Route path="leaderboard" element={<LeaderboardPage />} />

          <Route path="admin" element={<AdminRouteGuard><AdminDashboardPage /></AdminRouteGuard>} />
          <Route path="admin/queue" element={<AdminRouteGuard><SubmissionQueuePage /></AdminRouteGuard>} />
        </Route>
      </Routes>
    </LayoutWrapper>
  );
}
