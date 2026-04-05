export type UserRole = "member" | "admin";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  sessionId?: string;
}

export interface Env {
  DB: D1Database;
  APP_STATE: KVNamespace;
  CLERK_SECRET_KEY: string;
}

export interface RequestContext {
  request: Request;
  env: Env;
  user?: AuthenticatedUser;
}

export type RouteHandler = (ctx: RequestContext) => Promise<Response>;
export type Middleware = (ctx: RequestContext) => Promise<RequestContext | Response>;
