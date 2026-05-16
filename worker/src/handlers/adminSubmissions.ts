import { createClerkClient } from "@clerk/backend";
import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

interface PendingSubmissionRow {
  id: number;
  user_id: number;
  clerk_user_id: string | null;
  user_email: string;
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
        u.clerk_user_id AS clerk_user_id,
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

    const clerkSecretKey = ctx.env.CLERK_SECRET_KEY;
    const clerkClient = clerkSecretKey ? createClerkClient({ secretKey: clerkSecretKey }) : null;

    const clerkUserIds = Array.from(
      new Set(submissions.map((s) => (s.clerk_user_id ?? "").trim()).filter(Boolean))
    );

    const clerkNameById = new Map<string, string>();
    const clerkNameByEmail = new Map<string, string>();

    if (clerkClient) {
      if (clerkUserIds.length > 0) {
        await Promise.all(
          clerkUserIds.map(async (id) => {
            try {
              const user = await clerkClient.users.getUser(id);
              const resolvedFullName =
                (user.fullName ??
                  [user.firstName, user.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim()) ||
                deriveFallbackName(user.emailAddresses[0]?.emailAddress ?? "");

              if (resolvedFullName) clerkNameById.set(id, resolvedFullName);
            } catch {
              // ignore individual failures
            }
          })
        );
      }

      const missingEmails = Array.from(
        new Set(submissions.filter((s) => !(s.clerk_user_id ?? "").trim()).map((s) => s.user_email))
      );

      if (missingEmails.length > 0) {
        try {
          const { data: users } = await clerkClient.users.getUserList({ emailAddress: missingEmails });
          for (const user of users) {
            const resolvedFullName =
              (user.fullName ??
                [user.firstName, user.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim()) ||
              deriveFallbackName(user.emailAddresses[0]?.emailAddress ?? "");

            if (resolvedFullName) {
              for (const email of user.emailAddresses) {
                clerkNameByEmail.set(email.emailAddress, resolvedFullName);
              }
            }
          }
        } catch {
          // ignore fallback
        }
      }
    }

    const responseSubmissions: PendingSubmissionResponseRow[] = submissions.map((s) => {
      const clerkId = s.clerk_user_id ?? "";
      const resolvedName =
        (clerkId ? clerkNameById.get(clerkId) : null) ??
        clerkNameByEmail.get(s.user_email) ??
        deriveFallbackName(s.user_email);

      return {
        ...s,
        user_name: resolvedName
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
