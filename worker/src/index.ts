export interface Env {
  DB: D1Database;
  APP_STATE: KVNamespace;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        {
          status: "error",
          message: "Scaffold only. API endpoints are not implemented yet."
        },
        { status: 501 }
      );
    }

    return new Response("Coding Club Worker scaffold is ready.", { status: 200 });
  }
};
