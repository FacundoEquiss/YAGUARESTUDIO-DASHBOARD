import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildMercadoPagoSignatureManifest,
  computeMercadoPagoSignature,
  getMercadoPagoResourceId,
  parseMercadoPagoSignatureHeader,
  verifyMercadoPagoWebhookSignature,
} from "./mercadopago-webhook";

async function runCase(name: string, fn: () => void | Promise<void>) {
  await fn();
  console.log(`  [ok] ${name}`);
}

const webhookCases: Array<[string, () => void | Promise<void>]> = [
  ["parseMercadoPagoSignatureHeader extracts ts and v1", () => {
    const result = parseMercadoPagoSignatureHeader("ts=1710000000,v1=ABC123");

    assert.deepEqual(result, {
      ts: "1710000000",
      v1: "abc123",
    });
  }],
  ["buildMercadoPagoSignatureManifest lowercases alphanumeric data ids", () => {
    const manifest = buildMercadoPagoSignatureManifest({
      dataId: "ABC123XYZ",
      requestId: "request-123",
      ts: "1710000000",
    });

    assert.equal(
      manifest,
      "id:abc123xyz;request-id:request-123;ts:1710000000;",
    );
  }],
  ["buildMercadoPagoSignatureManifest omits missing values", () => {
    const manifest = buildMercadoPagoSignatureManifest({
      requestId: "request-123",
      ts: "1710000000",
    });

    assert.equal(manifest, "request-id:request-123;ts:1710000000;");
  }],
  ["verifyMercadoPagoWebhookSignature accepts a valid signature", () => {
    const secret = "super-secret";
    const manifest = buildMercadoPagoSignatureManifest({
      dataId: "PreApprovalABC",
      requestId: "req-123",
      ts: "1710000000",
    });
    const signature = computeMercadoPagoSignature(secret, manifest);

    const result = verifyMercadoPagoWebhookSignature({
      secret,
      header: `ts=1710000000,v1=${signature}`,
      headers: { "x-request-id": "req-123" },
      query: { "data.id": "PreApprovalABC" },
    });

    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(result.manifest, manifest);
      assert.equal(result.expectedSignature, signature);
    }
  }],
  ["verifyMercadoPagoWebhookSignature rejects a mismatched signature", () => {
    const result = verifyMercadoPagoWebhookSignature({
      secret: "super-secret",
      header: "ts=1710000000,v1=0123456789abcdef",
      headers: { "x-request-id": "req-123" },
      query: { "data.id": "preapproval123" },
    });

    assert.deepEqual(result, {
      valid: false,
      reason: "signature_mismatch",
    });
  }],
  ["getMercadoPagoResourceId falls back from body to query", () => {
    assert.equal(
      getMercadoPagoResourceId({
        body: { data: { id: "body-id" } },
        query: { "data.id": "query-id" },
      }),
      "body-id",
    );

    assert.equal(
      getMercadoPagoResourceId({
        query: { "data.id": "query-id" },
      }),
      "query-id",
    );
  }],
];

export default async function runMercadoPagoWebhookTests(): Promise<void> {
  for (const [name, fn] of webhookCases) {
    await runCase(name, fn);
  }
}

describe("mercadopago-webhook", () => {
  for (const [name, fn] of webhookCases) {
    it(name, async () => {
      await fn();
    });
  }
});
