import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiRequest } from "@/lib/api"
import type { Problem, CompetitionEntry } from "@/types/models"
import { Clock, Play, AlertCircle, Trophy, Timer } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ProblemsResponse {
  problems?: Problem[]
}

interface CompetitionEntryResponse {
  entry?: CompetitionEntry
  problem?: Problem
  message?: string
}

interface CompetitionStatusResponse {
  has_active_entry?: boolean
  entry?: CompetitionEntry
  problem?: Problem
}

function formatTimeRemaining(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

export default function CompetitionEntryPage() {
  const navigate = useNavigate()
  const [problems, setProblems] = useState<Problem[]>([])
  const [activeProblem, setActiveProblem] = useState<Problem | null>(null)
  const [existingEntry, setExistingEntry] = useState<CompetitionEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [timeRemaining, setTimeRemaining] = useState(0)

  async function loadActiveProblem() {
    try {
      const response = await apiRequest<ProblemsResponse>("/api/problems")
      const list = Array.isArray(response.data?.problems) ? response.data.problems : []
      setProblems(list)
      
      const active = list.find((p) => p.active === 1)
      setActiveProblem(active || null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load problems."
      setMessage(errorMessage)
    }
  }

  async function checkExistingEntry() {
    try {
      const response = await apiRequest<CompetitionStatusResponse>("/api/competition/status")
      
      if (response.data?.has_active_entry && response.data.entry) {
        setExistingEntry(response.data.entry)
        setTimeRemaining(response.data.entry.remaining_seconds)
        if (response.data.problem) {
          setActiveProblem(response.data.problem)
        }
      }
    } catch {
      // No existing entry, that's fine
    }
  }

  useEffect(() => {
    void loadActiveProblem()
    void checkExistingEntry()
  }, [])

  useEffect(() => {
    if (timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  async function enterCompetition(problemId: number, timeLimitMinutes: number = 10) {
    setLoading(true)
    setMessage("")

    try {
      const response = await apiRequest<CompetitionEntryResponse>("/api/competition/enter", {
        method: "POST",
        body: {
          problem_id: problemId,
          time_limit_minutes: timeLimitMinutes,
        },
      })

      if (response.data?.entry) {
        setExistingEntry(response.data.entry)
        setTimeRemaining(response.data.entry.remaining_seconds)
        navigate("/competition/arena")
      } else {
        setMessage(response.data?.message || "Failed to enter competition.")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to enter competition."
      setMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  function resumeCompetition() {
    navigate("/competition/arena")
  }

  return (
    <div className="space-y-6">
      <Card className="card-modern">
        <CardHeader className="gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
                Competition Arena
              </p>
            </div>
            <CardTitle className="heading-1">
              Ready to Compete?
            </CardTitle>
            <CardDescription className="body-large max-w-2xl text-muted-foreground">
              Enter the competition to start your timer. Solve the problem before time runs out!
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {message ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {existingEntry && existingEntry.status === "active" && timeRemaining > 0 ? (
        <Card className="card-modern border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Timer className="h-6 w-6 text-primary animate-pulse" />
                <div>
                  <CardTitle className="heading-3">Active Competition</CardTitle>
                  <CardDescription>You have an ongoing competition session</CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold tabular-nums text-primary">
                  {formatTimeRemaining(timeRemaining)}
                </div>
                <p className="text-sm text-muted-foreground">remaining</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="font-medium">Problem: {activeProblem?.title || "Loading..."}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Time Limit: {existingEntry.time_limit_minutes} minutes
              </p>
            </div>
            <Button 
              size="lg" 
              className="btn-primary w-full"
              onClick={resumeCompetition}
            >
              <Play className="mr-2 h-5 w-5" />
              Resume Competition
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {activeProblem ? (
          <Card className="card-modern hover-lift">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default" className="badge-primary">Active</Badge>
                <Badge variant="secondary">{activeProblem.xp_reward} XP</Badge>
              </div>
              <CardTitle className="heading-3">{activeProblem.title}</CardTitle>
              <CardDescription className="body-normal line-clamp-3">
                {activeProblem.description.substring(0, 200)}...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Default time: 10 minutes</span>
              </div>
              <Button 
                size="lg" 
                className="btn-primary w-full"
                onClick={() => enterCompetition(activeProblem.id, activeProblem.time_limit_minutes || 10)}
                disabled={loading || (existingEntry?.status === "active" && timeRemaining > 0)}
              >
                <Play className="mr-2 h-5 w-5" />
                {loading ? "Entering..." : "Enter Competition"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="heading-3">No Active Competition</CardTitle>
              <CardDescription>
                There are no active competitions at the moment. Check back later!
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card className="card-modern">
          <CardHeader>
            <CardTitle className="heading-3">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm">1</div>
                <div>
                  <p className="font-medium">Enter Competition</p>
                  <p className="text-sm text-muted-foreground">Click enter to start your timer</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm">2</div>
                <div>
                  <p className="font-medium">Solve the Problem</p>
                  <p className="text-sm text-muted-foreground">Write and test your code</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm">3</div>
                <div>
                  <p className="font-medium">Submit Before Time Runs Out</p>
                  <p className="text-sm text-muted-foreground">Late submissions are not accepted</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
