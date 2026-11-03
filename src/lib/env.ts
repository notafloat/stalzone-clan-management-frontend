import "server-only";

export const APP_URL = process.env.APP_URL!;
export const EXBO_OAUTH_URL =
  process.env.EXBO_OAUTH_URL ?? "https://exbo.net/oauth";
export const EXBO_CLIENT_ID = process.env.EXBO_CLIENT_ID!;
export const EXBO_CLIENT_SECRET = process.env.EXBO_CLIENT_SECRET!;
export const STALZONE_API_URL =
  process.env.STALZONE_API_URL ?? "https://eapi.stalzone.com";
export const SESSION_SECRET = process.env.SESSION_SECRET;
export const DATABASE_URL = process.env.DATABASE_URL;
export const CRON_SECRET = process.env.CRON_SECRET;
