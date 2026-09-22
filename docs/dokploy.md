# WACRM + self-hosted Supabase on Dokploy

`docker-compose.dokploy.yml` deploys the complete stack in one Dokploy Compose
project: WACRM, Postgres, Auth, REST, Realtime, Storage, Studio, image proxy,
Edge Functions, API gateway, and an automatic WACRM migration job.

The Supabase configuration and image versions are pinned to the official
`self-hosted/v0.8.1` release. Postgres and Storage use named Docker volumes, so
normal redeploys do not delete production data.

## 1. DNS

Create two DNS records pointing to the Dokploy server:

- `crm.example.com` for WACRM
- `supabase.example.com` for the Supabase API and protected Studio

Postgres and all other internal services are not exposed publicly.

## 2. Generate the environment

Run locally, replacing the URLs and Gmail address:

```bash
node scripts/generate-dokploy-env.mjs \
  https://crm.example.com \
  https://supabase.example.com \
  admin@example.com
```

Paste the complete output into Dokploy's Environment editor. Replace only:

- `META_APP_SECRET=PASTE_META_APP_SECRET`
- `SMTP_PASS=PASTE_GOOGLE_APP_PASSWORD`

The generated `ANON_KEY`, `SERVICE_ROLE_KEY`, database password, Studio
password, JWT secret, and encryption keys belong together. Save one secure
backup and never commit the generated environment to Git.

## 3. Deploy

1. Select this Git repository and the `main` branch.
2. Set Compose path to `./docker-compose.dokploy.yml`.
3. Paste the generated environment and deploy.
4. In Dokploy Domains, route the CRM hostname to service `app`, port `3000`.
5. Route the Supabase hostname to service `api-gw`, port `8000`.
6. Enable HTTPS for both domains.

The one-shot `migrate` service applies every `supabase/migrations/*.sql` file
in order. It records successful filenames and safely skips them on later
deploys. The WACRM app starts only after the database is healthy, migrations
finish, and the Supabase gateway is healthy.

## 4. Security and first user

Public signup is closed in both WACRM and Supabase (`DISABLE_SIGNUP=true`).
After the stack is healthy, create the first production user from the protected
Supabase Studio Auth page. Do not expose database ports or share the
`SERVICE_ROLE_KEY`.

The Supabase hostname opens Studio at `/` using `DASHBOARD_USERNAME` and
`DASHBOARD_PASSWORD`; its APIs remain available below `/auth/v1`, `/rest/v1`,
`/realtime/v1`, `/storage/v1`, and `/functions/v1`.

## 5. Verification

- `https://crm.example.com/api/health` returns `{ "status": "ok" }`.
- `https://supabase.example.com/auth/v1/health` returns a healthy response.
- `/signup` redirects to `/login`.
- Dokploy shows `migrate` as successfully exited and the long-running services
  as healthy.
- Meta webhook URL is
  `https://crm.example.com/api/whatsapp/webhook`.

Back up the `db-data` and `storage-data` volumes. Replacing `JWT_SECRET`, API
keys, `POSTGRES_PASSWORD`, or `ENCRYPTION_KEY` after first deployment can break
sessions, database access, or saved WhatsApp credentials.
