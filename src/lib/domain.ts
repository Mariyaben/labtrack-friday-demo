import { z } from "zod";

export const LAB_TIMEZONE = "Asia/Kolkata";
export const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const [year, month, day] = value.split("-").map(Number);
  if (year < 2000 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "Choose a real calendar date between 2000 and 2100.");

// A due date is a calendar value, never an instant in a viewer's time zone.
export function formatDate(value: string, style: "short" | "long" = "short") {
  const valid = calendarDate.parse(value);
  const [year, month, day] = valid.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: style === "long" ? "long" : "short", ...(style === "long" ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}
export function dateInZone(instant: Date, zone = LAB_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function addDays(value: string, amount: number) {
  const [y, m, d] = calendarDate.parse(value).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + amount)).toISOString().slice(0, 10);
}
export type CaseStatus = "received" | "in_progress" | "quality_check" | "ready";
export type LabCase = {
  id: string; code: string; reference: string; clinic: string; clinic_email: string;
  clinic_timezone: string; country: string; treatment: string; teeth: string;
  due_date: string; status: CaseStatus; priority: "standard" | "rush";
  ready_at: string | null; version: number;
};
export type Mail = {
  id: string; case_id: string; case_code: string; recipient: string;
  subject: string; body: string; status: "pending" | "captured" | "failed";
  attempts: number; created_at: string; captured_at: string | null; last_error: string | null;
};
export function eml(mail: Mail) {
  // Fields originate in our fixed seed/template; no arbitrary user header input.
  return `From: LabTrack Demo <demo@labtrack.example>\r\nTo: ${mail.recipient}\r\nSubject: ${mail.subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${mail.body.replace(/\n/g, "\r\n")}`;
}
export const statuses: Record<CaseStatus, string> = { received: "Received", in_progress: "In progress", quality_check: "Quality check", ready: "Ready" };
