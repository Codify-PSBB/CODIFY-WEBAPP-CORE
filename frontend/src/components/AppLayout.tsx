import { SignOutButton, UserButton, useUser } from "@clerk/clerk-react"
import { BarChart3, ClipboardList, Code2, LayoutDashboard, Moon, Shield, Sun, Trophy, Home, Compass, TrendingUp, Bookmark, Users, HelpCircle, Settings, Search, MessageSquare, Bell, Plus, Image, Video, BarChart3 as PollIcon } from "lucide-react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isAdminEmail, normalizeEmail } from "@/lib/schoolRules"
import { useTheme } from "@/components/ThemeProvider"
import { cn } from "@/lib/utils"

const navigationItems = [
  { to: "/competition", label: "Competition", icon: Code2, adminOnly: false },
  { to: "/interpreter", label: "Interpreter", icon: ClipboardList, adminOnly: false },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, adminOnly: false },
  { to: "/admin", label: "Admin Dashboard", icon: LayoutDashboard, adminOnly: true },
  { to: "/admin/queue", label: "Submission Queue", icon: BarChart3, adminOnly: true },
]

const sidebarNavigationItems = [
  { to: "/competition", label: "Home", icon: Home },
  { to: "/communities", label: "Communities", icon: Users },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/trending", label: "Trending", icon: TrendingUp },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/my-community", label: "Your Community", icon: Users },
  { to: "/help", label: "Help Center", icon: HelpCircle },
  { to: "/settings", label: "Settings", icon: Settings },
]

const communities = [
  { name: "Machine Learning", members: "12.5k", icon: "🤖", color: "bg-blue-500" },
  { name: "Programming", members: "8.2k", icon: "💻", color: "bg-green-500" },
  { name: "Web Development", members: "6.8k", icon: "🌐", color: "bg-purple-500" },
]

const trendingTopics = [
  { topic: "AI & Machine Learning", percentage: "32%", posts: "1,234" },
  { topic: "Web Development", percentage: "28%", posts: "1,089" },
  { topic: "Python Programming", percentage: "18%", posts: "698" },
  { topic: "Cloud Computing", percentage: "12%", posts: "465" },
  { topic: "DevOps", percentage: "10%", posts: "387" },
]

const suggestedCommunities = [
  { name: "Data Science", description: "Explore data analysis and visualization", members: "5.2k", icon: "📊" },
  { name: "Mobile Development", description: "iOS and Android development discussions", members: "3.8k", icon: "📱" },
  { name: "Cybersecurity", description: "Security best practices and news", members: "2.1k", icon: "🔒" },
]

interface AppLayoutProps {
  memberLeaderboardOnly?: boolean
}

export default function AppLayout({ memberLeaderboardOnly = false }: AppLayoutProps) {
  const { user } = useUser()
  const location = useLocation()
  const currentEmail = normalizeEmail(user?.primaryEmailAddress?.emailAddress ?? "")
  const isAdmin = currentEmail.length > 0 && isAdminEmail(currentEmail)
  const isAdminPage = isAdmin && location.pathname.startsWith("/admin")
  const { theme, toggleTheme } = useTheme()
  const visibleNavigationItems = navigationItems.filter((item) => {
    if (isAdmin) {
      return true
    }

    if (memberLeaderboardOnly) {
      return item.to === "/leaderboard"
    }

    return !item.adminOnly
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <img
              src="/codify-logo.png"
              alt="Codify logo"
              className="h-8 w-8 rounded-lg border border-border object-cover"
              loading="eager"
            />
            <h1 className="text-xl font-bold text-foreground">Codify</h1>
          </div>
          
          <div className="flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search Codify..." 
                className="pl-10 bg-muted border-border"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Convo AI
            </Button>
            <Button variant="ghost" size="icon">
              <MessageSquare className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <UserButton appearance={{ elements: { userButtonAvatarBox: "ring-2 ring-primary" } }} />
            <SignOutButton>
              <Button variant="ghost" size="icon">
                <SignOutButton>Sign Out</SignOutButton>
              </Button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 min-h-screen border-r border-border bg-card">
          <nav className="p-4 space-y-6">
            {/* Main Navigation */}
            <div className="space-y-1">
              {sidebarNavigationItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.to
                
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>

            {/* Communities Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Communities</h3>
              <div className="space-y-2">
                {communities.map((community) => (
                  <div key={community.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm", community.color)}>
                      {community.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{community.name}</p>
                      <p className="text-xs text-muted-foreground">{community.members} members</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 max-w-2xl mx-auto border-x border-border">
          <div className="p-4">
            {/* Create Post Section */}
            <div className="bg-card rounded-lg p-4 mb-6 border border-border">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <UserButton />
                </div>
                <div className="flex-1">
                  <Input 
                    placeholder="Share Something Today..." 
                    className="bg-muted border-border mb-3"
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Image className="h-4 w-4 mr-2" />
                      Image
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Video className="h-4 w-4 mr-2" />
                      Video
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <PollIcon className="h-4 w-4 mr-2" />
                      Poll
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Page Content */}
            <section className="bg-card rounded-lg border border-border">
              <Outlet />
            </section>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 min-h-screen bg-card border-l border-border">
          <div className="p-4 space-y-6">
            {/* Trending Topics */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Trending Topics</h3>
              <div className="space-y-3">
                {trendingTopics.map((topic, index) => (
                  <div key={topic.topic} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{topic.topic}</p>
                        <p className="text-xs text-muted-foreground">{topic.posts} posts</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-primary">{topic.percentage}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Communities */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Suggested Community</h3>
              <div className="space-y-3">
                {suggestedCommunities.map((community) => (
                  <div key={community.name} className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                        {community.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-foreground">{community.name}</h4>
                        <p className="text-xs text-muted-foreground mb-1">{community.description}</p>
                        <p className="text-xs text-muted-foreground">{community.members} members</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full border-border">
                      Join
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

