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

1. **Provision or identify a cloud staging frontend and Firebase project with disposable data.** The signed-in console was later used to provision the separate `hearthaway-staging` project. The staging rules and fixtures are live, and the PR preview is configured. See the hosted acceptance results below. Compare the staging rules with `firestore.rules` and rerun the three Firebase reproductions and the PR #29 acceptance checks below.
2. **Resolve management authorization in a separate change.** Implement management edits, approval and soft deletion of other account profiles through a trusted server-side mechanism. The scoped claims for partner and lead operations do not grant that permission.
3. **Finish release acceptance.** Still open are cloud payment proof upload and rejection, registration and password-reset email delivery, iOS Safari, and macOS VoiceOver checks for nested dialogs, focus, text zoom and table scrolling.

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

### PR #29 isolated acceptance

The running Next.js app used the Firebase Auth and Firestore emulators in the loopback-only `demo-hearthaway-qa` project. All accounts, records and uploads were synthetic. The browser was tested against the checked-in rules. No production records, Firebase rules or deployment settings were changed during this work. [PR #29](https://github.com/verveschool/erp_hearthaway/pull/29)

| Role | Verified outcome |
| --- | --- |
| Management | Onboarded a new partner under an eligible portfolio owner, edited its contact with a zero commission preserved, and reassigned it with an audit event. Changed the agreement status and terms, uploaded an attachment and downloaded the same bytes. Changed a seasonal target. Required an archival reason, removed the lead from the active queue, verified its inactive record in Data archive and reused its email and phone in a new lead with a different ID. |
| Assigned portfolio owner | Saw the assigned partner and saved the September commitment. The visible ratio updated from 4 / 4 to 4 / 9. |
| Other portfolio owner | Saw only the partners in that account's Partners workspace, including the reassigned agency. Firestore denied changes to the first owner's target. |
| Sales | Rejected an email-only duplicate and a separate phone-only duplicate, then created a complete lead under a partner. Assigned the Lead Owner, qualified the lead, assigned a different Sales Owner and verified the edit audit after correcting the name and phone. |
| Partner | Submitted an individual lead under the linked partner. Saw a read-only commitment and uploaded a real CSV. Preview kept EUR 205 and the quoted name. It skipped existing email, existing phone and within-file phone duplicates, then saved one eligible row with its currency, notes and attribution. |
| Finance | The browser denied direct access to Data archive. |
| Firestore role checks | Six non-management fixture accounts were denied access to the archive, agreement attachment and portfolio owner directory. Five wrong-role or wrong-owner target updates were denied. Persisted browser results were checked directly against the emulator. |

TypeScript, the Next.js build and lint passed. Lint retained one existing agreement-logo image warning. The cloud staging project and preview are provisioned. See the hosted acceptance results below. The current Firestore rules continue to allow signed-in users to read active lead and partner collections. The application scopes the workspace views, and record-level read isolation would require moving duplicate checks and data queries behind a trusted backend.

### Run isolated staging locally

Install the project dependencies and make Java 21 available on `PATH`. From the PR checkout, start the emulators in one terminal. Then seed fixtures and run the app in another terminal. The seed writes only to the hard-coded loopback emulator project and is intended for a disposable dataset. [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)

```sh
npm run staging:emulators
```

```sh
npm run staging:seed
npm run staging:web
```

Open [the emulator-backed app](http://127.0.0.1:4329). The seed prints the emulator-only fixture password. Fixture addresses use the suffix `@example.invalid` with the aliases `qa-management`, `qa-portfolio`, `qa-other-portfolio`, `qa-sales`, `qa-sales-two`, `qa-partner` and `qa-finance`.

### Hosted staging and rollout

- PR #29 is stacked on the authenticated Firestore listener fix in PR #28. Merge that fix first when the PRs are ready for release.
- Create a separate Firebase project, enable email/password Auth, create Firestore and register a web app. Use disposable users and records. Never copy production credentials or records into staging. [Firebase environments](https://firebase.google.com/docs/projects/dev-workflows/overview-environments)
- In Vercel, scope `NEXT_PUBLIC_FIREBASE_MODE=staging` and the complete `NEXT_PUBLIC_FIREBASE_STAGING_CONFIG` JSON to a dedicated staging frontend or the PR branch only, then rebuild. Include `firestoreDatabaseId` as shown in `.env.example`. The staging mode rejects missing configuration and reuse of production project or Web app values. The default preview can still point to the checked-in Firebase project. Confirm the isolated build and Firebase project before signing in or writing test data.
- Apply `firestore.rules` to the named **staging** database. Using an authorized Admin SDK session connected to that project, assign the trusted `leadOperationsRole` custom claims `management`, `portfolio_owner` or `sales` to the fixture users. Preserve unrelated claims and refresh the test session by signing out and in. Partner and Finance fixtures need a corresponding profile without a privileged claim. [Firebase custom claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- Seed `leadOwnerDirectory/{authUid}` for eligible sales staff and `portfolioOwnerDirectory/{authUid}` for approved portfolio owners. Each document needs only `displayName`. Application clients have read-only access where permitted. The portfolio directory and saved agreement bytes are management-only.
- Complete the role matrix on the hosted staging build before coordinating any production rule and application rollout. Review existing archive flags individually. Older agreement metadata may hold only a filename. Reattach originals to enable file download. The current agreement limit is 768 KB.

### Hosted staging acceptance

The isolated Spark project `hearthaway-staging` has email/password sign-in, a separate Web app and Standard `(default)` Firestore in `nam5`. The staging database runs the checked-in PR #29 rules. The deployed rules SHA-256 is `4a20266557f4cf22e1fa4a2e755544dbd9f1bc2e98706a299792cdd279acee62`. The seed created seven synthetic identities and roles, two agencies, both owner directories and a legacy lead fixture. All seven signed in successfully with a token audience of `hearthaway-staging`. Production data, rules and deployment settings were untouched. [Firebase staging console](https://console.firebase.google.com/project/hearthaway-staging/overview)

The Vercel variables `NEXT_PUBLIC_FIREBASE_MODE` and `NEXT_PUBLIC_FIREBASE_STAGING_CONFIG` target Preview on `codex/partner-lead-operations` only. Deployment `dpl_82BBJAZHDXtTAjpBUKkmKbDksTSq` built commit `00eada78b456abddcb06b8f0c60e33e7832e5316` and reached READY. Vercel's authenticated fetch returned HTTP 200. The deployed client bundle contained the isolated staging project ID. The browser session could reach the app on localhost with cloud staging configured. Its direct Vercel preview navigation timed out, and an unauthenticated HTTP request redirected to Vercel SSO. [Protected Vercel preview](https://erp-hearthaway-35u024oye-boku-wa-tobi.vercel.app)

| Check | Hosted Firebase result |
| --- | --- |
| Partner onboarding and profile edit | Management created Hosted QA Agency in the browser, preserved the zero commission, and updated the contact. Firestore confirmed the saved values. |
| Agreement and partner reassignment | Firestore saved and returned the original agreement bytes, denied Finance access, and persisted the changed portfolio owner. The browser file chooser stalled, so interactive attachment and download remain pending in the hosted environment. |
| Lead intake and corrections | The browser recreated an archived contact through the Sales form, rejected email-only and phone-only duplicates independently, saved a Partner lead in EUR, and displayed the audited Sales correction. |
| Ownership, targets and archive | Firestore enforced qualification before Sales Owner assignment, accepted distinct owners, accepted target updates from Management and the assigned owner, and rejected changes from four other roles. Management archived the legacy fixture with a reason, which the browser displayed as inactive. Each non-management fixture was denied archive access. |
| Remaining hosted checks | Run the role matrix from an interactive Vercel-authenticated browser. Repeat CSV upload and agreement file upload and download there. Those browser workflows passed previously on the Firebase emulators. |

Cloud staging credentials are disposable and excluded from this handover and the repository. See the earlier remaining verification section for the separate Finance and account management work.
