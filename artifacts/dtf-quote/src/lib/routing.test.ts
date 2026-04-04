import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { getProtectedRedirectTarget, sanitizeNextPath } from "./routing";

async function runCase(name: string, fn: () => void | Promise<void>) {
  await fn();
  console.log(`  [ok] ${name}`);
}

const routingCases: Array<[string, () => void | Promise<void>]> = [
  ["sanitizeNextPath keeps safe internal routes", () => {
    assert.equal(sanitizeNextPath("/orders"), "/orders");
    assert.equal(sanitizeNextPath("/orders?status=pending"), "/orders?status=pending");
  }],
  ["sanitizeNextPath rejects unsafe values", () => {
    assert.equal(sanitizeNextPath(null), "/dashboard");
    assert.equal(sanitizeNextPath("https://evil.example"), "/dashboard");
    assert.equal(sanitizeNextPath("//evil.example"), "/dashboard");
  }],
  ["getProtectedRedirectTarget only preserves known private routes", () => {
    assert.equal(getProtectedRedirectTarget("/clients"), "/auth?next=%2Fclients");
    assert.equal(getProtectedRedirectTarget("/made-up"), "/auth?next=%2Fdashboard");
    assert.equal(getProtectedRedirectTarget("/"), "/auth?next=%2Fdashboard");
  }],
];

export default async function runRoutingTests(): Promise<void> {
  for (const [name, fn] of routingCases) {
    await runCase(name, fn);
  }
}

describe("routing", () => {
  for (const [name, fn] of routingCases) {
    it(name, async () => {
      await fn();
    });
  }
});
