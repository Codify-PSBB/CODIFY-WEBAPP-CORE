import { useEffect, useState } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiRequest } from "@/lib/api"
import type { LeaderboardEntry } from "@/types/models"
import { Medal, RefreshCcw } from "lucide-react"

interface LeaderboardResponse {
  leaderboard?: LeaderboardEntry[]
}

function topBadge(rank: number) {
  if (rank === 1) {
    return {
      label: "Gold",
      className:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-400/22 dark:text-amber-100 dark:border-amber-300/60",
    }
  }

  if (rank === 2) {
    return {
      label: "Silver",
      className:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-white dark:border-white/20",
    }
  }

  if (rank === 3) {
    return {
      label: "Bronze",
      className:
        "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-400/22 dark:text-orange-100 dark:border-orange-300/60",
    }
  }

  return null
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

  useEffect(() => {
    void loadLeaderboard()
  }, [])

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-white/70 bg-white/85 shadow-soft dark:border-border dark:bg-background">
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Rankings
            </p>
            <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
              Leaderboard sorted by XP.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-muted-foreground">
              Top 3 students are highlighted with medal badges.
            </CardDescription>
          </div>
          <Button variant="outline" size="lg" onClick={() => void loadLeaderboard()} disabled={loading}>
            <RefreshCcw className="mr-2 size-4" />
            Refresh Leaderboard
          </Button>
        </CardHeader>
      </Card>

      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-border dark:bg-background">
        <CardHeader>
          <CardTitle className="text-2xl">Competition Leaderboard</CardTitle>
          <CardDescription>Columns: Rank | Student | XP</CardDescription>
        </CardHeader>
        <CardContent>
          {message ? <p className="mb-4 text-sm text-muted-foreground">{message}</p> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">XP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-muted-foreground" colSpan={3}>
                    No leaderboard data available yet.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => {
                  const medal = topBadge(entry.rank)
                  const topRank = entry.rank <= 3

                  return (
                    <TableRow
                      key={`${entry.rank}-${entry.name}`}
                      className={
                        index % 2 === 0
                          ? "bg-white/40 hover:bg-white/55 dark:bg-background dark:hover:bg-muted"
                          : "bg-slate-50/65 hover:bg-slate-100/80 dark:bg-background dark:hover:bg-muted"
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span
                            className={
                              topRank
                                ? "text-3xl font-black leading-none tracking-tight text-foreground"
                                : "text-base font-semibold text-muted-foreground"
                            }
                          >
                            {entry.rank}
                          </span>
                          {medal ? (
                            <Badge className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${medal.className}`}>
                              <Medal className="mr-1 size-3.5" />
                              {medal.label}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell className="text-right text-lg font-semibold tabular-nums">{entry.xp}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

