import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/api"
import type { LeaderboardEntry } from "@/types/models"
import { RefreshCcw, Trophy, Zap } from "lucide-react"

interface LeaderboardResponse {
  leaderboard?: LeaderboardEntry[]
}

const PODIUM_STYLES = [
  // 1st — Gold
  {
    wrapper: "order-1 md:order-2",
    card: "bg-gradient-to-b from-amber-50 to-white border-2 border-amber-300/80 shadow-[0_8px_40px_-8px_rgba(251,191,36,0.45)] dark:from-amber-900/20 dark:to-card dark:border-amber-400/40 dark:shadow-[0_8px_40px_-8px_rgba(251,191,36,0.2)]",
    number: "text-amber-500 dark:text-amber-400",
    emoji: "🥇",
    height: "pb-8",
    xpClass: "bg-amber-400/80 dark:bg-amber-400/60",
  },
  // 2nd — Silver
  {
    wrapper: "order-2 md:order-1",
    card: "bg-gradient-to-b from-slate-50 to-white border-2 border-slate-300/80 shadow-[0_8px_30px_-8px_rgba(148,163,184,0.4)] dark:from-slate-700/20 dark:to-card dark:border-slate-500/40",
    number: "text-slate-500 dark:text-slate-300",
    emoji: "🥈",
    height: "pb-4",
    xpClass: "bg-slate-400/70 dark:bg-slate-400/50",
  },
  // 3rd — Bronze
  {
    wrapper: "order-3",
    card: "bg-gradient-to-b from-orange-50 to-white border-2 border-orange-300/80 shadow-[0_8px_30px_-8px_rgba(251,146,60,0.35)] dark:from-orange-900/20 dark:to-card dark:border-orange-500/40",
    number: "text-orange-500 dark:text-orange-400",
    emoji: "🥉",
    height: "pb-2",
    xpClass: "bg-orange-400/70 dark:bg-orange-400/50",
  },
]

function PodiumCard({ entry, styleIdx, maxXp }: { entry: LeaderboardEntry; styleIdx: number; maxXp: number }) {
  const s = PODIUM_STYLES[styleIdx]
  const barWidth = maxXp > 0 ? Math.round((entry.xp / maxXp) * 100) : 0

  return (
    <div className={`flex flex-col items-center ${s.wrapper}`}>
      <div className={`w-full rounded-2xl p-5 text-center transition-all duration-300 hover:scale-[1.02] ${s.card} ${s.height}`}>
        <div className="text-4xl mb-2">{s.emoji}</div>
        <div className={`text-5xl font-black tracking-tight ${s.number}`}>#{entry.rank}</div>
        <div className="mt-3 font-semibold text-foreground text-base leading-snug">{entry.name}</div>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">{entry.student_id}</div>
        <div className="mt-4 flex items-center justify-center gap-1.5">
          <Zap className="size-3.5 text-primary" />
          <span className="text-xl font-black tabular-nums text-foreground">{entry.xp}</span>
          <span className="text-xs text-muted-foreground">XP</span>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${s.xpClass}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function loadLeaderboard() {
    setLoading(true)
    setMessage("")
    try {
      const response = await apiRequest<LeaderboardResponse>("/api/leaderboard")
      setEntries(Array.isArray(response.data?.leaderboard) ? response.data.leaderboard : [])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load leaderboard.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadLeaderboard() }, [])

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)
  const maxXp = entries[0]?.xp ?? 1

  // Podium order: 2nd | 1st | 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean)
  const podiumStyleMap: Record<number, number> = { 0: 1, 1: 0, 2: 2 }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Live Rankings</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-3">
            <Trophy className="size-8 text-amber-500" />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground">Rankings update automatically after admin approvals.</p>
        </div>
        <Button variant="outline" size="lg" onClick={() => void loadLeaderboard()} disabled={loading} className="shrink-0">
          <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {message && <p className="text-sm text-destructive">{message}</p>}

      {/* Podium — only render if we have at least 1 entry */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
          {podiumOrder.map((entry, i) => (
            <PodiumCard
              key={entry.rank}
              entry={entry}
              styleIdx={podiumStyleMap[i] ?? i}
              maxXp={maxXp}
            />
          ))}
        </div>
      )}

      {/* Rest of the list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {entries.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No competition data yet — be the first to submit!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Header row */}
            <div className="grid grid-cols-[56px_1fr_auto] gap-4 px-5 py-3 text-xs uppercase tracking-[0.18em] text-muted-foreground bg-muted/40">
              <span>Rank</span>
              <span>Student</span>
              <span>XP</span>
            </div>
            {/* All entries */}
            {entries.map((entry) => {
              const isTop = entry.rank <= 3
              const barWidth = maxXp > 0 ? Math.round((entry.xp / maxXp) * 100) : 0
              const rankColor =
                entry.rank === 1 ? "text-amber-500 dark:text-amber-400" :
                entry.rank === 2 ? "text-slate-400 dark:text-slate-300" :
                entry.rank === 3 ? "text-orange-500 dark:text-orange-400" :
                "text-muted-foreground"

              return (
                <div
                  key={`${entry.rank}-${entry.name}`}
                  className={`grid grid-cols-[56px_1fr_auto] gap-4 items-center px-5 py-4 transition-colors duration-150 hover:bg-muted/50 ${isTop ? "bg-muted/20" : ""}`}
                >
                  {/* Rank */}
                  <span className={`text-lg font-black tabular-nums ${rankColor}`}>
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                  </span>

                  {/* Name + ID + XP bar */}
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">{entry.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{entry.student_id}</div>
                    <div className="mt-1.5 h-1 w-full max-w-[200px] rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60 transition-all duration-700"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* XP */}
                  <div className="flex items-center gap-1 tabular-nums">
                    <Zap className="size-3.5 text-primary shrink-0" />
                    <span className="text-base font-bold text-foreground">{entry.xp}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {entries.length} participant{entries.length !== 1 ? "s" : ""} · sorted by XP
        </p>
      )}
    </div>
  )
}
