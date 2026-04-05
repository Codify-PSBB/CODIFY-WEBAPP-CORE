import { handleApiRequest } from "./router";

export interface Env {
  DB: D1Database;
  APP_STATE: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api")) {
      return handleApiRequest(request, env);
    }

    return Response.json({
      status: "success",
      data: {
        service: "coding-club-worker",
        message: "Worker is running."
      }
    });
  }
};
