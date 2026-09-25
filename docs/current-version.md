# Verified current version and backend map

Verified against the live site and Vercel on September 24, 2026 (local time).

## Source of truth

| Item | Verified value |
| --- | --- |
| Reference site supplied by the user | https://www.worksapp.co |
| Git repository | https://github.com/Ottertrends/WorksApp |
| Production branch | main |
| Deployed commit | 245d93d8fcf0364efede44007d88e11342da138a |
| Commit title | Improve contractor SEO and free-plan positioning |
| Vercel project | ottertrends-projects/worksapp |
| Deployment | https://vercel.com/ottertrends-projects/worksapp/BkGWvVxFjSoyRuhReQir2BjjCK13 |
| Application root | This repository, the nested WorksApp.co/Worksapp.co directory |

The Vercel production overview explicitly links this deployment, domain, repository, branch, and commit. A fresh Git fetch matched the local baseline. The public site displays the SEO landing page from that commit. No running local Next.js server was found during inspection; the user clarified that the current version meant worksapp.co.

## Confirmed WhatsApp configuration

The user has confirmed Telnyx after locating the correct account. Production credentials successfully retrieved the WorksApp messaging profile, the connected WorksApp WhatsApp number, and its active/approved business account. A signed finalized callback explicitly reported a delivered reply. See the trace below for identifiers.

The production source baseline above is distinct from the current uncommitted backend update. Do not assume the local changes have been deployed.

## Backend map at the verified commit

| Area | Entry point and behavior |
| --- | --- |
| Web authentication | Supabase browser/server clients; `src/proxy.ts` refreshes auth and protects dashboard routes. |
| Web chat | `src/app/api/chat/route.ts` authenticates, checks free message allowance, resolves workspace membership, passes recent history to the shared agent, and records usage. |
| Agent orchestration | `src/lib/agent/contractor-agent.ts` builds the prompt, loads memory/profile, checks token usage, and runs a bounded Chat Completions tool loop. |
| Model routing | `model-router.ts` uses local patterns, with the capable model for ambiguous requests. Defaults in `model.ts` are GPT-5.6 Terra and Luna. The local update supports OPENAI_MODEL and OPENAI_MINI_MODEL overrides. |
| Database actions | `tools.ts` defines available tools; `tool-handlers.ts` performs project/client/invoice/price-book/CRM/calendar/proposal/media/profile operations. |
| Database credentials | `src/lib/supabase/admin.ts` creates the service-role client. Server-side ownership checks matter because this client bypasses RLS. |
| Shared teams | `src/lib/workspace/context.ts` separates actor identity from the owner's workspace. Other handlers/routes need case-by-case verification of which identity they use. |
| Conversation storage | WhatsApp handlers use `messages`; the agent uses `agent_memory`. The persistent sessions/action receipts/job tables from the earlier experiment are not in this production baseline. |
| Payments | Stripe billing, Connect, invoice/subscription routes, and separate Stripe webhook handlers. |
| Proposals | Dedicated generation API plus an agent tool, using project data, media, and model generation. |
| Scheduled work | Existing schedules remain. The local reminder update removes obsolete WhatsApp sending and retains email reminders. No agent-jobs worker is added. |

Code presence is not evidence that every feature is enabled or working in production. The production database schema and all RLS policies were not fully inspected in this cleanup. No customer messages, payments, model calls, account changes, or database migrations were performed.

## Google scope

Google calendar/Gmail integration work is deferred by the user. Existing Google-related source and configuration should not trigger automatic schema creation. Google sign-in is separately visible on the live login screen; do not conflate authentication with calendar integration.

## Cleanup performed

The application's tracked runtime files were restored to the exact deployed commit. The prior local backend experiment was preserved outside the repository at:

`../.archive/undeployed-agent-review-20260924-205722/`

That archive contains 29 checksum-verified source/document/test files, a Git patch, a manifest with the baseline SHA, and the old generated Next.js build. Its proposed 040/041 migrations were removed from the active migration folder without applying them. Improvements in that archive are candidates for a fresh, scoped review, not completed production features.

Empty outer source/Git folders were moved into the archive. The stale outer launcher referenced a nonexistent `contractoros` directory; it now targets this application. Generated output and browser artifacts are ignored by Git. No existing deployed provider code was deleted solely because it looked obsolete.

## Local backend update (not yet deployed)

