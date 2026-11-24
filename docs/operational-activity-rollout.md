# Operational activity feed rollout

The feed is a fixed-label projection. It excludes descriptions, notes, values,
attachments, finance and commission events. New writes are disabled by default.
Deploy the Firestore rules first, provision the trusted owner directory, then
set `NEXT_PUBLIC_OPERATIONAL_ACTIVITY_ENABLED=true` in the frontend build and
redeploy it. Enabling the flag against old rules can reject transactions that
include a projection; do not enable it before the rules are live. Older clients
and partner-submitted events do not create projections, so this is not a
complete audit trail. The full audit remains restricted to admins.

The optional backfill is a separate, trusted operator action. First obtain a
short-lived token with access to the intended Firestore project and run:

```
GOOGLE_OAUTH_ACCESS_TOKEN=<token> node scripts/backfill-operational-activities.mjs --project=<project-id> --database=<database-id>
```

This is a dry run and prints aggregate counts only. Review counts, project, and database,
then add `--apply` to create missing projections. It never overwrites existing
projections, so it can be retried. It skips unusual identifiers and timestamps,
unknown actors and actors lacking a trusted directory record. It uses each
actor's current directory name and profile role, which may differ from their
name or role at the time of the event. It does not copy free-form audit fields.
Use a staging project first, and review the project and counts before applying.
No historical migration is performed by the application itself.
