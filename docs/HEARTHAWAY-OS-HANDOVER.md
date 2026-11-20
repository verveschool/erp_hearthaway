# HearthAway OS redesign handover

21 November 2026 · Internal ERP and CRM

## Release

PR #27 originated on `codex/hearthaway-workspace-design`. The original production baseline was `ed039babc667221b1f5ea5fb88fa733abb99b372`. The UI commit is `5a6a5b94efcc1d8344f48d389311caa995ae45ca`. The font fix is `45123571b572ff3972ffe916e5bb435ec48cd349`. The release uses the existing GitHub integration and the Vercel project `erp-hearthaway`. [Pull request #27](https://github.com/verveschool/erp_hearthaway/pull/27) · [Production application](https://app.hearthaway.com)

## Interface changes

| Area | Change |
| --- | --- |
| Shell and navigation | Wider desktop workspace, shared gutters, named navigation, active-page announcements, a skip link, visible keyboard focus and a mobile menu showing the current workspace. |
| Portfolio and Finance | Shared labeled metric groups and tabular values, clearer chart and ledger controls, scrollable table regions, labeled filters and accessible selection states. |
| Sales and Partners | Keyboard access to student records, search feedback when no leads match, more readable pipeline labels, partner location grouping and labeled form fields. |
| Users | Role, status and deletion controls reflow on phones. Each role selector and delete button identifies its user. |
| Dialogs and drawers | Native modal dialogs for sales leads, payments, agreements, imports, onboarding, reassignment, account and student workflows. They contain keyboard focus and support Escape. The student drawer fills small screens. |
| Authentication | Sign-in and recovery fields have associated labels. Required-field feedback, credential autocomplete and workspace loading text are available. |
| Fonts | The original preview failed in Next’s Google Fonts loader. The fix serves the six existing Manrope subsets with their license and preloads the Latin subset locally. |

## Verification already performed

- Installed dependencies using the committed Bun lockfile. The baseline and redesigned production builds passed. TypeScript passed. Lint retained one existing Partners image warning and reported zero errors. Shared first-load JavaScript stayed at 102 kB as reported by Next.
- Visited Portfolio, Partners, Sales, Finance and Users through the existing signed-in production session before release. Exercised the redesigned workspaces separately with synthetic student and partner records. The five workspaces fit 320, 375, 390, 430, 768, 1024, 1280, 1440, 1728 and 1920px in the component matrix.
- Checked focus on dialog entry and return after Escape for Add Sales Lead, Record Payment, student details, onboarding, bulk CSV upload, agreement and partner leads. Checked Sales empty search, finance ledger switching, portfolio chart and card controls, and role-specific navigation with synthetic roles.
- Automated WCAG A/AA scans on the five synthetic desktop workspaces and the student drawer reported zero violations in the states checked. Coverage excludes untested modal states and assistive-technology combinations.
- Tested sign-in required-field validation, recovery navigation and the registration screen in the running Next application. No reset email was sent and no real account was registered.
- A source comparison matched all 123 existing submit, change, drop and photo-save callbacks in the edited views. The release diff excludes Firebase configuration and rules, auth and data services, API routes, schema, lockfile, financial calculations and deployment configuration.

## Remaining verification

1. **Run write-path acceptance tests in an isolated Firebase environment.** Use approved disposable records to verify lead creation and reassignment, notes and status changes, CSV import, agreement uploads, bookings, payment verification, account role changes and deletion. Confirm the stored record, audit event and visibility to each permitted role. Production writes were outside the visual audit.
2. **Exercise the full account lifecycle with test identities.** Verify registration, approval, password reset email delivery, sign-in, role redirects and sign-out as distinct users. The role-specific component tests exercised navigation with fixtures.
3. **Compare exports with known records.** Check headers, row count, active filters, monetary values and currencies against an expected CSV. The export implementation was preserved.
4. **Finish device and assistive-technology checks.** On iOS Safari and macOS VoiceOver, check the mobile keyboard, nested photo and attachment dialogs, long names, text zoom, focus restoration and table scrolling. Test a real camera or file upload only with a disposable account.
5. **Close the baseline lint warning separately if desired.** Partners uses an existing plain image element for an agreement preview. The same warning appeared on the original commit.
