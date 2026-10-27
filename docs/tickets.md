# LabTrack - Friday demo tickets



## Questions I would ask Maria before building


1. Is “due date” a calendar day or an exact delivery deadline? If a day, is the promise identical for the lab and clinic? Which time zone defines today/overdue, and which time zone was used when old dates were entered?
2. Does “ready” mean ready to collect, dispatched, or delivered? Who can mark a case ready? Is this once per case, or can a case be reopened and become ready again?
3. Who is the main dashboard user? What are their three most frequent tasks, what specifically feels cluttered, and can you show the current dashboard? We should agree on one small improvement for Friday.
4. What must the clinic group see on Friday, what time is the demo, and who signs it off? Can we use only fictional cases and captured test emails? Are there existing brand assets or a repository to work in?

## Tickets
## LT-01 · Keep agreed due dates consistent across countries

**Priority:** P0. **Estimate:** 45–55 minutes.

**Problem:** Clinics report that their case date differs by one day. A likely cause is treating a calendar date as a UTC timestamp and converting it to the viewer’s local time. Without examples and the original application, this is a hypothesis, not a verified incident root cause.

**Demo decision:** Due dates are calendar days. Store them in Postgres `DATE`, send `YYYY-MM-DD` through the API and use a date-only input. The lab is assumed to be in Kolkata; that named time zone determines today and overdue. A viewing-location control demonstrates that due dates stay unchanged.

**Acceptance criteria:**

- A date entered as `2026-10-30` round-trips through the API and database unchanged, and appears as 30 October for viewers in Los Angeles, London, Kolkata, Sydney and Kiritimati.
- The list, case editor and email all use that same calendar value. Timestamps such as the email creation time remain separate and may be localized.
- Invalid dates, including 29 February in a non-leap year, are rejected by the API and never reach the database. Year range is explicitly 2000–2100.
- Today/overdue use the lab’s named time zone and exclude ready cases. Tests cover UTC date boundaries, daylight-saving dates, month/year boundaries and leap days.
- Concurrent stale due-date edits receive a conflict instead of silently overwriting a newer edit.
- For an existing production dataset, audit the old storage/entry conventions and agree on a migration before any backfill. Do not blindly add a day or cast every old timestamp to a date.


## LT-02 · Prepare one clinic email when a case becomes ready

**Priority:** P0. **Estimate:** 55–65 minutes.

**Demo decision:** “Ready” means ready for collection, once per case lifecycle. Capture a real email subject/body in a durable server-side test outbox; external delivery is disabled. Use fictional `.example` recipients. Each visitor has a separate demo workspace.

**Acceptance criteria:**

- A user can open a case, mark it ready, and see its updated state after refresh.
- The state change and a unique email event commit in one transaction. Repeated or concurrent ready requests create one event per case in that workspace.
- The email contains the case identifier, restoration type, agreed calendar date and collection instruction. It omits the patient reference.
- The test outbox clearly labels captured messages as test messages, permits preview and `.eml` download, and never claims external delivery.
- A simulated email-service failure leaves the case ready and the email visibly failed. Retrying captures the same event; repeated retries cannot create another capture.
- The event records attempt count, creation/capture timestamps and a failure reason. A pending event can also be retried after an interrupted request.
- Server-side validation and workspace scoping prevent one visitor from changing another visitor’s cases. This is fictional-demo isolation, not a claim of production staff authentication.

**Not included for Friday:** WhatsApp onboarding, verified sender setup, live delivery, automatic retry worker, delivery/bounce webhooks, preferences, reopened-case semantics and real clinic contact management. Agree these with Maria before a real rollout.

## LT-03 · Make the workbench easier to act on

**Priority:** P1. **Estimate:** 40–50 minutes.

**Demo decision:** Give a lab owner one focused case list with active, overdue, due-today and ready counts. Keep secondary work in case details and a separate message view.

**Acceptance criteria:**

- Cases are ordered by due date, then case number. The initial view shows case, clinic, restoration, due date and status.
- Clicking a summary/filter narrows the list; case text search and clinic filtering can be combined. A no-results state offers a clear reset.
- One clear case action opens its details and offers date editing or marking ready. Ready cases show a link to the clinic message.
- The interface has a usable narrow-screen layout, readable labels, keyboard focus indicators, modal Escape/focus handling, loading state, visible errors and a retry/refresh path.
- Friday’s demo uses fictional records, clearly identified as demo data. No fabricated claim of reduced task time or user-tested improvement is made.



## Delivery checklist · Package and verify the Friday handoff

**Priority:** P0. **Estimate:** 30–45 minutes.

**Acceptance criteria:**

- The live app runs on Vercel with a durable database, and its core date/ready/retry/isolation flows have been checked.


