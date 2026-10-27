# LabTrack · Friday demo

A small Next.js application for a dental lab’s case workflow: consistent calendar due dates, one captured clinic email per ready case, and a focused workbench.

**Live app:** https://labtrack-friday-demo.vercel.app

**Public repository:** https://github.com/Mariyaben/labtrack-friday-demo

**Tickets and discovery questions:** [docs/tickets.md](docs/tickets.md)

**Client update:** [docs/client-update.md](docs/client-update.md)

## Try the demo

1. Open a case and edit its due date, then save it.
2. Use the viewing-location selector below the list to switch between Kolkata, Los Angeles and Kiritimati. Calendar due dates remain unchanged.
3. Open a case and mark it ready. Go to **Clinic messages** to preview or download the captured email.
4. On another unfinished case, enable **Simulate an email failure** before marking ready. The case stays ready. Retry the message from Clinic messages to recover the same event.
5. Refresh: your changes persist in Postgres. A different browser session gets its own fictional cases.

All clinics, email addresses and cases are fictional. No external email is sent. Do not enter patient information. The viewing-location selector demonstrates the due-date rule; it is not a change to the operating system’s time zone.

## Run locally

Use **Node.js 24** and npm. Provision a Neon Postgres database, or use the database connected to your Vercel project. The runtime driver uses Neon's HTTP endpoint; an arbitrary local TCP-only Postgres connection is not supported by this adapter.

```sh
npm ci
cp .env.example .env.local
# Add your Neon connection string as DATABASE_URL in .env.local.
npm run dev
```

PowerShell users can use `Copy-Item .env.example .env.local` instead of `cp`. Open the Local URL printed by Next.js, normally http://127.0.0.1:3000. The first request creates the schema and seeds eight cases for that visitor. No external email account is needed.

```sh
npm test
npm run typecheck
npm run build
# With the local app running against the configured database:
npm run test:integration
```

Integration tests create isolated fictional workspaces in the configured database. Use a demo database. To test a deployment, set `BASE_URL` to its origin, without a trailing slash. On PowerShell:

```powershell
$env:BASE_URL = 'https://labtrack-friday-demo.vercel.app'
npm run test:integration
```

## Decisions

### A due date is a calendar day

`cases.due_date` is Postgres `DATE`. The API reads it with `to_char(..., 'YYYY-MM-DD')`, so no database driver can silently convert it to a JavaScript timestamp. The API validates real dates and a 2000–2100 range. The form uses a date input. Display formatting constructs a UTC value only as an implementation detail and always formats with `timeZone: 'UTC'`; it never interprets the date in the viewer's local zone.

The lab’s assumed zone is **Asia/Kolkata**. Only that named zone determines today and overdue. Actual moments such as `ready_at` and the email creation/capture times use `TIMESTAMPTZ`; email times are displayed in the selected viewing zone.

There is no original LabTrack code or affected production data to inspect. Timestamp localization is a plausible explanation for Maria’s issue, not a proven incident root cause. The implementation prevents that class of bug. Existing records need an audit of original input, source zone and intended date before a migration. Blindly shifting dates would risk corrupting already-correct cases.

### Ready status and the email event commit together

The server updates the case and inserts a notification into a transactional outbox in one transaction. `UNIQUE(workspace_id, case_id)` means one ready event per case lifecycle, even under simultaneous requests. The event snapshots the agreed due date at the time of the ready action. Later date edits do not rewrite that historical message or send another notification; changed-date notifications and reopening are follow-up decisions.

In this demo, delivery means **capture**, not sending. A conditional database update records captured/failed state, attempts and capture time. Concurrent retries can capture the event once. Pending/failed messages can be retried explicitly. A simulated outage exercises recovery while leaving the case ready.

This proves the event and recovery workflow without needing sender verification or real recipient data. It does not demonstrate receipt in a clinic’s inbox. There is no live-email transport hidden behind an environment variable.

For real delivery, use a background outbox worker, a verified sender, approved recipients, bounded retries/backoff and provider idempotency keys. Persist provider message IDs and process bounce/delivery webhooks. A request timeout after provider acceptance must not be treated as definitely unsent. Provider-specific idempotency windows also matter; a database event alone does not guarantee exactly-once external delivery. See [Resend’s idempotency guidance](https://resend.com/docs/dashboard/emails/idempotency-keys).

### Keep the owner’s next action visible

The case list has due-date ordering, useful summary counts, search, clinic filters and one action to open the details. Notifications have a separate view with explicit failure/retry state. No reporting suite, billing, patient charting or scheduling was added. The design is a proposal for Maria to review, not a claim of measured usability improvement.

### Public demo isolation

A randomly generated HTTP-only, SameSite=Strict cookie scopes every read and mutation to one fictional workspace. Production cookies are Secure. API writes validate the origin and a custom request header; SQL parameters are bound. Stale due-date edits fail with HTTP 409.

This is not staff authentication, tenant membership authorization or a production healthcare system. It is suitable only for fictional demo records. Before real use, add staff accounts and roles, authenticated tenant scoping, rate limiting, consent/contact validation, audit history and appropriate operational controls. Anonymous workspace creation and cleanup are not production-hardened. The cookie lasts seven days; the prototype does not automatically delete old database rows.

## Structure

```text
src/app/api/workspace/route.ts   Validated, workspace-scoped read/write API
src/components/dashboard.tsx  Case list, editor, outbox and guide
src/lib/db.ts                 Postgres schema, transactions and capture adapter
src/lib/domain.ts             Calendar-date rules, types and email download
src/lib/seed.ts               Fictional international cases
tests/domain.test.ts          Calendar boundaries, zones and invalid dates
tests/api.integration.ts      Persistence, conflicts, concurrency, failure and isolation
docs/tickets.md               Questions, acceptance criteria and scope
docs/client-update.md         Plain-English update to Maria
```

Schema creation is intentionally small and automatic for this prototype. A real existing application would use versioned migrations and a reviewed legacy-date conversion rather than runtime DDL.

