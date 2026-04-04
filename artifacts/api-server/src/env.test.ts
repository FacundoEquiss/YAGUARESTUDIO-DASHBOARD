import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildRuntimeEnv } from "./env";

async function runCase(name: string, fn: () => void | Promise<void>) {
  await fn();
  console.log(`  [ok] ${name}`);
}

const envCases: Array<[string, () => void | Promise<void>]> = [
  ["buildRuntimeEnv requires critical backend secrets", () => {
    assert.throws(
      () =>
        buildRuntimeEnv({
          PORT: "8080",
        }),
      /DATABASE_URL is required\./,
    );
  }],
  ["buildRuntimeEnv requires FRONTEND_URL in hosted environments", () => {
    assert.throws(
      () =>
        buildRuntimeEnv({
          DATABASE_URL: "postgres://db",
          JWT_SECRET: "secret",
          NODE_ENV: "production",
        }),
      /FRONTEND_URL is required in production to restrict CORS\./,
    );
  }],
  ["buildRuntimeEnv requires SUPABASE_URL in hosted environments", () => {
    assert.throws(
      () =>
        buildRuntimeEnv({
          DATABASE_URL: "postgres://db",
          JWT_SECRET: "secret",
          FRONTEND_URL: "https://app.example.com",
          SUPABASE_ANON_KEY: "anon",
          NODE_ENV: "production",
        }),
      /SUPABASE_URL is required in production for auth\./,
    );
  }],
  ["buildRuntimeEnv requires SUPABASE_ANON_KEY in hosted environments", () => {
    assert.throws(
      () =>
        buildRuntimeEnv({
          DATABASE_URL: "postgres://db",
          JWT_SECRET: "secret",
          FRONTEND_URL: "https://app.example.com",
          SUPABASE_URL: "https://example.supabase.co",
          NODE_ENV: "production",
        }),
      /SUPABASE_ANON_KEY is required in production for auth\./,
    );
  }],
  ["buildRuntimeEnv requires master credentials together", () => {
    assert.throws(
      () =>
        buildRuntimeEnv({
          DATABASE_URL: "postgres://db",
          JWT_SECRET: "secret",
          MASTER_EMAIL: "admin@example.com",
        }),
      /MASTER_EMAIL and MASTER_PASSWORD must be configured together\./,
    );
  }],
  ["buildRuntimeEnv emits hosted warnings for optional Mercado Pago settings", () => {
    const env = buildRuntimeEnv({
      DATABASE_URL: "postgres://db",
      JWT_SECRET: "secret",
      FRONTEND_URL: "https://app.example.com",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      NODE_ENV: "production",
    });

    assert.equal(env.port, 8080);
    assert.equal(env.masterName, "YAGUAR ESTUDIO");
    assert.ok(
      env.warnings.some((warning) => warning.includes("MP_ACCESS_TOKEN is missing")),
    );
    assert.ok(
      env.warnings.some((warning) => warning.includes("MP_WEBHOOK_SECRET is missing")),
    );
  }],
];

export default async function runEnvTests(): Promise<void> {
  for (const [name, fn] of envCases) {
    await runCase(name, fn);
  }
}

describe("env", () => {
  for (const [name, fn] of envCases) {
    it(name, async () => {
      await fn();
    });
  }
});
