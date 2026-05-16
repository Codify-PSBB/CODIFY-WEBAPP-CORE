import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/api"
import type { LeaderboardEntry } from "@/types/models"
import { RefreshCcw, Trophy, Zap } from "lucide-react"

interface LeaderboardResponse {
  leaderboard?: LeaderboardEntry[]
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

  const maxXp = entries[0]?.xp ?? 1

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between px-2">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80 font-bold">Arena Rankings</p>
          <h1 className="text-4xl font-bold tracking-tighter flex items-center gap-3">
            <Trophy className="size-9 text-primary" strokeWidth={2.5} />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground/80 max-w-md">
            The pulse of the competition. Scores update in real-time as solutions are reviewed.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="lg" 
          onClick={() => void loadLeaderboard()} 
          disabled={loading} 
          className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm hover:bg-muted/50"
        >
          <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Refreshing…" : "Sync Scores"}
        </Button>
      </div>

      {message && <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm">{message}</div>}

      {/* Main List */}
      <div className="rounded-[32px] border border-border/40 bg-card/30 backdrop-blur-md shadow-2xl shadow-black/20 overflow-hidden">
        {entries.length === 0 ? (
          <div className="py-24 text-center">
            <div className="inline-flex size-16 items-center justify-center rounded-full bg-muted/20 mb-4">
              <RefreshCcw className="size-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">No results found yet. Start solving!</p>
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {/* Header row */}
            <div className="grid grid-cols-[80px_1fr_auto] gap-4 px-8 py-5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 font-black bg-muted/5">
              <span>Position</span>
              <span>Participant</span>
              <span className="text-right">Progress</span>
            </div>
            
            {/* All entries */}
            {entries.map((entry) => {
              const isTop = entry.rank <= 3
              const barWidth = maxXp > 0 ? Math.round((entry.xp / maxXp) * 100) : 0
              
              const rankStyles = 
                entry.rank === 1 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                entry.rank === 2 ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                entry.rank === 3 ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                "bg-muted/10 text-muted-foreground border-transparent"

              return (
                <div
                  key={`${entry.rank}-${entry.name}`}
                  className={`grid grid-cols-[80px_1fr_auto] gap-4 items-center px-8 py-6 transition-all duration-300 hover:bg-primary/[0.03] group ${isTop ? "bg-primary/[0.01]" : ""}`}
                >
                  {/* Rank */}
                  <div className="flex justify-start">
                    <span className={`inline-flex size-10 items-center justify-center rounded-xl border text-lg font-black tabular-nums transition-transform group-hover:scale-110 ${rankStyles}`}>
                      {entry.rank}
                    </span>
                  </div>

                  {/* Name + ID + XP bar */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg tracking-tight text-foreground truncate">{entry.name}</span>
                      {entry.rank === 1 && <span className="text-xs">🏆</span>}
                    </div>
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-mono mb-3">{entry.student_id}</div>
                    <div className="h-1.5 w-full max-w-[280px] rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isTop ? "bg-primary shadow-[0_0_12px_rgba(79,142,247,0.4)]" : "bg-muted-foreground/40"}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* XP */}
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5">
                      <Zap className={`size-4 ${isTop ? "text-primary" : "text-muted-foreground/40"}`} fill={isTop ? "currentColor" : "none"} />
                      <span className={`text-2xl font-black tabular-nums tracking-tighter ${isTop ? "text-foreground" : "text-muted-foreground/80"}`}>
                        {entry.xp}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold">Points Earned</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="h-px w-12 bg-border/40" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/40 font-black">
            End of rankings
          </p>
        </div>
      )}
    </div>
  )
}
