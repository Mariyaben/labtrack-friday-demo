# LabTrack interface refinement

## Audit

The existing app had a coherent forest palette, but too much text inherited a green tint. Small metadata, low contrast, repeated status pills and a large rounded wrapper weakened the record hierarchy. The header repeated counts without a clear relationship, controls looked like separate components, and narrow screens required horizontal scrolling to find a case’s deadline. Styling also mixed several rounds of ad hoc values in one file.

## Implemented design

- Kept the dark sidebar, reduced its width and used a restrained leading rule for active navigation. Preserved Cases, Clinic messages, Demo notes and the real next-due case shortcuts.
- Kept IBM Plex Sans for the interface and IBM Plex Mono for case identifiers and tooth references. Primary content now uses charcoal; forest is reserved for navigation, focus, updates and ready states.
- Replaced the outer rounded case card with a flat workspace: compact title/count, status navigation, integrated search/filter controls and a ruled table.
- Gave clinic names and agreed dates greater prominence than reference and location metadata. Dates and counts use tabular numerals. Urgency is explicitly labelled, with restrained rust accents.
- Replaced stage pills with reusable text-and-symbol indicators for the actual model: Received, In progress, Quality check and Ready. Overdue remains an independent deadline condition. No unsupported Completed records or progress percentages were invented.
- Defined row hover, keyboard focus, open-case and updated-date treatments. The existing record actions remain; no bulk-selection or other unsupported workflow was added.
- Added `/` to focus case search and Escape to clear it, without intercepting typing in fields or keys inside dialogs. Results are announced through the existing footer.
- Added an actual refreshing state and a static initial-loading skeleton. Animations are limited to the loading spinner and short color transitions, with reduced-motion overrides.
- Added a compact mobile case list, rather than compressing the table. Each record retains its identifier, due date, clinic/location, restoration, tooth/reference, production stage, rush flag and email-retry indication. Opening a record uses the same editor and mutations as desktop.
- Kept tablet table scrolling inside the table region. Active filter navigation stays visible after clearing filters, changing views or resizing.

## Files and reusable pieces

| File                             | Responsibility                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/app/tokens.css`             | Shared palette, typography, spacing, control/dialog radii and motion duration              |
| `src/app/globals.css`            | Consolidated layout and component styles, interaction states and responsive layouts        |
| `src/components/dashboard.tsx`   | Existing workflow orchestration, refined controls, search focus and refresh feedback       |
| `src/components/case-table.tsx`  | Shared case presentation for desktop/tablet tables and compact mobile records; date labels |
| `src/components/case-status.tsx` | Consistent production-stage text and symbols                                               |
| `src/components/ui/dialog.tsx`   | Native accessible modal, unique title IDs, Escape/backdrop handling and focus lifecycle    |

The color tokens distinguish canvas/surface, ink/text/metadata, rules, brand/focus and semantic urgency/ready states. Spacing uses a four-pixel family, with distinct page, toolbar and record intervals. Controls use a 4 px radius; only modal surfaces use 8 px. The shared transition duration is 120 ms. No dependency was added.

Metadata contrast was checked against white, the warm canvas and the selected-row surface. The revised muted text color has contrast ratios of approximately 5.11:1, 4.76:1 and 4.55:1 respectively. These are targeted checks, not a claim of a complete accessibility certification.

## Verification

- Production build, including TypeScript: passed.
- All eight existing calendar/API tests: passed.
- Desktop review at a 1440 px viewport setting and tablet review at 1024 px. Tablet’s 930 px table scrolls inside its 765 px region without horizontal page overflow.
- Mobile review at 390 px and 304 px viewport settings. Critical deadline and stage information is visible in each compact record; no horizontal page overflow was observed.
- Verified search shortcut, Escape-to-clear, Ready + clinic filtering, no-results reset and result announcements.
- On mobile, changed LT-2045’s due date to 3 November, confirmed ready was disabled while unsaved, saved and refreshed, and verified persistence. Marked ready with simulated email failure, retried, inspected the captured email’s 3 November date and downloaded its `.eml` file.
- Verified Escape dismissal of the extracted dialog, sidebar navigation, demo notes and refresh.
- Changed the viewing zone to Kiritimati and confirmed calendar dates stayed unchanged.
- Verified that clearing a filter returns the active filter label into view without a vertical scroll jump.

Backend logic, API contracts, database schema, notification transport and dependencies were not modified. Email remains the agreed test-outbox implementation; WhatsApp stays deferred.

## Remaining limits

Native date pickers and select menus can differ visually across browsers. Rendered QA used the available Chromium browser; Safari and Firefox were not independently inspected. The app has no Completed state in its existing model, so one is not displayed. Product assumptions about collection, quality approval and the lab’s operating zone still require Maria’s confirmation before production use.
