export type CompetitionPhase = "idle" | "setup" | "live" | "ended";

export interface CompetitionState {
  phase: CompetitionPhase;
  competition_id: number | null;
  started_at: string | null;
  problems: CompetitionProblem[];
}

export interface CompetitionProblem {
  id: number;
  title: string;
  description: string;
  xp_reward: number;
  public_testcase_1_input: string | null;
  public_testcase_1_output: string | null;
  public_testcase_2_input: string | null;
  public_testcase_2_output: string | null;
  public_testcase_3_input: string | null;
  public_testcase_3_output: string | null;
  display_order: number;
}

export interface Problem {
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
  created_at?: string;
  submission_count?: number;
}

export interface Submission {
  id: number;
  user_id: number;
  problem_id: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface PendingSubmission {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  problem_id: number;
  problem_title: string;
  code: string;
  status: "pending";
  created_at: string;
  reviewed_by: number | null;
  elapsed_seconds: number | null;
  submission_group_id: number | null;
}

export interface SubmissionGroup {
  group_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  competition_id: number;
  elapsed_seconds: number;
  submitted_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  student_id: string;
  xp: number;
  grade: number | null;
}

export interface AdminUser {
  name: string;
  email: string;
  role: "member" | "admin";
  xp: number;
}

// Legacy — kept for backward compat with any old references
export type AppStatus = "ON" | "OFF";

export interface ToggleState {
  app_status: AppStatus;
  off_vote_count: number;
  off_votes_required: number;
  remaining_off_votes: number;
  has_voted_off: boolean;
  turned_off?: boolean;
  message?: string;
}
