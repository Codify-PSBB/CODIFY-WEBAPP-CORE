import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { apiRequest } from "@/lib/api"
import type { Problem } from "@/types/models"
import { Play, AlertCircle, Trophy, Code2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ProblemsResponse {
  problems?: Problem[]
}

export default function CompetitionEntryPage() {
  const navigate = useNavigate()
  const [problems, setProblems] = useState<Problem[]>([])
  const [activeProblem, setActiveProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

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

  useEffect(() => {
    void loadActiveProblem()
  }, [])

  function startCompetition(problemId: number) {
    setLoading(true)
    navigate(`/competition/arena?problem_id=${problemId}`)
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
              Solve coding problems and earn XP. Click start to begin solving!
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
                <Code2 className="h-4 w-4" />
                <span className="text-sm">Multiple test cases available</span>
              </div>
              <Button 
                size="lg" 
                className="btn-primary w-full"
                onClick={() => startCompetition(activeProblem.id)}
                disabled={loading}
              >
                <Play className="mr-2 h-5 w-5" />
                {loading ? "Loading..." : "Start Solving"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="heading-3">No Active Problem</CardTitle>
              <CardDescription>
                There are no active problems at the moment. Check back later!
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
                  <p className="font-medium">Start Solving</p>
                  <p className="text-sm text-muted-foreground">Click start to open the problem</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm">2</div>
                <div>
                  <p className="font-medium">Write Your Code</p>
                  <p className="text-sm text-muted-foreground">Use the code editor to solve</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold text-sm">3</div>
                <div>
                  <p className="font-medium">Run & Submit</p>
                  <p className="text-sm text-muted-foreground">Test against cases and submit</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
