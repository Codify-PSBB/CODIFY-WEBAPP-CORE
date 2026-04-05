import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import type { PendingSubmission } from "../types/models";

interface PendingSubmissionsResponse {
  submissions?: PendingSubmission[];
}

interface ReviewResponse {
  submission?: {
    id: number;
    status: "approved" | "rejected";
  };
}

export default function AdminDashboardPage() {
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPendingSubmissions() {
    setLoading(true);
    setMessage("");

    try {
      const response = await apiRequest<PendingSubmissionsResponse>("/api/admin/submissions");
      setSubmissions(Array.isArray(response.data?.submissions) ? response.data.submissions : []);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to load pending submissions.";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPendingSubmissions();
  }, []);

  async function reviewSubmission(submissionId: number, action: "approve" | "reject") {
    setMessage("");

    try {
      await apiRequest<ReviewResponse>("/api/admin/review", {
        method: "POST",
        body: {
          submission_id: submissionId,
          action
        }
      });

      setSubmissions((previous) => previous.filter((submission) => submission.id !== submissionId));
      setMessage(`Submission #${submissionId} ${action}d.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to review submission.";
      setMessage(text);
    }
  }

  return (
    <section>
      <h2>Admin Dashboard</h2>
      <button type="button" onClick={() => void loadPendingSubmissions()} disabled={loading}>
        Refresh Pending Queue
      </button>

      {message ? <p>{message}</p> : null}

      <h3>Pending Submissions</h3>
      <ul>
        {submissions.map((submission) => (
          <li key={submission.id}>
            <div>
              <strong>#{submission.id}</strong> | {submission.user_name} | Problem {submission.problem_id} ({submission.problem_title})
            </div>
            <pre>{submission.code}</pre>
            <button type="button" onClick={() => void reviewSubmission(submission.id, "approve")}>
              Approve
            </button>
            <button type="button" onClick={() => void reviewSubmission(submission.id, "reject")}>
              Reject
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
