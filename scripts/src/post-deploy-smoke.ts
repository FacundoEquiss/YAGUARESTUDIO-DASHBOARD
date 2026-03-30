interface CheckResult {
  name: string;
  ok: boolean;
  details: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function normalizeApiBase(rawUrl: string): string {
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

async function runCheck(name: string, fn: () => Promise<string>): Promise<CheckResult> {
  try {
    const details = await fn();
    return { name, ok: true, details };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return { name, ok: false, details };
  }
}

async function assertOk(response: Response, context: string): Promise<Response> {
  if (!response.ok) {
    throw new Error(`${context} failed with status ${response.status}`);
  }
  return response;
}

async function main(): Promise<void> {
  const frontendUrl = getRequiredEnv("SMOKE_FRONTEND_URL").replace(/\/+$/, "");
  const apiBase = normalizeApiBase(getRequiredEnv("SMOKE_API_URL"));
  const smokeEmail = getOptionalEnv("SMOKE_EMAIL");
  const smokePassword = getOptionalEnv("SMOKE_PASSWORD");

  const checks: CheckResult[] = [];

  checks.push(
    await runCheck("frontend_root", async () => {
      const response = await assertOk(
        await fetch(frontendUrl, { redirect: "manual" }),
        "Frontend root",
      );
      return `status ${response.status}`;
    }),
  );

  checks.push(
    await runCheck("api_healthz", async () => {
      const response = await assertOk(await fetch(`${apiBase}/healthz`), "API healthz");
      const payload = await response.json() as { status?: string };
      if (payload.status !== "ok") {
        throw new Error(`Unexpected payload: ${JSON.stringify(payload)}`);
      }
      return JSON.stringify(payload);
    }),
  );

  checks.push(
    await runCheck("api_healthz_db", async () => {
      const response = await assertOk(await fetch(`${apiBase}/healthz/db`), "API healthz/db");
      const payload = await response.json() as { status?: string; database?: string };
      if (payload.status !== "ok" || payload.database !== "ok") {
        throw new Error(`Unexpected payload: ${JSON.stringify(payload)}`);
      }
      return JSON.stringify(payload);
    }),
  );

  checks.push(
    await runCheck("subscription_plans", async () => {
      const response = await assertOk(await fetch(`${apiBase}/subscription/plans`), "Subscription plans");
      const payload = await response.json() as { plans?: unknown[] };
      if (!Array.isArray(payload.plans) || payload.plans.length === 0) {
        throw new Error("Expected at least one active plan");
      }
      return `${payload.plans.length} plans`;
    }),
  );

  if (smokeEmail && smokePassword) {
    checks.push(
      await runCheck("auth_login", async () => {
        const response = await assertOk(
          await fetch(`${apiBase}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: smokeEmail, password: smokePassword }),
          }),
          "Auth login",
        );

        const cookieHeader = response.headers.get("set-cookie");
        if (!cookieHeader) {
          throw new Error("Login response did not return a session cookie");
        }

        const meResponse = await assertOk(
          await fetch(`${apiBase}/auth/me`, {
            headers: {
              Cookie: cookieHeader,
            },
          }),
          "Auth me",
        );

        const payload = await meResponse.json() as { user?: { email?: string } };
        if (payload.user?.email?.toLowerCase() !== smokeEmail.toLowerCase()) {
          throw new Error(`Unexpected authenticated user: ${JSON.stringify(payload)}`);
        }

        return payload.user.email ?? "authenticated";
      }),
    );
  }

  const failed = checks.filter((check) => !check.ok);

  for (const check of checks) {
    const prefix = check.ok ? "[OK]" : "[FAIL]";
    console.log(`${prefix} ${check.name} - ${check.details}`);
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
