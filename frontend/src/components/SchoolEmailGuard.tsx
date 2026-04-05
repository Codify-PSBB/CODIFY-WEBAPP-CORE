import { useClerk, useUser } from "@clerk/clerk-react";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { ALLOWED_SCHOOL_EMAIL_DOMAIN, isAllowedSchoolEmail, normalizeEmail } from "../lib/schoolRules";

export default function SchoolEmailGuard({ children }: PropsWithChildren) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const signOutTriggered = useRef(false);
  const [invalidEmail, setInvalidEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }

    const primaryEmail = user.primaryEmailAddress?.emailAddress;
    const email = primaryEmail ? normalizeEmail(primaryEmail) : "";

    if (email && isAllowedSchoolEmail(email)) {
      setInvalidEmail(null);
      return;
    }

    setInvalidEmail(email || "unknown");

    if (signOutTriggered.current) {
      return;
    }

    signOutTriggered.current = true;
    void signOut();
  }, [isLoaded, signOut, user]);

  if (invalidEmail) {
    return (
      <section>
        <h2>Access Restricted</h2>
        <p>
          This app only allows {ALLOWED_SCHOOL_EMAIL_DOMAIN} accounts. You are being signed out.
        </p>
      </section>
    );
  }

  return <>{children}</>;
}
