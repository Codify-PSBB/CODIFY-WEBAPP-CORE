import { isAdminEmail } from "../lib/schoolRules";
import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

interface LeaderboardUserRow {
  xp: number;
  name: string;
  email: string;
  grade: number | null;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  student_id: string;
  xp: number;
  grade: number | null;
}

function deriveFallbackName(email: string): string {
  const localPart = email.split("@")[0] ?? "student";
  const spaced = localPart.replace(/[._-]+/g, " ").trim();
  if (!spaced) return "Student";
  return spaced
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function deriveStudentId(email: string): string {
  const id = (email.split("@")[0] ?? "student").toLowerCase();
  if (id.length <= 2) return "••";
  if (id.length <= 5) return `${id[0]}${"•".repeat(id.length - 2)}${id[id.length - 1]}`;
  return `${id.slice(0, 2)}${"•".repeat(Math.min(6, id.length - 4))}${id.slice(-2)}`;
}

interface CachePayload {
  leaderboard: LeaderboardEntry[];
  grade9: LeaderboardEntry[];
  grade10: LeaderboardEntry[];
}

let cachedResponse: { data: CachePayload; timestamp: number } | null = null;
const CACHE_TTL_MS = 5000;

export const leaderboardHandler: RouteHandler = async (ctx) => {
  try {
    const now = Date.now();
    if (cachedResponse && (now - cachedResponse.timestamp) < CACHE_TTL_MS) {
      return Response.json({ status: "success", data: cachedResponse.data });
    }

    const db = createDbClient(ctx.env.DB);

    const allRows = await db.all<LeaderboardUserRow>(
      "SELECT xp, name, email, grade FROM users ORDER BY xp DESC, email ASC"
    );
    const rows = allRows.filter((r) => !isAdminEmail(r.email));

    const fullLeaderboard = rows.map((row) => {
      const name = row.name && row.name.trim().length > 0
        ? row.name
        : deriveFallbackName(row.email);

      return {
        name,
        student_id: deriveStudentId(row.email),
        xp: row.xp,
        grade: row.grade,
      };
    });

    const addRanks = (list: Omit<LeaderboardEntry, "rank">[]) =>
      list.map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    const leaderboard = addRanks(fullLeaderboard);
    const grade9 = addRanks(fullLeaderboard.filter((u) => u.grade === 9));
    const grade10 = addRanks(fullLeaderboard.filter((u) => u.grade === 10));

    const resultData = { leaderboard, grade9, grade10 };
    cachedResponse = { data: resultData, timestamp: now };

    return Response.json({ status: "success", data: resultData });
  } catch (error: unknown) {
    console.error("leaderboardHandler error", error);
    return Response.json(
      { status: "error", message: "Failed to fetch leaderboard." },
      { status: 500 }
    );
  }
};
