export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    service: "otimizia",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
