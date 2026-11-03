const MIN_SECRET_LENGTH = 32;

function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Returns what's wrong with the configuration. Only names, never the values. */
export function findEnvProblems(env: NodeJS.ProcessEnv = process.env) {
  const problems: string[] = [];

  for (const name of ["EXBO_CLIENT_ID", "EXBO_CLIENT_SECRET"]) {
    if (!env[name]) problems.push(`${name} is not set`);
  }
  if (!isHttpUrl(env.APP_URL ?? "")) {
    problems.push("APP_URL must be a full http(s) address");
  }
  if ((env.SESSION_SECRET ?? "").length < MIN_SECRET_LENGTH) {
    problems.push(
      `SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  if (env.CRON_SECRET && env.CRON_SECRET.length < MIN_SECRET_LENGTH) {
    problems.push(
      `CRON_SECRET must be at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  return problems;
}
