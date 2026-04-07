export const ALLOWED_SCHOOL_EMAIL_DOMAIN = "@psbbschools.edu.in";

const ADMIN_EMAIL_LIST = [
  "s220162@psbbschools.edu.in",
  "s120029@psbbschools.edu.in",
  "s120007@psbbschools.edu.in",
  "s160153@psbbschools.edu.in"
];

const ADMIN_EMAIL_SET = new Set(ADMIN_EMAIL_LIST.map((email) => email.toLowerCase()));

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedSchoolEmail(email: string): boolean {
  return normalizeEmail(email).endsWith(ALLOWED_SCHOOL_EMAIL_DOMAIN);
}

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAIL_SET.has(normalizeEmail(email));
}
