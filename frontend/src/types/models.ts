export interface Problem {
  id: number;
  title: string;
  description: string;
  xp_reward: number;
  active: number;
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
