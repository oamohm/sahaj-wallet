// Vercel serverless entry point. This wraps the SAME Fastify app used for
// local dev / Docker (apps/api/src/server.ts) — no route logic is
// duplicated here. Requires the compiled output (dist/server.js), which
// Vercel produces itself by running this package's normal "build" script
// (tsc) before bundling functions, exactly like local/Docker builds do.
//
// A Fastify instance still has a real underlying Node http.Server; we
// reuse Fastify's own request-handling by emitting the incoming request
// onto that server, so all existing routing/plugins/middleware work
// unchanged. The instance is memoized across invocations so a warm
// serverless container reuses the same app, DB pool, and Redis connection.
let appPromise;

async function getApp() {
  if (!appPromise) {
    appPromise = import("../dist/server.js").then(async ({ buildServer }) => {
      const app = await buildServer();
      await app.ready();
      return app;
    });
  }
  return appPromise;
}

export default async function handler(req, res) {
  const app = await getApp();
  app.server.emit("request", req, res);
}
