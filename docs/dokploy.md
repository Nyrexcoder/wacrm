# Deploying WACRM on Dokploy

This repository includes `docker-compose.dokploy.yml` for the WACRM app.
Supabase should be deployed as its own production Docker Compose project (or
use a hosted Supabase project); point WACRM at its public HTTPS API URL.

## 1. Prepare DNS

Create DNS records for two HTTPS hosts, for example:

- `crm.example.com` for WACRM
- `supabase.example.com` for the Supabase API

Do not expose Postgres, Studio, or other Supabase internal ports publicly.

## 2. Configure Supabase first

Apply every SQL file under `supabase/migrations/` in filename order. Configure
Supabase Auth with:

- Site URL: `https://crm.example.com`
- Allowed redirect URL: `https://crm.example.com/**`
- New user signups: disabled

For self-hosted Supabase, set these values on the Auth service:

```env
GOTRUE_SITE_URL=https://crm.example.com
GOTRUE_URI_ALLOW_LIST=https://crm.example.com/**
GOTRUE_DISABLE_SIGNUP=true
```

`GOTRUE_DISABLE_SIGNUP=true` is the security boundary. The WACRM UI also hides
and redirects `/signup`, but disabling it in Supabase prevents direct Auth API
requests from creating users.

Configure SMTP on the Supabase Auth service, not on the WACRM app. Gmail SMTP
can be used initially; keep its app password only in Dokploy's environment.

## 3. Create the WACRM Compose project

In Dokploy:

1. Create a **Docker Compose** project from this Git repository.
2. Set the Compose path to `./docker-compose.dokploy.yml`.
3. Paste the variables from `.env.dokploy.example` into Dokploy's Environment
   editor and replace every placeholder.
4. Deploy the project.
5. In Dokploy Domains, route `crm.example.com` to service `app`, port `3000`,
   with HTTPS enabled.

The Compose file joins Dokploy's external `dokploy-network`; no host port or
database secret is exposed. `NEXT_PUBLIC_*` values are passed at build time,
so changing one requires a rebuild/redeploy. Server-only secrets are injected
only at runtime.

## 4. Production checks

- `https://crm.example.com/api/health` returns `{ "status": "ok" }`.
- `/signup` redirects to `/login`, and the login page has no create-account
  link.
- Existing users can sign in and reset their passwords by email.
- The Supabase Auth settings endpoint reports `disable_signup: true`.
- Set Meta's callback URL to
  `https://crm.example.com/api/whatsapp/webhook`, subscribe to `messages`, and
  use the same verify token saved in WACRM.
- Keep `ENCRYPTION_KEY` backed up. Replacing it makes saved WhatsApp and AI
  provider tokens unreadable.
- Back up the Supabase Postgres data and Storage volumes before upgrades.

To intentionally reopen registration later, set
`NEXT_PUBLIC_SIGNUP_ENABLED=true`, set `GOTRUE_DISABLE_SIGNUP=false`, and
redeploy both services.
