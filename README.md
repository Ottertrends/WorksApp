# WorksApp

The production reference is **https://www.worksapp.co**. This directory is the application and Git root; the outer workspace is only a container.

Read [docs/current-version.md](docs/current-version.md) before architectural changes. It records the verified production commit, backend paths, and the confirmed Telnyx WhatsApp setup and the status of local backend improvements. Keep the verified provider configuration as the baseline.

## Local development

Run from this directory:

```powershell
npm.cmd ci
npm.cmd run dev
```

The app listens on http://127.0.0.1:3000. For the Webpack development variant, use `npm.cmd run dev:webpack`. Validate production compilation with `npm.cmd run build`.

The lockfile is `package-lock.json`; use npm for reproducible installs. Do not start commands from the outer folder unless using `npm --prefix Worksapp.co ...`.

## Configuration

Keep credentials in the existing untracked `.env.local` or the deployment environment. Never commit or print them.

Core server configuration includes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Supabase authentication and data access.
- `SUPABASE_SERVICE_ROLE_KEY` for server-side operations.
- `OPENAI_API_KEY` for the agent.
- `NEXT_PUBLIC_APP_URL` for application links.
- Stripe configuration for enabled payment/billing features.

WhatsApp uses Telnyx. Configure `TELNYX_API_KEY` and `TELNYX_PUBLIC_KEY` (or `TELNYX_WEBHOOK_PUBLIC_KEY`) on the server. The messaging profile sends signed callbacks to `/api/webhooks/whatsapp`, with `/api/webhooks/whatsapp/failover` as its fallback. The webhook routes registered senders by `profiles.phone_e164`; users do not pair QR sessions. Google calendar/Gmail integration work is deferred; Google sign-in remains a separate existing feature.

## Repository map

- `src/app/`: pages and backend routes.
- `src/lib/agent/`: shared agent, routing, prompts, and tools.
- `src/lib/workspace/`: owner/member workspace context.
- `src/lib/supabase/`: browser, server, and privileged database clients.
- `supabase/migrations/`: versioned database changes; compare with live schema before applying.
- `docs/current-version.md`: deployment evidence and backend map.
- `docs/seo-research.md`: contractor audience and SEO research.

The previous undeployed backend experiment and migrations are preserved under the outer `../.archive/`. That archive is not part of the app or deployment and must not be imported automatically.

## Deployment

The Vercel project is `ottertrends-projects/worksapp`, connected to `Ottertrends/WorksApp` on GitHub. Production was verified at commit `245d93d8fcf0364efede44007d88e11342da138a` during this cleanup. Recheck the production overview before relying on this historical snapshot.

Pushing to the production branch can deploy changes. Do not mix cleanup or experimental migrations into a production release without verifying their scope.

## Backend verification

Run `node --test scripts/test-agent-backend.cjs scripts/test-workspace-data.mjs`, `node scripts/crm-agent-check.cjs`, and `npm run build`. Tests use mocked provider/model calls; they do not send messages or incur model charges.

The agent uses a scoped read-only catalog for 20 business/personal resources and existing action tools for writes. Model defaults are retained; `OPENAI_MODEL` and `OPENAI_MINI_MODEL` can override them. Routing no longer calls a classifier. Usage is shared across web and WhatsApp and includes both model tiers.

Historical SQL migrations are retained for reproducibility. No new migration, worker, or webhook secret is required for this backend update. Scheduled reminders retain their email path; WhatsApp template-based outreach is not configured by this cleanup.
