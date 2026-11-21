# HearthAway OS redesign handover

21 November 2026 · Internal ERP and CRM

## Release

PR #27 was merged to `main` at `f34f2ca592d5baebcfc55a7ee09088384f8a5f91`. Vercel reports this commit READY and assigned to `app.hearthaway.com`. A signed-in browser loaded the new Portfolio overview. The live Latin Manrope asset matched the file on `main` byte for byte. [Production deployment](https://vercel.com/boku-wa-tobi/erp-hearthaway/CamhnBVaZx4qpwmUhNHKre2myg4u)

The redesign and the Manrope build fix originated on `codex/hearthaway-workspace-design`. The original production baseline was `ed039babc667221b1f5ea5fb88fa733abb99b372`. The UI commit is `5a6a5b94efcc1d8344f48d389311caa995ae45ca`. The font fix is `45123571b572ff3972ffe916e5bb435ec48cd349`. The release uses the existing GitHub integration and the Vercel project `erp-hearthaway`. [Pull request #27](https://github.com/verveschool/erp_hearthaway/pull/27) · [Production application](https://app.hearthaway.com)

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

## Post-merge regression tests

A detached checkout of the merged commit used the Firebase Auth and Firestore emulators with the checked-in rules and synthetic records. The Firebase connection change was confined to the test checkout.

- Twelve checks passed. They covered email sign-in and sign-out, role route gates, lead creation, sales owner reassignment, pipeline stage, priority and notes, booking and commission calculation, payment verification and audit events, partner onboarding and agreement metadata, portfolio owner reassignment, duplicate-aware bulk persistence, and reset-code generation.
- Sales and Finance exports used the real UI handlers with fixture data. Checked headers, filtering, amounts and currencies. The CSV helper also passed delimiter and quote escaping checks.
- The production URL returned HTTP 200 for the sign-in, registration, five main workspace and four legacy paths. The signed-in browser confirmed Portfolio. The larger authenticated production viewport sweep expired, so the responsive matrix recorded above comes from the local browser run.

## Firebase follow-up

The connected Vercel project has no custom staging environment, and the repository has no staging branch. Preview deployments build the application with its checked-in Firebase configuration. The follow-up used a localhost-only Firebase demo project and the checked-in Firestore rules. Cloud staging confirmation is pending.

| Issue | Baseline on the local emulators | Follow-up |
| --- | --- | --- |
| Direct Finance payments | Firestore rejected the write when the optional proof fields were omitted. | The fix omits absent fields, commits the payment and related student stage together, and keeps the Finance dialog open if the save fails. A direct payment persisted with the expected amount, currency and stage. The management exception path still recorded its proof metadata. |
| Subscriptions after sign-in | With time for the signed-out listeners to fail, new records still did not appear after a successful sign-in until the app remounted. | The fix waits for a valid Firebase session and starts fresh listeners per account. The local comparison confirmed records load after sign-in without remounting, and session data clears on sign-out. |
| Management edits to other profiles | A manager's role update and soft deletion were both denied by the checked-in rules. | Still open. Confirm the rules deployed in an isolated cloud project and implement management actions with a trusted server-side authorization mechanism. Test allowed and denied roles before rollout. |

The same emulator suite completed 15 groups of checks on the baseline and the fix, with expected outcomes for each version. TypeScript, lint and the Next.js build passed. Lint retained the existing Partners image warning. The PR leaves Firebase configuration and Firestore rules as they were. No production records were used or edited.

## Remaining verification

1. **Provision or identify a cloud staging frontend and Firebase project with disposable data.** Rerun the three reproductions there and compare the deployed rules with `firestore.rules`.
2. **Resolve management authorization in a separate change.** Confirm intended role-management, approval and soft-deletion authority, then verify the permission matrix on staging.
3. **Complete staging acceptance.** Check actual CSV upload and preview, proof and agreement file upload, payment rejection, registration and password-reset email delivery. Finish iOS Safari and macOS VoiceOver checks for nested dialogs, focus, text zoom and table scrolling.

## Partner and lead operations

The follow-up covers the partner cards, single-lead forms, editing, seasonal commitments, ownership and archival.

| Workflow | Behavior |
| --- | --- |
| Partner cards | The pencil opens Edit. Agreement sits under the pencil. The Leads button stays on one line. Directory actions remain available in the table. |
| Lead entry | Sales and Partners use the same fields as the CSV template, including intake, destination, move-in date, budget and currency. Sales selects a source partner or Direct. Partner submissions inherit the authenticated partner. |
| Lead corrections | Edit lead opens the same contact and intake fields plus additional lead details. The audit trail records the actor and changed fields. The record ID, source partner and derived portfolio owner stay linked. |
| Duplicate checks | Email compares after trimming and case normalization. Phone compares digits independently. Individual entry, edits that change a contact and bulk import recheck current active records. A Firestore transaction serializes these writes. Legacy writers must be retired or updated to participate in that transaction. |
| Archive | Management supplies a reason and moves the lead to Data archive in a single transaction. Archived leads are inactive and excluded from active leads and their duplicate checks. A corrected lead can be created with the same contact details. Lead IDs and existing booking or payment references are retained in the archived record. |
| Seasonal targets | Partner cards and directory show active leads received against promises for each intake. Common intake spellings such as September 2027 and Sep-27 are grouped. Management and the assigned portfolio owner can edit the target. |
| Ownership | The old Sales Owner assignment appears as Lead Owner. New leads start with both owners unassigned. The new Sales Owner requires a Lead Owner and a qualified or later pipeline stage. The same sales staff directory feeds both selectors. |

### Verification

Seven groups of localhost Firebase and rendered-component checks passed. They covered separate email and phone matches, concurrent intake, audited edits, ownership sequencing, archive permissions, recreation after archive, seasonal permissions and matching form fields. The card check verified the accessible pencil and one-line Leads control. TypeScript, lint and the Next.js build passed. Lint retained the existing agreement-image warning.

### Staging and rollout

- This work builds on the authenticated Firestore listener fix in PR #28. Merge that fix before this feature branch.
- In an isolated Firebase staging project, assign the trusted custom claim `leadOperationsRole` to approved users with the value `management`, `portfolio_owner` or `sales` as appropriate. Use an approved Admin SDK session and preserve any unrelated claims. [Firebase custom claims](https://firebase.google.com/docs/auth/admin/custom-claims) A sign-out and sign-in refreshes a stale token. Management role in a client profile is insufficient for these new privileged writes.
- Populate `leadOwnerDirectory/{authUid}` with `displayName` for eligible sales staff using that Admin SDK session. Application clients have read-only access to this directory. Existing lead assignments still display through the legacy field fallback.
- Deploy the revised Firestore rules to the named staging database before testing the feature. Stage new lead creation, archive, partner onboarding and portfolio reassignment, since these paths now depend on the revised rules and role claims. Coordinate the eventual production rule and application rollout after staging passes.
- Review old flagged leads in staging. The previous flags do not automatically move records, and this PR does not perform any bulk archival.
- Management edits to other account profiles from the previous handover remain open. The scoped claims for lead operations do not grant that permission.
