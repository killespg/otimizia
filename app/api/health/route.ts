export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      service: "otimizia",
      status: "ok",
      environment:
        process.env.VERCEL_ENV ??
        process.env.SUPABASE_ENVIRONMENT ??
        "local",
      commit:
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.APP_COMMIT_SHA ??
        null,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
