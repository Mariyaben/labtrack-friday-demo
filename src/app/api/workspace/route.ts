import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calendarDate } from "@/lib/domain";
import { ensureWorkspace, readWorkspace, changeDueDate, markReady, capturePending, ConflictError, caseExists } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookieName = "labtrack_workspace";
async function workspace(create = false) {
  const jar = await cookies();
  const value = jar.get(cookieName)?.value;
  if (value && z.uuid().safeParse(value).success) return value;
  if (!create) return null;
  const id = crypto.randomUUID();
  jar.set(cookieName, id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 60 * 60 * 24 * 7, path: "/" });
  return id;
}
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}
function failure(error: unknown) {
  if (error instanceof z.ZodError) return json({ error: "Check the date and try again. Use a real date between 2000 and 2100." }, 400);
  if (error instanceof ConflictError) return json({ error: error.message }, 409);
  console.error("Workspace request failed", error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, "[redacted]") : "Unknown error");
  return json({ error: "We couldn’t save that change. Your case is safe. Refresh or try again." }, 503);
}
export async function GET() {
  try {
    const id = (await workspace(true))!;
    await ensureWorkspace(id);
    return json(await readWorkspace(id));
  } catch (error) { return failure(error); }
}
const mutation = z.discriminatedUnion("action", [
  z.object({ action: z.literal("due-date"), caseId: z.string().regex(/^LT-\d{4}$/), dueDate: calendarDate, version: z.number().int().positive() }),
  z.object({ action: z.literal("ready"), caseId: z.string().regex(/^LT-\d{4}$/), simulateFailure: z.boolean().optional() }),
  z.object({ action: z.literal("retry"), caseId: z.string().regex(/^LT-\d{4}$/) })
]);
export async function POST(request: NextRequest) {
  // Cookies isolate fictional demo workspaces; this is not production authorization.
  const origin = request.headers.get("origin");
  let sameOrigin = false;
  try {
    // Next's internal URL may normalize loopback hosts; compare with the actual Host.
    const source = new URL(origin || "");
    sameOrigin = source.host === request.headers.get("host") && source.protocol === request.nextUrl.protocol;
  } catch { /* Missing or malformed Origin is rejected. */ }
  if (!sameOrigin || request.headers.get("x-labtrack-request") !== "1") return json({ error: "Request origin is not allowed." }, 403);
  if (Number(request.headers.get("content-length") || "0") > 4096) return json({ error: "Request is too large." }, 413);
  try {
    const id = await workspace();
    if (!id) return json({ error: "Open the dashboard first to start your demo." }, 401);
    let raw: unknown;
    try { raw = await request.json(); } catch { return json({ error: "Invalid JSON request." }, 400); }
    const body = mutation.parse(raw);
    if (!(await caseExists(id, body.caseId))) return json({ error: "Case not found." }, 404);
    if (body.action === "due-date") await changeDueDate(id, body.caseId, body.dueDate, body.version);
    if (body.action === "ready") await markReady(id, body.caseId, body.simulateFailure);
    if (body.action === "retry") await capturePending(id, body.caseId);
    return json(await readWorkspace(id));
  } catch (error) { return failure(error); }
}
