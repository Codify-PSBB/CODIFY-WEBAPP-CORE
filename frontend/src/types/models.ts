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
  testcases: string | null; // Hidden testcases notes for reviewers
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
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
}

export interface AdminUser {
  name: string;
  email: string;
  role: "member" | "admin";
  xp: number;
}

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
