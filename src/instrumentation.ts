import { findEnvProblems } from "@/lib/check-env";

/** Runs once when the server starts. A bad configuration must stop it, not fail later. */
export function register() {
  const problems = findEnvProblems();
  if (problems.length > 0) {
    throw new Error(
      `Invalid configuration, see .env.example:\n- ${problems.join("\n- ")}`,
    );
  }
}
