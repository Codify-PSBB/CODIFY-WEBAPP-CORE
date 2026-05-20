import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiRequest } from "@/lib/api"
import type { LeaderboardEntry } from "@/types/models"
import { RefreshCcw, Trophy, Zap } from "lucide-react"

interface LeaderboardResponse {
  leaderboard?: LeaderboardEntry[]
  grade9?: LeaderboardEntry[]
  grade10?: LeaderboardEntry[]
}

const PODIUM_STYLES = [
  // 1st — Gold
  {
    wrapper: "order-1 md:order-2",
    card: "bg-gradient-to-b from-amber-50 to-white border-2 border-amber-300/80 shadow-[0_8px_40px_-8px_rgba(251,191,36,0.45)] dark:from-amber-900/20 dark:to-card dark:border-amber-400/40 dark:shadow-[0_8px_40px_-8px_rgba(251,191,36,0.2)]",
    number: "text-amber-500 dark:text-amber-400",
    emoji: "??",
    height: "pb-8",
    xpClass: "bg-amber-400/80 dark:bg-amber-400/60",
  },
  // 2nd — Silver
  {
    wrapper: "order-2 md:order-1",
    card: "bg-gradient-to-b from-slate-50 to-white border-2 border-slate-300/80 shadow-[0_8px_30px_-8px_rgba(148,163,184,0.4)] dark:from-slate-700/20 dark:to-card dark:border-slate-500/40",
    number: "text-slate-500 dark:text-slate-300",
    emoji: "??",
    height: "pb-4",
    xpClass: "bg-slate-400/70 dark:bg-slate-400/50",
  },
  // 3rd — Bronze
  {
    wrapper: "order-3",
    card: "bg-gradient-to-b from-orange-50 to-white border-2 border-orange-300/80 shadow-[0_8px_30px_-8px_rgba(251,146,60,0.35)] dark:from-orange-900/20 dark:to-card dark:border-orange-500/40",
    number: "text-orange-500 dark:text-orange-400",
    emoji: "??",
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

function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/50">
          <Trophy className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="mt-4 text-xl font-semibold">No participants yet</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-[250px]">
          The leaderboard is waiting for its first contender.
        </p>
      </div>
    )
  }

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  // Reorder Top 3 for visual hierarchy: [2nd, 1st, 3rd]
  const orderedTop3 = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3

  // For computing the relative progress bar width based on max XP
  const maxXp = Math.max(...entries.map((e) => e.xp), 1)

  return (
    <div className="space-y-12">
      {top3.length > 0 && (
        <div className="relative pt-6">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent blur-3xl rounded-full opacity-50" />
          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3 md:items-end">
            {orderedTop3.map((entry) => {
              const originalIndex = top3.findIndex((e) => e.student_id === entry.student_id)
              return <PodiumCard key={entry.student_id} entry={entry} styleIdx={originalIndex} maxXp={maxXp} />
            })}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="rounded-xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden shadow-sm">
          <div className="divide-y divide-border/50">
            {rest.map((entry) => {
              const barWidth = Math.round((entry.xp / maxXp) * 100)

              return (
                <div
                  key={entry.student_id}
                  className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-base font-bold text-secondary-foreground shadow-sm">
                      {entry.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground truncate">{entry.name}</div>
                      <div className="text-sm font-mono text-muted-foreground truncate">{entry.student_id}</div>
                    </div>
                  </div>

                  <div className="flex items-center sm:justify-end gap-4 w-full sm:w-1/3 shrink-0">
                    <div className="h-2 flex-1 sm:w-24 sm:flex-none rounded-full bg-secondary/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/40 transition-all duration-700"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 w-[70px] justify-end">
                      <span className="font-bold tabular-nums">{entry.xp}</span>
                      <span className="text-xs font-medium text-muted-foreground">XP</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function loadLeaderboard() {
    setLoading(true)
    setMessage("")
    try {
      const response = await apiRequest<LeaderboardResponse>("/api/leaderboard")
      setData(response.data || {})
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load leaderboard.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLeaderboard()
    const interval = setInterval(() => void loadLeaderboard(), 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Leaderboard</h1>
          <p className="mt-2 text-muted-foreground">Rankings are based on XP earned from approved submissions.</p>
        </div>
        <Button onClick={loadLeaderboard} disabled={loading} variant="outline" size="sm" className="gap-2">
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {message && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm font-medium text-destructive">
          {message}
        </div>
      )}

      {!message && (
        <Tabs defaultValue="overall" className="mt-8">
          <div className="flex justify-center sm:justify-start">
            <TabsList className="grid w-full sm:w-[400px] grid-cols-3 h-11 p-1">
              <TabsTrigger value="overall" className="text-sm font-medium rounded-md">Overall</TabsTrigger>
              <TabsTrigger value="grade9" className="text-sm font-medium rounded-md">Grade 9</TabsTrigger>
              <TabsTrigger value="grade10" className="text-sm font-medium rounded-md">Grade 10</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overall" className="pt-6">
            <LeaderboardList entries={data?.leaderboard || []} />
          </TabsContent>
          <TabsContent value="grade9" className="pt-6">
            <LeaderboardList entries={data?.grade9 || []} />
          </TabsContent>
          <TabsContent value="grade10" className="pt-6">
            <LeaderboardList entries={data?.grade10 || []} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
