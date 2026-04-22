import { createDbClient } from "../lib/db";
import type { RouteHandler } from "../types";

interface ProblemRow {
  id: number;
  title: string;
  description: string;
  public_testcase_1_input: string | null;
  public_testcase_1_output: string | null;
  public_testcase_2_input: string | null;
  public_testcase_2_output: string | null;
  public_testcase_3_input: string | null;
  public_testcase_3_output: string | null;
  testcases: string | null;
  xp_reward: number;
  active: number;
  created_at: string;
}

export const problemsHandler: RouteHandler = async (ctx) => {
  try {
    const db = createDbClient(ctx.env.DB);

    const problems = await db.all<ProblemRow>(
      `SELECT
        id,
        title,
        description,
        public_testcase_1_input,
        public_testcase_1_output,
        public_testcase_2_input,
        public_testcase_2_output,
        public_testcase_3_input,
        public_testcase_3_output,
        testcases,
        xp_reward,
        active,
        created_at
      FROM problems
      WHERE active = 1
      ORDER BY created_at DESC, id DESC
      LIMIT 1`
    );

    return Response.json({
      status: "success",
      data: {
        problems
      }
    });
  } catch {
    return Response.json(
      {
        status: "error",
        message: "Failed to fetch problems."
      },
      { status: 500 }
    );
  }
};
