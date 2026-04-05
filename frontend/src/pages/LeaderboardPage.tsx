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
import { Medal, RefreshCcw, Trophy } from "lucide-react"

interface LeaderboardResponse {
  leaderboard?: LeaderboardEntry[]
}

function rankBadge(rank: number) {
  if (rank === 1) {
    return "default"
  }

  if (rank <= 3) {
    return "secondary"
  }

  return "outline"
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
      <Card className="rounded-[28px] border-white/70 bg-white/85 shadow-soft backdrop-blur-sm">
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Rankings
            </p>
            <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
              Leaderboard sorted by XP.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-muted-foreground">
              Track the strongest performers across the current competition.
            </CardDescription>
          </div>
          <Button variant="outline" size="lg" onClick={() => void loadLeaderboard()} disabled={loading}>
            <RefreshCcw className="mr-2 size-4" />
            Refresh Leaderboard
          </Button>
        </CardHeader>
      </Card>

      {entries.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {entries.slice(0, 3).map((entry) => (
            <Card key={`spotlight-${entry.rank}-${entry.name}`} className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
              <CardContent className="space-y-3 p-6">
                <Badge variant={rankBadge(entry.rank)} className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
                  Top {entry.rank}
                </Badge>
                <div>
                  <p className="text-xl font-semibold tracking-tight">{entry.name}</p>
                  <p className="text-sm text-muted-foreground">Competition ranking spotlight</p>
                </div>
                <div className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground">
                  <Trophy className="size-5 text-primary" />
                  {entry.xp}
                  <span className="text-base text-muted-foreground">XP</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
        <CardHeader>
          <CardTitle className="text-2xl">Full Leaderboard</CardTitle>
          <CardDescription>Leaderboard table uses the shadcn table component and stays readable on smaller screens.</CardDescription>
        </CardHeader>
        <CardContent>
          {message ? <p className="mb-4 text-sm text-muted-foreground">{message}</p> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Name</TableHead>
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
                entries.map((entry) => (
                  <TableRow key={`${entry.rank}-${entry.name}`}>
                    <TableCell>
                      <Badge variant={rankBadge(entry.rank)} className="rounded-full px-3 py-1">
                        <Medal className="mr-1 size-3.5" />
                        #{entry.rank}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell className="text-right text-lg font-semibold">{entry.xp}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
