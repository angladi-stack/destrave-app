export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      try {
        await env.DB.prepare("SELECT 1").first();

        return Response.json({
          ok: true,
          app: "destrave-app",
          database: "connected"
        });
      } catch (error) {
        return Response.json(
          {
            ok: false,
            database: "error",
            message: error.message
          },
          { status: 500 }
        );
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        {
          ok: false,
          error: "Rota não encontrada"
        },
        { status: 404 }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
