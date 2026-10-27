# Verification · 27 October 2026

The following checks were executed against this prototype. This is not a review of Maria’s original application or a claim of production readiness.

## Automated

- Next.js production build, including TypeScript: passed.
- Four calendar-date tests: passed. They cover six time zones; US/UK daylight-saving dates; leap-day, month/year boundaries; invalid dates and timestamp input; and the lab’s date at a UTC day boundary.
- Four API integration tests: passed locally and against the public Vercel production origin using the actual Neon database.
- The API checks cover date round-trips, stale-edit conflicts, invalid-date rejection, cross-origin rejection, missing-case handling, five simultaneous ready requests yielding one captured email with one attempt, persistence on refresh, failure/retry recovery and visitor workspace isolation.

## Browser checks

- Viewed the case list in desktop and narrow mobile layouts.
- Switched the viewing location to Los Angeles; the case editor retained the calendar date.
- Edited a case’s due date to 30 October 2026 using the native date control, saved it and marked it ready.
- Previewed its captured email: it contained `Agreed due date: 30 October 2026`.
- Downloaded the `.eml` file and inspected its headers and plain-text body.
- Simulated a failure on another case, observed a failed message while the case stayed ready, and retried successfully.
- Verified the no-results search state and Clear filters action.
- Verified that the “In the lab” filter excludes ready cases.
- Found and fixed a mobile overflow caused by the visually hidden table header. Recheck: document scroll width and client width both 375 CSS pixels; the table scrolls within its own region.

## Native date editor regression

- Reproduced a client-side failure: the native input displayed `2026-11-02` for LT-2043 while the Save date button remained disabled. The earlier API tests did not cover this browser interaction.
- The form now reads the submitted native value through `FormData`, observes native input events for the unsaved indicator, and keeps Save date available. Marking ready is blocked while the date is unsaved.
- Repeated the exact LT-2043 edit to 2 November 2026 using the browser date input, clicked Save date, verified `2 Nov 2026` in the list, refreshed, and reopened the editor. The saved date remained `2026-11-02`.
- Save confirmation includes the case identifier and full date. The updated row is highlighted and the list returns to All cases so a due-today filter does not hide the changed record.

## Limits

- No external clinic email was sent. Capture mode is the implemented test email path.
- No original production records were migrated.
- No formal usability study, broad browser compatibility certification, delivery-provider test, penetration test or production-load test was performed.
- A Loom script is prepared separately. The applicant still needs to record the video and supply its URL before submitting the application.
