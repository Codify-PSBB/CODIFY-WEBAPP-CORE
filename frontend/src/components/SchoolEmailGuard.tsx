import { useClerk, useUser } from "@clerk/clerk-react"
import { PropsWithChildren, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ALLOWED_SCHOOL_EMAIL_DOMAIN, isAllowedSchoolEmail, normalizeEmail } from "../lib/schoolRules"

export default function SchoolEmailGuard({ children }: PropsWithChildren) {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const signOutTriggered = useRef(false)
  const [invalidEmail, setInvalidEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !user) {
      return
    }

    const primaryEmail = user.primaryEmailAddress?.emailAddress
    const email = primaryEmail ? normalizeEmail(primaryEmail) : ""

    if (email && isAllowedSchoolEmail(email)) {
      setInvalidEmail(null)
      return
    }

    setInvalidEmail(email || "unknown")

    if (signOutTriggered.current) {
      return
    }

    signOutTriggered.current = true
    void signOut()
  }, [isLoaded, signOut, user])

  if (invalidEmail) {
    return (
      <Card className="mx-auto mt-12 max-w-2xl rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-700 dark:bg-[#1e2937]">
        <CardContent className="space-y-4 p-8 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
            Access Restricted
          </p>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">School email required</h2>
            <p className="text-base text-muted-foreground">
              This app only allows {ALLOWED_SCHOOL_EMAIL_DOMAIN} accounts. The current session for {invalidEmail} is being signed out.
            </p>
          </div>
          <Button variant="outline" disabled>
            Signing out...
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
