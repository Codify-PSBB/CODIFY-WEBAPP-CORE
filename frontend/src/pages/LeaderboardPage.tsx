import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiRequest } from "@/lib/api"
import { useCompetitionContext } from "@/lib/competitionContext"
import type { LeaderboardEntry } from "@/types/models"
import { Crown, Flame, Medal, RefreshCcw, Search, Sparkles, Trophy, Users, Zap } from "lucide-react"

interface LeaderboardResponse {
  leaderboard?: LeaderboardEntry[]
  grade9?: LeaderboardEntry[]
  grade10?: LeaderboardEntry[]
}

function getAvatarGradient(name: string): string {
  const gradients = [
    "from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-300/40 dark:border-blue-700/40",
    "from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400 border-purple-300/40 dark:border-purple-700/40",
    "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-300/40 dark:border-emerald-700/40",
    "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-300/40 dark:border-amber-700/40",
    "from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-300/40 dark:border-cyan-700/40",
    "from-rose-500/20 to-red-500/20 text-rose-600 dark:text-rose-400 border-rose-300/40 dark:border-rose-700/40",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const index = Math.abs(hash) % gradients.length
  return gradients[index]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "S"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const PODIUM_STYLES = [
  // 1st — Gold
  {
    wrapper: "order-1 md:order-2 md:-translate-y-4 md:scale-105 z-10",
    card: "bg-gradient-to-b from-amber-500/10 via-card to-card border-2 border-amber-400/80 shadow-[0_16px_45px_-12px_rgba(251,191,36,0.35)] dark:from-amber-950/40 dark:via-card dark:to-card dark:border-amber-400/60 dark:shadow-[0_16px_50px_-15px_rgba(251,191,36,0.3)] backdrop-blur-md",
    badgeBg: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-sm",
    badgeLabel: "1ST PLACE",
    numberColor: "text-amber-500 dark:text-amber-400",
    icon: <Crown className="size-4 text-amber-500 fill-amber-500" />,
    avatarRing: "ring-4 ring-amber-400/40 bg-gradient-to-tr from-amber-400/30 to-yellow-300/30 text-amber-700 dark:text-amber-300 border-2 border-amber-400",
    xpBar: "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]",
    crownEmoji: "👑",
  },
  // 2nd — Silver
  {
    wrapper: "order-2 md:order-1 z-0",
    card: "bg-gradient-to-b from-slate-400/10 via-card to-card border-2 border-slate-300/80 shadow-[0_12px_35px_-10px_rgba(148,163,184,0.3)] dark:from-slate-800/40 dark:via-card dark:to-card dark:border-slate-500/50 dark:shadow-[0_12px_40px_-12px_rgba(148,163,184,0.2)] backdrop-blur-md",
    badgeBg: "bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-sm",
    badgeLabel: "2ND PLACE",
    numberColor: "text-slate-600 dark:text-slate-300",
    icon: <Medal className="size-4 text-slate-400 fill-slate-400" />,
    avatarRing: "ring-4 ring-slate-300/40 bg-gradient-to-tr from-slate-200/40 to-slate-300/40 text-slate-700 dark:text-slate-300 border-2 border-slate-300 dark:border-slate-400",
    xpBar: "bg-gradient-to-r from-slate-400 to-slate-300 dark:from-slate-400 dark:to-slate-200",
    crownEmoji: "🥈",
  },
  // 3rd — Bronze
  {
    wrapper: "order-3 md:order-3 z-0",
    card: "bg-gradient-to-b from-orange-500/10 via-card to-card border-2 border-orange-300/80 shadow-[0_12px_35px_-10px_rgba(249,115,22,0.25)] dark:from-orange-950/40 dark:via-card dark:to-card dark:border-orange-500/50 dark:shadow-[0_12px_40px_-12px_rgba(249,115,22,0.2)] backdrop-blur-md",
    badgeBg: "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm",
    badgeLabel: "3RD PLACE",
    numberColor: "text-orange-600 dark:text-orange-400",
    icon: <Medal className="size-4 text-orange-500 fill-orange-500" />,
    avatarRing: "ring-4 ring-orange-400/40 bg-gradient-to-tr from-orange-300/30 to-amber-400/30 text-orange-700 dark:text-orange-300 border-2 border-orange-400",
    xpBar: "bg-gradient-to-r from-orange-500 to-amber-500",
    crownEmoji: "🥉",
  },
]

function PodiumCard({ entry, styleIdx, maxXp }: { entry: LeaderboardEntry; styleIdx: number; maxXp: number }) {
  const s = PODIUM_STYLES[styleIdx]
  const barWidth = maxXp > 0 ? Math.round((entry.xp / maxXp) * 100) : 0
  const initials = getInitials(entry.name)

  return (
    <div className={`flex flex-col items-center ${s.wrapper} transition-all duration-300`}>
      <div className={`w-full rounded-[24px] p-6 text-center transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${s.card}`}>
        {/* Crown & Placement Tag */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="text-xl">{s.crownEmoji}</span>
          <span className={`inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${s.badgeBg}`}>
            {s.icon}
            {s.badgeLabel}
          </span>
          <span className={`text-2xl font-black ${s.numberColor}`}>#{entry.rank}</span>
        </div>

        {/* Avatar Initials Circle */}
        <div className="my-3 flex justify-center">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center font-black text-xl shadow-md ${s.avatarRing}`}>
            {initials}
          </div>
        </div>

        {/* Student Name & Details */}
        <div className="space-y-1 mt-2">
          <h4 className="font-bold text-foreground text-lg leading-tight truncate px-1" title={entry.name}>
            {entry.name}
          </h4>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/40">
              {entry.student_id}
            </span>
            {entry.grade !== null && (
              <Badge variant="outline" className="text-[10px] font-semibold tracking-wide border-primary/30 text-primary">
                Grade {entry.grade}
              </Badge>
            )}
          </div>
        </div>

        {/* XP Score Container */}
        <div className="mt-5 p-3 rounded-2xl bg-secondary/40 border border-border/50 flex items-center justify-center gap-2">
          <Zap className="size-4 text-amber-500 fill-amber-500 animate-pulse" />
          <span className="text-2xl font-black tabular-nums text-foreground tracking-tight">{entry.xp}</span>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">XP</span>
        </div>

        {/* Progress relative bar */}
        <div className="mt-4 h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${s.xpBar}`}
            style={{ width: `${Math.max(barWidth, 8)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries
    const q = searchQuery.toLowerCase().trim()
    return entries.filter(
      (e) => e.name.toLowerCase().includes(q) || e.student_id.toLowerCase().includes(q)
    )
  }, [entries, searchQuery])

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-border/80 bg-card/40 p-16 text-center shadow-soft">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary/80 border border-border shadow-inner">
          <Trophy className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h3 className="mt-6 text-2xl font-bold">No contenders yet</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-[320px]">
          Approved submissions will automatically rank students here in real-time.
        </p>
      </div>
    )
  }

  const top3 = entries.slice(0, 3)
  const rest = filteredEntries.filter((e) => e.rank > 3 || searchQuery.trim().length > 0)
  const orderedTop3 = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3
  const maxXp = Math.max(...entries.map((e) => e.xp), 1)

  return (
    <div className="space-y-10">
      {/* ── TOP 3 PODIUM ────────────────────────────────────────────────────── */}
      {top3.length > 0 && !searchQuery.trim() && (
        <div className="relative pt-4">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-amber-500/5 to-transparent blur-3xl rounded-full opacity-60 pointer-events-none" />
          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3 md:items-end">
            {orderedTop3.map((entry) => {
              const originalIndex = top3.findIndex((e) => e.student_id === entry.student_id)
              return <PodiumCard key={entry.student_id} entry={entry} styleIdx={originalIndex} maxXp={maxXp} />
            })}
          </div>
        </div>
      )}

      {/* ── SEARCH & FILTER CONTROLS ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Users className="size-4 text-primary" />
          <span>
            {filteredEntries.length} {filteredEntries.length === 1 ? "Contender" : "Contenders"}
          </span>
          {searchQuery && (
            <span className="text-xs text-muted-foreground font-normal">(filtered from {entries.length})</span>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student or USN…"
            className="pl-9 h-10 rounded-2xl bg-card border-border/80 shadow-sm focus-visible:ring-primary/30"
          />
        </div>
      </div>

      {/* ── RANKS LIST (Rank 4+) ────────────────────────────────────────────── */}
      {rest.length > 0 ? (
        <div className="rounded-[24px] border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden shadow-soft">
          <div className="hidden sm:grid grid-cols-[80px_1fr_120px_140px_110px] items-center px-6 py-3.5 bg-secondary/50 border-b border-border/60 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Rank</span>
            <span>Contender</span>
            <span className="text-center">Grade</span>
            <span>Progress</span>
            <span className="text-right">Score</span>
          </div>

          <div className="divide-y divide-border/50">
            {rest.map((entry) => {
              const barWidth = Math.round((entry.xp / maxXp) * 100)
              const initials = getInitials(entry.name)
              const avatarGrad = getAvatarGradient(entry.name)
              const isTop10 = entry.rank <= 10

              return (
                <div
                  key={entry.student_id}
                  className="group flex flex-col sm:grid sm:grid-cols-[80px_1fr_120px_140px_110px] sm:items-center gap-4 px-6 py-4.5 transition-all duration-200 hover:bg-accent/40"
                >
                  {/* Rank */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black transition-all ${
                        isTop10
                          ? "bg-primary/10 text-primary border border-primary/25 shadow-sm"
                          : "bg-muted/70 text-muted-foreground border border-border/40 font-bold"
                      }`}
                    >
                      #{entry.rank}
                    </div>
                  </div>

                  {/* Contender details */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-black text-sm border shadow-sm ${avatarGrad}`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-foreground text-base truncate group-hover:text-primary transition-colors">
                        {entry.name}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground truncate">{entry.student_id}</div>
                    </div>
                  </div>

                  {/* Grade */}
                  <div className="sm:flex sm:justify-center">
                    {entry.grade !== null ? (
                      <Badge variant="outline" className="text-xs font-medium rounded-full border-border/80 bg-background/50">
                        Grade {entry.grade}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </div>

                  {/* Visual XP Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-full rounded-full bg-secondary/60 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60 group-hover:bg-primary transition-all duration-500"
                        style={{ width: `${Math.max(barWidth, 6)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground tabular-nums w-8 text-right">
                      {barWidth}%
                    </span>
                  </div>

                  {/* Score */}
                  <div className="flex items-center sm:justify-end gap-1.5 font-black tabular-nums text-foreground text-base">
                    <Zap className="size-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <span>{entry.xp}</span>
                    <span className="text-xs font-semibold text-muted-foreground">XP</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : searchQuery ? (
        <div className="rounded-[24px] border border-border bg-card/40 p-12 text-center">
          <p className="text-muted-foreground">No students matched &ldquo;{searchQuery}&rdquo;.</p>
        </div>
      ) : null}
    </div>
  )
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const { phase, eligible, targetGrade, gradeMissing } = useCompetitionContext()

  const notEligibleNotice =
    gradeMissing
      ? "Your account does not have a grade assigned. Please contact an admin to set your grade (Grade 9 or 10) to participate in competitions."
      : phase === "live" && !eligible
      ? targetGrade === 9 || targetGrade === 10
        ? `The current competition is for Grade ${targetGrade} students only.`
        : "The current competition is not open to your grade."
      : null

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

  // Quick stats derived from data
  const totalContenders = data.leaderboard?.length ?? 0
  const topXp = data.leaderboard?.[0]?.xp ?? 0
  const grade9Count = data.grade9?.length ?? 0
  const grade10Count = data.grade10?.length ?? 0

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ── HERO HEADER ──────────────────────────────────────────────────────── */}
      <div className="rounded-[28px] border border-border/80 bg-gradient-to-br from-card via-card to-secondary/30 p-6 sm:p-8 shadow-soft backdrop-blur-md relative overflow-hidden">
        {/* Ambient background glow accents */}
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 size-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              <span>Official Rankings & Hall of Fame</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
              Leaderboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Real-time rankings based on total XP awarded from verified competition submissions. Climb the ranks to reach the top tier.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Live Updates</span>
            </div>

            <Button
              onClick={loadLeaderboard}
              disabled={loading}
              variant="outline"
              size="default"
              className="gap-2 rounded-2xl h-10 px-4 hover:bg-secondary font-medium shadow-sm w-full sm:w-auto"
            >
              <RefreshCcw className={`size-4 ${loading ? "animate-spin text-primary" : ""}`} />
              <span>Refresh Standings</span>
            </Button>
          </div>
        </div>

        {/* Highlight Stats Row */}
        <div className="mt-8 pt-6 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Contenders</p>
            <p className="text-2xl font-black tabular-nums text-foreground">{totalContenders}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Top Score</p>
            <div className="flex items-center gap-1.5 text-2xl font-black tabular-nums text-foreground">
              <Zap className="size-4 text-amber-500 fill-amber-500" />
              <span>{topXp}</span>
              <span className="text-xs font-bold text-muted-foreground">XP</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Grade 9 Active</p>
            <p className="text-2xl font-black tabular-nums text-foreground">{grade9Count}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Grade 10 Active</p>
            <p className="text-2xl font-black tabular-nums text-foreground">{grade10Count}</p>
          </div>
        </div>
      </div>

      {notEligibleNotice && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-center text-sm font-medium text-amber-800 dark:text-amber-300 shadow-sm">
          {notEligibleNotice}
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-center text-sm font-medium text-destructive shadow-sm">
          {message}
        </div>
      )}

      {/* ── TABS (Overall / Grade 9 / Grade 10) ──────────────────────────────── */}
      {!message && (
        <Tabs defaultValue="overall" className="mt-8 space-y-6">
          <div className="flex justify-center sm:justify-start">
            <TabsList className="grid w-full sm:w-[460px] grid-cols-3 h-12 p-1.5 rounded-2xl bg-secondary/80 border border-border shadow-inner">
              <TabsTrigger
                value="overall"
                className="text-xs sm:text-sm font-bold rounded-xl data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Overall ({totalContenders})
              </TabsTrigger>
              <TabsTrigger
                value="grade9"
                className="text-xs sm:text-sm font-bold rounded-xl data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Grade 9 ({grade9Count})
              </TabsTrigger>
              <TabsTrigger
                value="grade10"
                className="text-xs sm:text-sm font-bold rounded-xl data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Grade 10 ({grade10Count})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overall" className="mt-0 focus-visible:outline-none">
            <LeaderboardList entries={data?.leaderboard || []} />
          </TabsContent>
          <TabsContent value="grade9" className="mt-0 focus-visible:outline-none">
            <LeaderboardList entries={data?.grade9 || []} />
          </TabsContent>
          <TabsContent value="grade10" className="mt-0 focus-visible:outline-none">
            <LeaderboardList entries={data?.grade10 || []} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
