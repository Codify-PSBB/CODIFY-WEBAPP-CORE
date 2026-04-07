import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

const APP_STATUS_KEY = "app_status";
const OFF_VOTES_REQUIRED = 2;

type AppStatus = "ON" | "OFF";

interface ToggleRequestBody {
  status?: unknown;
}

interface VoteCountRow {
  count: number;
}

interface VotePresenceRow {
  admin_email: string;
}

function normalizeStatus(value: string | null): AppStatus {
  const upper = (value ?? "ON").trim().toUpperCase();
  return upper === "OFF" ? "OFF" : "ON";
}

function parseStatus(value: unknown): AppStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === "ON" || normalized === "OFF") {
    return normalized;
  }

  return null;
}

function buildVotePayload(currentVotes: number, hasVotedOff: boolean) {
  return {
    off_vote_count: currentVotes,
    off_votes_required: OFF_VOTES_REQUIRED,
    remaining_off_votes: Math.max(OFF_VOTES_REQUIRED - currentVotes, 0),
    has_voted_off: hasVotedOff
  };
}

async function countVotes(db: ReturnType<typeof createDbClient>): Promise<number> {
  const row = await db.first<VoteCountRow>("SELECT COUNT(*) AS count FROM app_toggle_off_votes");
  return row?.count ?? 0;
}

async function hasVoted(db: ReturnType<typeof createDbClient>, adminEmail: string): Promise<boolean> {
  const row = await db.first<VotePresenceRow>(
    "SELECT admin_email FROM app_toggle_off_votes WHERE admin_email = ?",
    [adminEmail]
  );

  return Boolean(row);
}

async function clearVotes(db: ReturnType<typeof createDbClient>): Promise<void> {
  await db.run("DELETE FROM app_toggle_off_votes");
}

export const adminToggleGetHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) {
    return Response.json(
      {
        status: "error",
        message: "Authentication context missing."
      },
      { status: 500 }
    );
  }

  try {
    const currentStatus = await ctx.env.APP_STATE.get(APP_STATUS_KEY);
    const appStatus = normalizeStatus(currentStatus);
    const db = createDbClient(ctx.env.DB);
    const voteCount = await countVotes(db);
    const hasVotedOff = appStatus === "OFF" ? false : await hasVoted(db, ctx.user.email);

    return Response.json({
      status: "success",
      data: {
        app_status: appStatus,
        ...buildVotePayload(appStatus === "OFF" ? 0 : voteCount, hasVotedOff)
      }
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to read app status."
      },
      { status: 500 }
    );
  }
};

export const adminToggleHandler: RouteHandler = async (ctx) => {
  if (!ctx.user) {
    return Response.json(
      {
        status: "error",
        message: "Authentication context missing."
      },
      { status: 500 }
    );
  }

  let body: ToggleRequestBody;

  try {
    body = (await ctx.request.json()) as ToggleRequestBody;
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Invalid JSON body."
      },
      { status: 400 }
    );
  }

  const status = parseStatus(body.status);
  if (!status) {
    return Response.json(
      {
        status: "error",
        message: "`status` is required and must be `ON` or `OFF`."
      },
      { status: 400 }
    );
  }

  try {
    const db = createDbClient(ctx.env.DB);

    if (status === "ON") {
      await ctx.env.APP_STATE.put(APP_STATUS_KEY, "ON");
      await clearVotes(db);

      return Response.json({
        status: "success",
        data: {
          app_status: "ON",
          ...buildVotePayload(0, false),
          turned_off: false,
          message: "Competition turned ON. OFF votes were reset."
        }
      });
    }

    const currentStatus = normalizeStatus(await ctx.env.APP_STATE.get(APP_STATUS_KEY));
    if (currentStatus === "OFF") {
      await clearVotes(db);

      return Response.json({
        status: "success",
        data: {
          app_status: "OFF",
          ...buildVotePayload(0, false),
          turned_off: true,
          message: "Competition is already OFF."
        }
      });
    }

    await db.run(
      `INSERT INTO app_toggle_off_votes (admin_email, voted_at)
       VALUES (?, CURRENT_TIMESTAMP)
       ON CONFLICT(admin_email) DO UPDATE SET voted_at = excluded.voted_at`,
      [ctx.user.email]
    );

    const voteCount = await countVotes(db);

    if (voteCount >= OFF_VOTES_REQUIRED) {
      await ctx.env.APP_STATE.put(APP_STATUS_KEY, "OFF");
      await clearVotes(db);

      return Response.json({
        status: "success",
        data: {
          app_status: "OFF",
          ...buildVotePayload(OFF_VOTES_REQUIRED, true),
          turned_off: true,
          message: "Competition turned OFF after receiving 2 admin votes."
        }
      });
    }

    return Response.json({
      status: "success",
      data: {
        app_status: "ON",
        ...buildVotePayload(voteCount, true),
        turned_off: false,
        message: `${OFF_VOTES_REQUIRED - voteCount} more OFF vote required.`
      }
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to update app status."
      },
      { status: 500 }
    );
  }
};