- Removed the old provider webhook/client/types, QR pairing and self-chat routes, unused connection components, and legacy debug/send-test endpoints. Existing admin diagnostic styling/layout is unchanged; its transport field now uses the provider-neutral `whatsapp` name and its old provider label is corrected to WhatsApp.
- Historical migrations and their legacy columns remain intact; no destructive schema cleanup is required.
- Admin diagnostics authenticate to Telnyx without paying for a model completion. Per-user webhook resync returns an explicit retired-operation response because the provider profile is shared.
- Inbound IDs are claimed before media work, using the existing unique index and 50-message history retention (not an indefinite deduplication ledger). Accepted outbound IDs are persisted; rejected sends do not create successful outbound rows. Delivery callbacks record delivered/failed/sent outcomes and return 503 if the receipt cannot be saved.
- Sends have a 15-second timeout. Only explicit 429 rejections get bounded retries; ambiguous failures are logged for reconciliation, not blindly resent. No durable outbox/worker or automated external alert subscription is added.
- Local model routing removes a classifier request. Independent context/usage queries run together. Both model tiers and the step-limit summary count toward token usage, aggregated into one awaited write. Both channels now share the message allowance; workspace subscription access is respected.
- The monthly allowance check is not an atomic reservation: simultaneous requests can cross a limit. A durable quota reservation/queue remains a separate improvement.
- The database concierge has 20 schema-verified categories with explicit columns, bounded pagination/chunked text, workspace filters, actor-only personal records, and parent authorization for invoice items. No raw SQL or credential access.
- Media fetches send the Telnyx bearer credential only to api.telnyx.com and use bounded download timeouts.
- Database fields and the existing increment_usage RPC were verified read-only against production. No migration, test customer message, or live model request was performed.

## Before the next backend change

1. Confirm whether these local changes have been committed and deployed.
2. Keep the confirmed Telnyx transport; do not revive the old account mismatch assumption.
3. Keep the interface unchanged and new Google integration work out of scope.
4. Do not copy archived queues or migrations wholesale.

## Production credential trace (September 24, 2026)

Read-only Telnyx API calls were executed with the existing Vercel production credential held in the child process environment; no credential value was printed or written by the diagnostic script.

- Messaging profile: WorksApp, `40019f6d-bd1d-4fc1-a921-a6ccdc8f417a`.
- Telnyx organization: `26eefedf-3ba1-4831-8efa-a3e252bf3879` (matches signed webhook payload and authenticated profile lookup).
- Primary callback: `https://www.worksapp.co/api/webhooks/whatsapp`; failover: `/api/webhooks/whatsapp/failover`.
- WhatsApp Business Account: WorksApp; Meta WABA ID `1593744622151448`; Telnyx WABA resource `fd54efb4-5edf-4c3c-ab3b-4a7036cea0af`.
- WABA status at inspection: ACTIVE, review APPROVED, business verified.
- Sender: +1 737-703-1190; CONNECTED, enabled, quality GREEN.
- Account balance at inspection: USD 4.65, available credit USD 4.65, credit limit USD 0.00. These are a snapshot, not a billing forecast.
- Stored finalized callback for the observed reply explicitly reports recipient status delivered. This establishes delivery for that message, not aggregate reliability.
- Account recovery was resolved: a payment receipt matched this exact organization ID, and the user confirmed finding the account. Account-login details belong in the password manager, not this repository.

No messages were sent and no provider settings, credentials, billing settings, or deployments were changed. Existing production transport is WorksApp backend -> Telnyx WhatsApp API -> WhatsApp; Meta account ownership alone does not imply a direct Graph API implementation.

## Verification of local update

- 18 mocked backend/resource tests passed, plus both existing CRM checks.
- TypeScript and targeted lint passed.
- Production build passed. No live messages or paid completions were used for testing.
- Historical migrations are unchanged; no migrations were applied. Changes are local, not pushed or deployed.
- Daily diagnostic retention uses the existing reminder cron; this route retains the existing optional CRON_SECRET check; mandatory-secret rollout is deferred. Its optional email delivery requires the existing Resend configuration. Neither is needed for inbound WhatsApp agent replies.

## September 25 release scope

The user authorized pushing the completed efficiency and Telnyx cleanup work while deferring the durable runtime. Remote main and the production deployment were rechecked before separation: both still matched the baseline above (Vercel deployment dpl_BkGWvVxFjSoyRuhReQir2BjjCK13).

The release includes classifier-free routing, parallel context/usage reads, consolidated usage accounting, shared message allowance, scoped resource reads, Telnyx receipt/send handling, and retired-provider cleanup. It contains no new migrations, durable jobs, confirmations, outbox, worker, health endpoint, or runtime flag. Admin authentication and cron-secret enforcement changes are deferred with the configuration rollout; existing production authentication behavior is retained. Interface structure and styling are preserved.

The full pre-separation state is preserved outside the repository at `../.archive/deferred-backend-20260925/`: checksum-verified snapshot, manifest, baseline, original patch, and deferred files. See [handoff-2026-09-25.md](handoff-2026-09-25.md) for remaining work. Do not copy archived migrations into production automatically.

Validation after separation: 18 mocked backend/resource tests and both CRM checks passed. TypeScript, targeted ESLint, and the production build passed after separation. Production runtime behavior and performance gains still require measurement; no customer messages or paid evaluations were run for this release.
