export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req) {
  const url = new URL(req.url);
  const target = new URL("/api/odoo/callback", url.origin);
  // Preserve OAuth query parameters like code/state.
  target.search = url.search;

  return Response.redirect(target.toString(), 302);
}
