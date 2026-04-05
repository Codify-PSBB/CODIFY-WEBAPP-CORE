import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import type { Problem, Submission } from "../types/models";

interface ProblemsResponse {
  problems?: Problem[];
}

interface SubmissionResponse {
  submission?: Submission;
}

export default function CompetitionPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemId, setProblemId] = useState("");
  const [code, setCode] = useState("print('Hello from coding club')");
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProblems() {
    setLoading(true);
    setMessage("");

    try {
      const response = await apiRequest<ProblemsResponse>("/api/problems");
      const list = Array.isArray(response.data?.problems) ? response.data.problems : [];
      setProblems(list);
      if (list.length > 0 && !problemId) {
        setProblemId(String(list[0].id));
      }

      if (list.length === 0) {
        setMessage("No problems returned yet. You can still submit by typing a problem ID.");
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to load problems.";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProblems();
  }, []);

  const selectedProblemTitle = useMemo(() => {
    if (!problemId) {
      return "";
    }

    const found = problems.find((item) => item.id === Number(problemId));
    return found?.title ?? "";
  }, [problems, problemId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const numericProblemId = Number(problemId);
    if (!Number.isInteger(numericProblemId) || numericProblemId <= 0) {
      setMessage("Enter a valid positive problem ID.");
      return;
    }

    if (!code.trim()) {
      setMessage("Code is required.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest<SubmissionResponse>("/api/submissions", {
        method: "POST",
        body: {
          problem_id: numericProblemId,
          code
        }
      });

      const submission = response.data?.submission;
      if (submission) {
        setRecentSubmissions((previous) => [submission, ...previous]);
      }

      setMessage("Submission sent successfully with pending status.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to submit code.";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Competition</h2>
      <p>Read a problem, write Python code, and submit for admin review.</p>

      <button type="button" onClick={() => void loadProblems()} disabled={loading}>
        Refresh Problems
      </button>

      <ul>
        {problems.map((problem) => (
          <li key={problem.id}>
            <strong>{problem.title}</strong> (ID: {problem.id}, XP: {problem.xp_reward})
            <div>{problem.description}</div>
          </li>
        ))}
      </ul>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <label htmlFor="problem-id">Problem ID</label>
        <input
          id="problem-id"
          value={problemId}
          onChange={(event) => setProblemId(event.target.value)}
          placeholder="e.g. 1"
        />

        {selectedProblemTitle ? <p>Selected: {selectedProblemTitle}</p> : null}

        <label htmlFor="python-code">Python Code</label>
        <textarea
          id="python-code"
          rows={12}
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />

        <button type="submit" disabled={loading}>
          Submit
        </button>
      </form>

      {message ? <p>{message}</p> : null}

      <h3>Recent submissions (this session)</h3>
      <ul>
        {recentSubmissions.map((submission) => (
          <li key={submission.id}>
            #{submission.id} | problem {submission.problem_id} | {submission.status}
          </li>
        ))}
      </ul>
    </section>
  );
}
