import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth,
  useUser
} from "@clerk/clerk-react";
import { useEffect } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { clearAuthTokenProvider, setAuthTokenProvider } from "./lib/auth";
import SchoolEmailGuard from "./components/SchoolEmailGuard";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CompetitionPage from "./pages/CompetitionPage";
import InterpreterPage from "./pages/InterpreterPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import "./App.css";

function SignedInShell() {
  const { user } = useUser();

  return (
    <>
      <header>
        <p>Signed in as: {user?.primaryEmailAddress?.emailAddress ?? "Unknown"}</p>
        <UserButton />
      </header>

      <nav>
        <NavLink to="/competition">Competition</NavLink>
        <NavLink to="/interpreter">Interpreter</NavLink>
        <NavLink to="/leaderboard">Leaderboard</NavLink>
        <NavLink to="/admin">Admin Dashboard</NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<CompetitionPage />} />
        <Route path="/competition" element={<CompetitionPage />} />
        <Route path="/interpreter" element={<InterpreterPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    setAuthTokenProvider(() => getToken());

    return () => {
      clearAuthTokenProvider();
    };
  }, [getToken]);

  if (!isLoaded) {
    return (
      <main className="app-shell">
        <h1>Coding Club Platform</h1>
        <p>Loading authentication...</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <h1>Coding Club Platform</h1>

      <SignedOut>
        <p>Please sign in with your school account to continue.</p>
        <SignInButton mode="modal" />
      </SignedOut>

      <SignedIn>
        <SchoolEmailGuard>
          <SignedInShell />
        </SchoolEmailGuard>
      </SignedIn>
    </main>
  );
}
