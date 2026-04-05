import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiRequest } from "@/lib/api"
import type { PendingSubmission } from "@/types/models"
import { ClipboardCheck, Eye, RefreshCcw, Search, SendHorizonal, ShieldCheck, XCircle } from "lucide-react"

interface PendingSubmissionsResponse {
  submissions?: PendingSubmission[]
}

interface ReviewResponse {
  action?: "approve" | "reject"
}

function formatTimestamp(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export default function SubmissionQueuePage() {
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<PendingSubmission | null>(null)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null)
  const [message, setMessage] = useState("")

  async function loadQueue() {
    setLoading(true)
    setMessage("")

    try {
      const response = await apiRequest<PendingSubmissionsResponse>("/api/admin/submissions")
      setSubmissions(Array.isArray(response.data?.submissions) ? response.data.submissions : [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load submission queue.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadQueue()
  }, [])

  const filteredSubmissions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return submissions
    }

    return submissions.filter((submission) => {
      return [
        submission.user_name,
        submission.user_email,
        submission.problem_title,
        String(submission.id),
        String(submission.problem_id),
      ].some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [query, submissions])

  async function reviewSubmission(action: "approve" | "reject") {
    if (!selectedSubmission) {
      return
    }

    setActionLoading(action)
    setMessage("")

    try {
      const response = await apiRequest<ReviewResponse>("/api/admin/review", {
        method: "POST",
        body: {
          submission_id: selectedSubmission.id,
          action,
        },
      })

      setSubmissions((current) => current.filter((submission) => submission.id !== selectedSubmission.id))
      setMessage(
        `Submission #${selectedSubmission.id} ${response.data?.action === "reject" ? "rejected" : "approved"} successfully.`
      )
      setSelectedSubmission(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to review submission.")
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-white/70 bg-white/85 shadow-soft backdrop-blur-sm">
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Submission Queue
            </p>
            <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
              Review pending solutions from one focused queue.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-muted-foreground">
              Open a submission, inspect the code in a dialog, and approve or reject it without leaving the page.
            </CardDescription>
          </div>
          <Button variant="outline" size="lg" onClick={() => void loadQueue()} disabled={loading}>
            <RefreshCcw className="mr-2 size-4" />
            Refresh Queue
          </Button>
        </CardHeader>
      </Card>

      {message ? (
        <Card className="rounded-[24px] border-white/70 bg-white/90 shadow-soft">
          <CardContent className="p-4 text-sm text-muted-foreground">{message}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
          <CardContent className="space-y-3 p-6">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Pending Items
            </Badge>
            <div className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <ClipboardCheck className="size-5 text-primary" />
              {submissions.length}
            </div>
            <p className="text-sm text-muted-foreground">All submissions waiting for manual review.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
          <CardContent className="space-y-3 p-6">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Filtered View
            </Badge>
            <div className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <Search className="size-5 text-primary" />
              {filteredSubmissions.length}
            </div>
            <p className="text-sm text-muted-foreground">Results matching the current search query.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
          <CardContent className="space-y-3 p-6">
            <Badge variant="default" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Review Mode
            </Badge>
            <div className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <ShieldCheck className="size-5 text-primary-foreground" />
              Manual
            </div>
            <p className="text-sm text-muted-foreground">Admins stay in control of every approval decision.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle className="text-2xl">Pending Submission Table</CardTitle>
            <CardDescription>Use search to narrow the queue by student, email, problem, or submission ID.</CardDescription>
          </div>
          <div className="w-full max-w-sm">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by student, problem, or ID"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-muted-foreground" colSpan={5}>
                    No pending submissions match the current queue filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">#{submission.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{submission.user_name}</p>
                        <p className="text-sm text-muted-foreground">{submission.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{submission.problem_title}</p>
                        <p className="text-sm text-muted-foreground">Problem #{submission.problem_id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimestamp(submission.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" onClick={() => setSelectedSubmission(submission)}>
                        <Eye className="mr-2 size-4" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedSubmission)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSubmission(null)
          }
        }}
      >
        <DialogContent className="max-w-4xl rounded-[28px] border-white/70 bg-white/95 p-0 shadow-soft sm:max-w-4xl">
          {selectedSubmission ? (
            <>
              <DialogHeader className="space-y-3 px-6 pt-6">
                <DialogTitle className="text-2xl font-semibold tracking-tight">
                  Review submission #{selectedSubmission.id}
                </DialogTitle>
                <DialogDescription className="text-sm leading-6">
                  Inspect the student code and choose whether this pending solution should be approved or rejected.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 px-6 pb-2">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="rounded-2xl border-white/70 bg-muted/30 shadow-none">
                    <CardContent className="space-y-2 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Student</p>
                      <p className="font-semibold text-foreground">{selectedSubmission.user_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedSubmission.user_email}</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-white/70 bg-muted/30 shadow-none">
                    <CardContent className="space-y-2 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Problem</p>
                      <p className="font-semibold text-foreground">{selectedSubmission.problem_title}</p>
                      <p className="text-sm text-muted-foreground">Problem #{selectedSubmission.problem_id}</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-white/70 bg-muted/30 shadow-none">
                    <CardContent className="space-y-2 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Submitted</p>
                      <p className="font-semibold text-foreground">{formatTimestamp(selectedSubmission.created_at)}</p>
                      <Badge variant="secondary" className="w-fit rounded-full">Pending review</Badge>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">Submitted Python Code</h3>
                      <p className="text-sm text-muted-foreground">This stays read-only during manual review.</p>
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Manual review only</Badge>
                  </div>
                  <div className="min-h-[320px] rounded-[24px] border border-slate-800 bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-100 shadow-inner">
                    <pre className="whitespace-pre-wrap break-words">{selectedSubmission.code}</pre>
                  </div>
                </div>
              </div>

              <DialogFooter className="rounded-b-[28px]" showCloseButton>
                <Button
                  variant="destructive"
                  onClick={() => void reviewSubmission("reject")}
                  disabled={actionLoading !== null}
                >
                  <XCircle className="mr-2 size-4" />
                  {actionLoading === "reject" ? "Rejecting..." : "Reject Submission"}
                </Button>
                <Button onClick={() => void reviewSubmission("approve")} disabled={actionLoading !== null}>
                  <SendHorizonal className="mr-2 size-4" />
                  {actionLoading === "approve" ? "Approving..." : "Approve Submission"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
