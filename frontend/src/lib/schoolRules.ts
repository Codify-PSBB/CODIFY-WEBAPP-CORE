export const ALLOWED_SCHOOL_EMAIL_DOMAIN = "@psbbschools.edu.in";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedSchoolEmail(email: string): boolean {
  return normalizeEmail(email).endsWith(ALLOWED_SCHOOL_EMAIL_DOMAIN);
}
