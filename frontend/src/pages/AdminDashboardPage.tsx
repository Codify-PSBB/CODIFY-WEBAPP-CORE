import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import type { AdminUser, AppStatus, PendingSubmission } from "../types/models";

interface PendingSubmissionsResponse {
  submissions?: PendingSubmission[];
}

interface ReviewResponse {
  submission?: {
    id: number;
    status: "approved" | "rejected";
  };
}

interface AdminUsersResponse {
  users?: AdminUser[];
}

interface ToggleResponse {
  app_status?: AppStatus;
}

export default function AdminDashboardPage() {
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [appStatus, setAppStatus] = useState<AppStatus | "UNKNOWN">("UNKNOWN");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPendingSubmissions() {
    const response = await apiRequest<PendingSubmissionsResponse>("/api/admin/submissions");
    setSubmissions(Array.isArray(response.data?.submissions) ? response.data.submissions : []);
  }

  async function loadUsers() {
    const response = await apiRequest<AdminUsersResponse>("/api/admin/users");
    setUsers(Array.isArray(response.data?.users) ? response.data.users : []);
  }

  async function loadAppStatus() {
    const response = await apiRequest<ToggleResponse>("/api/admin/toggle");
    const status = response.data?.app_status;
    if (status === "ON" || status === "OFF") {
      setAppStatus(status);
    } else {
      setAppStatus("UNKNOWN");
    }
  }

  async function refreshDashboard() {
    setLoading(true);
    setMessage("");

    try {
      await Promise.all([loadPendingSubmissions(), loadUsers(), loadAppStatus()]);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to load admin dashboard.";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshDashboard();
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
      await loadUsers();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to review submission.";
      setMessage(text);
    }
  }

  async function toggleCompetition(status: AppStatus) {
    setMessage("");

    try {
      const response = await apiRequest<ToggleResponse>("/api/admin/toggle", {
        method: "POST",
        body: {
          status
        }
      });

      setAppStatus(response.data?.app_status ?? status);
      setMessage(`Competition turned ${status}.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to toggle competition.";
      setMessage(text);
    }
  }

  return (
    <section>
      <h2>Admin Dashboard</h2>
      <button type="button" onClick={() => void refreshDashboard()} disabled={loading}>
        Refresh Dashboard
      </button>

      {message ? <p>{message}</p> : null}

      <h3>Competition Toggle</h3>
      <p>Current status: {appStatus}</p>
      <button type="button" onClick={() => void toggleCompetition("ON")}>Turn ON</button>
      <button type="button" onClick={() => void toggleCompetition("OFF")}>Turn OFF</button>

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

      <h3>User List</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>XP</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.email}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.xp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
