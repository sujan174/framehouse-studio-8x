import { db } from "@/server/db/client";
import { getPublicFrame } from "@/server/creative/publication";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ token: string; index: string }> };
export async function GET(_request: Request, context: Context) {
  const { token, index } = await context.params;
  const bytes = await getPublicFrame(db, token, Number(index));
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };
  if (!bytes) return new Response(null, { status: 404, headers });
  return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "image/jpeg", "Content-Length": String(bytes.length) } });
}
