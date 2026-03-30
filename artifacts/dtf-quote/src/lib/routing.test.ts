import assert from "node:assert/strict";
import { getProtectedRedirectTarget, sanitizeNextPath } from "./routing";

async function runCase(name: string, fn: () => void | Promise<void>) {
  await fn();
  console.log(`  [ok] ${name}`);
}

export default async function runRoutingTests(): Promise<void> {
  await runCase("sanitizeNextPath keeps safe internal routes", () => {
    assert.equal(sanitizeNextPath("/orders"), "/orders");
    assert.equal(sanitizeNextPath("/orders?status=pending"), "/orders?status=pending");
  });

  await runCase("sanitizeNextPath rejects unsafe values", () => {
    assert.equal(sanitizeNextPath(null), "/dashboard");
    assert.equal(sanitizeNextPath("https://evil.example"), "/dashboard");
    assert.equal(sanitizeNextPath("//evil.example"), "/dashboard");
  });

  await runCase("getProtectedRedirectTarget only preserves known private routes", () => {
    assert.equal(getProtectedRedirectTarget("/clients"), "/auth?next=%2Fclients");
    assert.equal(getProtectedRedirectTarget("/made-up"), "/auth?next=%2Fdashboard");
  });
}
