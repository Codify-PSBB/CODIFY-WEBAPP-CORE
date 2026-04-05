import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import type { LeaderboardEntry } from "../types/models";

interface LeaderboardResponse {
  leaderboard?: LeaderboardEntry[];
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadLeaderboard() {
    setLoading(true);
    setMessage("");

    try {
      const response = await apiRequest<LeaderboardResponse>("/api/leaderboard");
      setEntries(Array.isArray(response.data?.leaderboard) ? response.data.leaderboard : []);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to load leaderboard.";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLeaderboard();
  }, []);

  return (
    <section>
      <h2>Leaderboard</h2>
      <button type="button" onClick={() => void loadLeaderboard()} disabled={loading}>
        Refresh Leaderboard
      </button>

      {message ? <p>{message}</p> : null}

      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>XP</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={`${entry.rank}-${entry.name}`}>
              <td>{entry.rank}</td>
              <td>{entry.name}</td>
              <td>{entry.xp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
