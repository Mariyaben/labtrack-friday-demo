import { neon } from "@neondatabase/serverless";
import { dateInZone, type LabCase, type Mail } from "./domain";
import { seedCases } from "./seed";

function db() {
  if (!process.env.DATABASE_URL)
    throw new Error(
      "DATABASE_URL is not configured. Follow the setup steps in README.md.",
    );
  return neon(process.env.DATABASE_URL);
}
let schema: Promise<unknown> | undefined;
export function initialize() {
  if (!schema) {
    const sql = db();
    schema = sql
      .transaction([
        sql`CREATE TABLE IF NOT EXISTS demo_workspaces (id UUID PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
        sql`CREATE TABLE IF NOT EXISTS cases (
        workspace_id UUID NOT NULL REFERENCES demo_workspaces(id) ON DELETE CASCADE,
        id TEXT NOT NULL, code TEXT NOT NULL, reference TEXT NOT NULL,
        clinic TEXT NOT NULL, clinic_email TEXT NOT NULL, clinic_timezone TEXT NOT NULL,
        country TEXT NOT NULL, treatment TEXT NOT NULL, teeth TEXT NOT NULL,
        due_date DATE NOT NULL CHECK (due_date BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'),
        status TEXT NOT NULL CHECK (status IN ('received','in_progress','quality_check','ready')),
        priority TEXT NOT NULL CHECK (priority IN ('standard','rush')),
        ready_at TIMESTAMPTZ, version INT NOT NULL DEFAULT 1,
        PRIMARY KEY(workspace_id,id))`,
        sql`CREATE TABLE IF NOT EXISTS notification_outbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id UUID NOT NULL,
        case_id TEXT NOT NULL, case_code TEXT NOT NULL, recipient TEXT NOT NULL,
        subject TEXT NOT NULL, body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','captured','failed')),
        attempts INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        captured_at TIMESTAMPTZ, last_error TEXT,
        FOREIGN KEY(workspace_id,case_id) REFERENCES cases(workspace_id,id) ON DELETE CASCADE,
        UNIQUE(workspace_id,case_id))`,
      ])
      .catch((error) => {
        schema = undefined;
        throw error;
      });
  }
  return schema;
}
export async function ensureWorkspace(id: string) {
  await initialize();
  const sql = db();
  const seed = seedCases(dateInZone(new Date()));
  await sql.transaction([
    sql`INSERT INTO demo_workspaces(id) VALUES (${id}) ON CONFLICT DO NOTHING`,
    ...seed.map(
      (c) =>
        sql`INSERT INTO cases (workspace_id,id,code,reference,clinic,clinic_email,clinic_timezone,country,treatment,teeth,due_date,status,priority) VALUES (${id},${c.id},${c.code},${c.reference},${c.clinic},${c.clinic_email},${c.clinic_timezone},${c.country},${c.treatment},${c.teeth},${c.due_date}::date,${c.status},${c.priority}) ON CONFLICT DO NOTHING`,
    ),
  ]);
}
export async function readWorkspace(id: string) {
  const sql = db();
  const [cases, messages] = await sql.transaction([
    sql`SELECT id, code, reference, clinic, clinic_email, clinic_timezone, country, treatment, teeth, to_char(due_date,'YYYY-MM-DD') AS due_date, status, priority, ready_at, version FROM cases WHERE workspace_id=${id} ORDER BY due_date,code`,
    sql`SELECT id, case_id, case_code, recipient, subject, body, status, attempts, created_at, captured_at, last_error FROM notification_outbox WHERE workspace_id=${id} ORDER BY created_at DESC`,
  ]);
  return {
    cases: cases as LabCase[],
    messages: messages as Mail[],
    today: dateInZone(new Date()),
    emailMode: "capture" as const,
  };
}
export async function changeDueDate(
  workspace: string,
  caseId: string,
  dueDate: string,
  version: number,
) {
  const sql = db();
  const result =
    await sql`UPDATE cases SET due_date=${dueDate}::date, version=version+1 WHERE workspace_id=${workspace} AND id=${caseId} AND version=${version} RETURNING id`;
  if (!result.length)
    throw new ConflictError(
      "This case changed in another tab. Refresh and try again.",
    );
}
export class ConflictError extends Error {}
export async function markReady(
  workspace: string,
  caseId: string,
  simulateFailure = false,
) {
  const sql = db();
  // Lock the case while composing the snapshot; status + one outbox event commit together.
  // The body is composed in SQL from the same row, avoiding an email with stale dates.
  await sql.transaction([
    sql`UPDATE cases SET status='ready',ready_at=COALESCE(ready_at,now()),version=CASE WHEN status='ready' THEN version ELSE version+1 END WHERE workspace_id=${workspace} AND id=${caseId}`,
    sql`INSERT INTO notification_outbox(workspace_id,case_id,case_code,recipient,subject,body)
      SELECT workspace_id,id,code,clinic_email,'Your case ' || code || ' is ready | LabTrack',
      'Hello ' || clinic || E',\n\nYour ' || lower(treatment) || ' case ' || code || E' is ready for collection.\n\nCase reference: ' || code || E'\nAgreed due date: ' || to_char(due_date,'FMDD FMMonth YYYY') || E'\n\nPlease contact the lab to arrange collection.\n\nThank you,\nThe LabTrack team'
      FROM cases WHERE workspace_id=${workspace} AND id=${caseId} AND status='ready' ON CONFLICT(workspace_id,case_id) DO NOTHING`,
  ]);
  await capturePending(workspace, caseId, simulateFailure);
}
export async function capturePending(
  workspace: string,
  caseId: string,
  simulateFailure = false,
) {
  const sql = db();
  // Atomic conditional update: concurrent retries cannot re-deliver a captured message.
  if (simulateFailure) {
    await sql`UPDATE notification_outbox SET status='failed',attempts=attempts+1,last_error='Simulated email service outage. Retry is safe.' WHERE workspace_id=${workspace} AND case_id=${caseId} AND status IN ('pending','failed')`;
  } else {
    await sql`UPDATE notification_outbox SET status='captured',attempts=attempts+1,captured_at=now(),last_error=NULL WHERE workspace_id=${workspace} AND case_id=${caseId} AND status IN ('pending','failed')`;
  }
}
export async function caseExists(workspace: string, caseId: string) {
  const sql = db();
  const rows =
    await sql`SELECT id FROM cases WHERE workspace_id=${workspace} AND id=${caseId}`;
  return rows.length > 0;
}
