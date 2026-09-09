# CRM

The CRM is available at `/dashboard/crm` through desktop and mobile navigation.

Apply `supabase/migrations/039_crm.sql` before deploying this feature. It creates the workspace-scoped opportunities table, validation and activity timestamp trigger, and transactional client-directory promotion function. The migration depends on existing clients, profiles and the workspace helper from migration 037. No existing project records are converted.

The pipeline supports leads, scheduled visits, quotes, and won/lost outcomes. An opportunity can skip the scheduled stage. Contact details, notes and visit information remain on the same record across stage changes. Closing a won opportunity requires a date and final amount. Adding a closed contact to the directory is a separate explicit action, respects the existing client allowance, and does not constitute marketing consent.

The current Monday–Sunday weekly overview shows open value/count, newly created opportunities, wins and their final value. Open opportunities unchanged for strictly more than five days are highlighted. The page refreshes its data every minute. This is an in-app summary, not a scheduled outbound message.

CRM visits appear in the app's monthly calendar and the availability panel. Availability reads recurring calendar rules, other CRM visits and active/trialing/past-due subscription renewal dates. Renewal dates are informational billing events, not confirmed service bookings. Existing calendar records have no duration, so the panel does not guarantee free time slots or prevent overlapping appointments. CRM visits are not exported to Google Calendar by the existing recurring-rule integration.

Agent tools: `read_crm`, `save_crm_opportunity`, `crm_add_client`. The agent and web API share validation and persistence logic.
Both WhatsApp webhook entry points use the shared agent. When no workspace is supplied, the agent resolves active team membership before reading or writing business records. CRM instructions cover English/Spanish stage commands and override general project/invoice rules for prospects.

Verification:

- `npm exec -- tsc --noEmit`
- `npm exec -- eslint src/lib/crm src/components/crm src/app/api/crm src/app/dashboard/crm`
- `node scripts/crm-check.cjs`
- `node scripts/crm-agent-check.cjs`

After applying the migration, verify with an authenticated workspace: create a lead, link an existing client, move directly to quoted, schedule a visit and view it in the calendar, save won/lost details, and add a closed contact to the directory twice to confirm idempotency. Verify another workspace cannot read or link its records. Database and authenticated browser checks must be performed against a configured test environment before production rollout.
