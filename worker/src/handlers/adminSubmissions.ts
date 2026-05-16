import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

interface PendingSubmissionRow {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  problem_id: number;
  problem_title: string;
  code: string;
  status: "pending";
  created_at: string;
  reviewed_by: number | null;
}

interface PendingSubmissionResponseRow extends PendingSubmissionRow {
  user_name: string;
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

export const adminSubmissionsHandler: RouteHandler = async (ctx) => {
  try {
    const db = createDbClient(ctx.env.DB);

    const submissions = await db.all<PendingSubmissionRow>(
      `SELECT
        s.id,
        s.user_id,
        u.name AS user_name,
        u.email AS user_email,
        s.problem_id,
        p.title AS problem_title,
        s.code,
        s.status,
        s.created_at,
        s.reviewed_by
      FROM submissions s
      INNER JOIN users u ON u.id = s.user_id
      INNER JOIN problems p ON p.id = s.problem_id
      WHERE s.status = 'pending'
      ORDER BY s.created_at ASC`
    );

    const responseSubmissions: PendingSubmissionResponseRow[] = submissions.map((s) => {
      return {
        ...s
      };
    });

    return Response.json({
      status: "success",
      data: {
        submissions: responseSubmissions
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      {
        status: "error",
        message: `Failed to fetch pending submissions: ${errorMessage}`
      },
      { status: 500 }
    );
  }
};
