import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

interface SubmissionGroupRow {
  group_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  competition_id: number;
  elapsed_seconds: number;
  submitted_at: string;
}

interface PendingSubmissionRow {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  problem_id: number;
  problem_title: string;
  code: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_by: number | null;
  elapsed_seconds: number | null;
  submission_group_id: number | null;
}

export const adminSubmissionsHandler: RouteHandler = async (ctx) => {
  try {
    const db = createDbClient(ctx.env.DB);

    // Fetch pending submissions with elapsed time from their submission group
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
        s.reviewed_by,
        s.submission_group_id,
        sg.elapsed_seconds
      FROM submissions s
      INNER JOIN users u ON u.id = s.user_id
      INNER JOIN problems p ON p.id = s.problem_id
      LEFT JOIN submission_groups sg ON sg.id = s.submission_group_id
      WHERE s.status = 'pending'
      ORDER BY sg.elapsed_seconds ASC, s.created_at ASC`
    );

    // Also expose grouped view: one row per student showing all their submissions
    const groups = await db.all<SubmissionGroupRow>(
      `SELECT
        sg.id AS group_id,
        sg.user_id,
        u.name AS user_name,
        u.email AS user_email,
        sg.competition_id,
        sg.elapsed_seconds,
        sg.created_at AS submitted_at
      FROM submission_groups sg
      INNER JOIN users u ON u.id = sg.user_id
      ORDER BY sg.elapsed_seconds ASC, sg.created_at ASC`
    );

    return Response.json({
      status: "success",
      data: {
        submissions,
        groups,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { status: "error", message: `Failed to fetch pending submissions: ${errorMessage}` },
      { status: 500 }
    );
  }
};
