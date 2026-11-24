# CRM workspace interaction QA

This pass builds on the Sales handover and the previous workspace polish. Brand colors, role permissions, and stored contact values are preserved.

## Repeatable walkthrough

Use `npm run staging:emulators`, `npm run staging:seed`, and `npm run staging:web` (in an environment where the loopback service and browser can communicate). Use the fixture users only. Never record or cancel a payment or booking in production during a design walkthrough.

| Workspace | Interaction to verify |
| --- | --- |
| Sales | Search by name or phone, clear with Escape or the clear button, switch filters, open and close the lead inspector, resize the panel, edit lead and assignment fields, add a note, open contact targets without initiating a real call or sending a message. |
| Portfolio | Change scope and tabs, clear searches, switch list/card and chart views, open an inspector, return to the same scope and filters. |
| Partners | Search and filter, open partner and agreement dialogs, save a seasonal target, preview a CSV, retry a failed CSV import, dismiss a destructive confirmation without saving. |
| Finance | Search all three ledgers, change payment status filter, verify a synthetic payment, open a booking's lead, check CSV output contains only the visible results. |
| Archive | Search archived leads, expand and collapse details with keyboard and pointer, clear an empty search. |
| Users | Search by name, email and role; verify self-edit protection; confirm or dismiss a removal only using disposable accounts. |
| Account | Sign in, sign up, show/hide password, open account menu, edit profile and preview photo, check focus after dismissing dialogs. |
| All surfaces | Check repeated keyboard Tab and Escape, touch hit targets, narrow layout, focus restoration, error and empty states, reduced-motion preference. |

## Automated checks

- `npm run test:phone`: national Indian mobiles, international and formatted numbers, damaged values, and unchanged CSV/stored digits.
- `npm run test:search`: whitespace, case, numeric and missing fields in workspace queries.
- `npm run test:record-writes`: disposable Firebase Auth/Firestore emulators. Tests the same persistence helpers used by the application for notes, booking creation and booking editing, including failed writes with no partial activity or booking records.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`.

The browser extension did not connect and the cloud preview required Vercel authentication in this pass. Do not treat these checks as a fresh visual or end-to-end sign-off. The three production demo finance records have not been changed; remove only the specifically verified records through an authorized cleanup workflow.
