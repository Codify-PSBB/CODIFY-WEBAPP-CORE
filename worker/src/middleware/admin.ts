import type { Middleware } from "../types";
import { ADMIN_EMAIL_LIST } from "../lib/schoolRules";

export const requireAdmin: Middleware = async (ctx) => {
  if (!ctx.user) {
    console.warn("SECURITY: Admin access attempt without authentication context");
    return Response.json(
      {
        status: "error",
        message: "Authentication context missing."
      },
      { status: 500 }
    );
  }

  // Double-check admin status even if role is set
  if (ctx.user.role !== "admin" || !ADMIN_EMAIL_LIST.includes(ctx.user.email.toLowerCase())) {
    console.warn(`SECURITY: Non-admin user attempted admin access: ${ctx.user.email}, role: ${ctx.user.role}`);
    return Response.json(
      {
        status: "error",
        message: "Admin access required."
      },
      { status: 403 }
    );
  }

  // Log successful admin access for audit
  console.log(`SECURITY: Admin access granted to: ${ctx.user.email}, userId: ${ctx.user.userId}`);
  
  return ctx;
};
