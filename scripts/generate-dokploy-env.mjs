import { createHmac, randomBytes } from "node:crypto";

const [siteUrl, supabaseUrl, smtpEmail = "admin@example.com"] =
  process.argv.slice(2);

if (!siteUrl || !supabaseUrl) {
  console.error(
    "Usage: node scripts/generate-dokploy-env.mjs <crm-url> <supabase-url> [smtp-email]",
  );
  process.exit(1);
}

const clean = (value) => value.replace(/\/$/, "");
const site = clean(siteUrl);
const supabase = clean(supabaseUrl);
const hex = (bytes) => randomBytes(bytes).toString("hex");
const b64 = (bytes) => randomBytes(bytes).toString("base64url");
const base64url = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwtSecret = b64(48);
const now = Math.floor(Date.now() / 1000);
const expires = now + 10 * 365 * 24 * 60 * 60;

function sign(role) {
  const header = base64url({ alg: "HS256", typ: "JWT" });
  const payload = base64url({ role, iss: "supabase", iat: now, exp: expires });
  const signature = createHmac("sha256", jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

const env = {
  SITE_URL: site,
  ADDITIONAL_REDIRECT_URLS: `${site}/**`,
  SUPABASE_PUBLIC_URL: supabase,
  API_EXTERNAL_URL: `${supabase}/auth/v1`,
  NEXT_PUBLIC_APP_LOCALE: "en",
  NEXT_PUBLIC_SIGNUP_ENABLED: "false",
  ENCRYPTION_KEY: hex(32),
  META_APP_SECRET: "PASTE_META_APP_SECRET",
  ALLOWED_INVITE_HOSTS: new URL(site).hostname,
  POSTGRES_PASSWORD: b64(36),
  POSTGRES_DB: "postgres",
  POSTGRES_PORT: "5432",
  JWT_SECRET: jwtSecret,
  JWT_EXPIRY: "3600",
  ANON_KEY: sign("anon"),
  SERVICE_ROLE_KEY: sign("service_role"),
  SECRET_KEY_BASE: b64(48),
  REALTIME_DB_ENC_KEY: hex(8),
  PG_META_CRYPTO_KEY: b64(32),
  S3_PROTOCOL_ACCESS_KEY_ID: hex(16),
  S3_PROTOCOL_ACCESS_KEY_SECRET: hex(32),
  DASHBOARD_USERNAME: "supabase",
  DASHBOARD_PASSWORD: b64(24),
  STUDIO_DEFAULT_ORGANIZATION: "WACRM",
  STUDIO_DEFAULT_PROJECT: "WACRM Production",
  DISABLE_SIGNUP: "true",
  SMTP_ADMIN_EMAIL: smtpEmail,
  SMTP_HOST: "smtp.gmail.com",
  SMTP_PORT: "587",
  SMTP_USER: smtpEmail,
  SMTP_PASS: "PASTE_GOOGLE_APP_PASSWORD",
  SMTP_SENDER_NAME: "WACRM",
  PGRST_DB_SCHEMAS: "public,graphql_public",
  PGRST_DB_MAX_ROWS: "1000",
  PGRST_DB_EXTRA_SEARCH_PATH: "public",
};

for (const [key, value] of Object.entries(env)) {
  console.log(`${key}=${value}`);
}
