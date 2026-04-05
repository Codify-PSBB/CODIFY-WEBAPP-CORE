import { NavLink, Route, Routes } from "react-router-dom";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CompetitionPage from "./pages/CompetitionPage";
import InterpreterPage from "./pages/InterpreterPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import "./App.css";

function getStoredToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem("auth_token") ?? "";
}

export default function App() {
  function handleTokenChange(value: string) {
    window.localStorage.setItem("auth_token", value.trim());
  }

  return (
    <main className="app-shell">
      <h1>Coding Club Platform</h1>

      <nav>
        <NavLink to="/competition">Competition</NavLink>
        <NavLink to="/interpreter">Interpreter</NavLink>
        <NavLink to="/leaderboard">Leaderboard</NavLink>
        <NavLink to="/admin">Admin Dashboard</NavLink>
      </nav>

      <section>
        <label htmlFor="auth-token">Bearer Token (Clerk session token)</label>
        <input
          id="auth-token"
          defaultValue={getStoredToken()}
          onChange={(event) => handleTokenChange(event.target.value)}
          placeholder="Paste Clerk token here"
        />
      </section>

      <Routes>
        <Route path="/" element={<CompetitionPage />} />
        <Route path="/competition" element={<CompetitionPage />} />
        <Route path="/interpreter" element={<InterpreterPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes>
    </main>
  );
}
