import { useNavigate } from "react-router-dom"
import type { CompetitionProblem } from "@/types/models"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Zap, Timer, ChevronRight, Trophy } from "lucide-react"

interface Props {
  competitionId: number | null
  problems: CompetitionProblem[]
  startedAt: string | null
}

export default function CompetitionLobbyPage({ competitionId, problems }: Props) {
  const navigate = useNavigate()

  const totalXp = problems.reduce((sum, p) => sum + p.xp_reward, 0)

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center">
      {/* Pulsing live badge */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-green-600 dark:text-green-400">
          Competition Live
        </span>
      </div>

      {/* Title */}
      <div className="space-y-3 max-w-xl">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Ready to compete?
        </h1>
        <p className="text-lg text-muted-foreground">
          Your stopwatch starts the moment you enter. You'll submit all your answers at once when you're done.
        </p>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 shadow-sm">
          <ChevronRight className="size-4 text-primary" />
          <span className="font-semibold">{problems.length}</span>
          <span className="text-sm text-muted-foreground">problem{problems.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 shadow-sm">
          <Zap className="size-4 text-primary" />
          <span className="font-semibold">{totalXp}</span>
          <span className="text-sm text-muted-foreground">total XP available</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 shadow-sm">
          <Timer className="size-4 text-primary" />
          <span className="text-sm text-muted-foreground">Timer starts on entry</span>
        </div>
      </div>

      {/* Problem preview */}
      {problems.length > 0 && (
        <div className="w-full max-w-lg space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-3">Problems</p>
          {problems.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                <span className="font-medium">{p.title}</span>
              </div>
              <Badge variant="secondary" className="gap-1 text-xs">
                <Zap className="size-2.5" />
                {p.xp_reward} XP
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Rules */}
      <div className="max-w-md space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <Trophy className="size-4 shrink-0 mt-0.5 text-amber-500" />
          <span>Complete as many problems as you can before the admin ends the competition.</span>
        </div>
        <div className="flex items-start gap-2">
          <Timer className="size-4 shrink-0 mt-0.5 text-blue-500" />
          <span>Your elapsed time is recorded with your submission — faster times rank higher on tiebreaks.</span>
        </div>
      </div>

      {/* CTA */}
      <Button
        size="lg"
        className="gap-2 px-10 py-6 text-lg rounded-2xl shadow-lg"
        onClick={() => navigate("/competition/enter")}
        disabled={problems.length === 0 || competitionId === null}
      >
        Enter Competition
        <ChevronRight className="size-5" />
      </Button>
    </div>
  )
}
