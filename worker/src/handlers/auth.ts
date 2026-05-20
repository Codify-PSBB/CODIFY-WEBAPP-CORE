import { createDbClient } from "../lib/db";
import { hashPassword } from "../lib/hash";
import { signJwt } from "../lib/jwt";
import type { RequestContext } from "../types";
import { normalizeEmail } from "../lib/schoolRules";

function jsonResponse(data: any, status = 200) {
  return Response.json(data, { status });
}

function jsonError(message: string, status = 400) {
  return Response.json({ status: "error", message }, { status });
}

export async function handleRegister(ctx: RequestContext) {
  try {
    const body = (await ctx.request.json()) as any;
    const { eduId, password, name, grade } = body;

    if (!eduId || !password || !name || !grade) {
      return jsonError("Missing required fields (eduId, password, name, grade).");
    }

    const numericGrade = parseInt(grade, 10);
    if (numericGrade !== 9 && numericGrade !== 10) {
      return jsonError("Grade must be 9 or 10.");
    }

    const username = eduId.toUpperCase().trim();
    if (!username.match(/^S\d{5,}$/) && !username.match(/^[a-zA-Z0-9]+$/)) {
      return jsonError("Invalid EDU ID format.");
    }

    const email = normalizeEmail(`${username}@psbbschools.edu.in`);
    const client = createDbClient(ctx.env.DB);
    
    const existing = await client.first("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) {
      return jsonError("A user with this EDU ID is already registered.");
    }

    const hashedPassword = await hashPassword(password);
    
    // Insert new member
    await client.run(
      "INSERT INTO users (name, email, role, xp, password_hash, grade) VALUES (?, ?, ?, 0, ?, ?)",
      [name.trim(), email, "member", hashedPassword, numericGrade]
    );

    const created = await client.first<{ id: number }>("SELECT id FROM users WHERE email = ?", [email]);
    if (!created) {
      throw new Error("Failed to read created user.");
    }

    const payload = {
      sub: created.id.toString(),
      email: email,
      role: "member"
    };

    if (!ctx.env.JWT_SECRET) {
      return jsonError("JWT configuration is missing on server", 500);
    }
    
    const token = await signJwt(payload, ctx.env.JWT_SECRET);
    
    return jsonResponse({
      status: "success",
      token,
      user: { id: created.id.toString(), email, role: "member", name: name.trim() }
    });
  } catch (e: any) {
    return jsonError(e.message || "Registration failed", 500);
  }
}

export async function handleLogin(ctx: RequestContext) {
  try {
    const body = (await ctx.request.json()) as any;
    const { eduId, password } = body;

    if (!eduId || !password) {
      return jsonError("Missing required fields (eduId, password).");
    }

    const username = eduId.toUpperCase().trim();
    const email = normalizeEmail(`${username}@psbbschools.edu.in`);
    const client = createDbClient(ctx.env.DB);

    const userRow = await client.first<{ id: number, role: string, name: string, password_hash: string }>(
      "SELECT id, role, name, password_hash FROM users WHERE email = ?",
      [email]
    );

    if (!userRow || !userRow.password_hash) {
      return jsonError("Invalid EDU ID or password.", 401);
    }

    const hashedPassword = await hashPassword(password);
    if (hashedPassword !== userRow.password_hash) {
      return jsonError("Invalid EDU ID or password.", 401);
    }

    const payload = {
      sub: userRow.id.toString(),
      email: email,
      role: userRow.role
    };

    if (!ctx.env.JWT_SECRET) {
      return jsonError("JWT configuration is missing on server", 500);
    }
    
    const token = await signJwt(payload, ctx.env.JWT_SECRET);
    
    return jsonResponse({
      status: "success",
      token,
      user: { id: userRow.id.toString(), email, role: userRow.role, name: userRow.name }
    });
  } catch (e: any) {
    return jsonError(e.message || "Login failed", 500);
  }
}
