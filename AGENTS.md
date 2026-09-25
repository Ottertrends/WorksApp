# Development source of truth

1. Read [docs/current-version.md](docs/current-version.md) before architectural work. Distinguish deployed source, user-stated product decisions, and unverified provider/account configuration.
2. This directory is the canonical Git/package root. Use the existing checkout, not a sibling clone or the outer workspace.
3. Before changes, inspect `git status`, the active branch, and the current production deployment. Do not infer active providers from directory names, old README text, environment variable names alone, or a webhook verification GET.
4. WhatsApp uses Telnyx, confirmed by the user and authenticated production API/receipt evidence. The old Evolution integration has been removed from active source. Keep the confirmed Telnyx transport. Google calendar/storage integration work remains deferred.
5. Frontend/interface changes are outside the current task. Backend changes must not alter components or layouts unless separately requested.
6. Do not apply migrations merely because a table appears in source but is missing from the REST schema. First establish that the feature is active and required, then compare the live schema and validate a forward migration.
7. The outer `../.archive/` is not application code. It contains unapplied experiments, including migrations 040 and 041, which must not enter a deployment by accident.
8. Never print credential values. Inspect names/presence and deployment metadata when tracing configuration. Do not send test customer messages or invoke paid model workflows merely to identify the provider.
9. Record implementation status precisely: local, committed, deployed, migration-applied, or runtime-verified. A build passing does not establish production behavior or lower cost.
