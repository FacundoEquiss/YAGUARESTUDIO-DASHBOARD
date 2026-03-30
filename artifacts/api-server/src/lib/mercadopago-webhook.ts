import crypto from "crypto";

export interface MercadoPagoSignatureParts {
  ts?: string;
  v1?: string;
}

export type MercadoPagoSignatureValidationResult =
  | {
      valid: true;
      manifest: string;
      expectedSignature: string;
      signature: MercadoPagoSignatureParts;
    }
  | {
      valid: false;
      reason:
        | "missing_secret"
        | "missing_signature"
        | "invalid_signature_header"
        | "missing_ts"
        | "missing_v1"
        | "missing_request_id"
        | "signature_mismatch";
    };

function normalizeScalar(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;

  if (Array.isArray(value)) {
    return normalizeScalar(value[0]);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  return undefined;
}

function getNestedValue(source: unknown, path: string[]): unknown {
  let current = source;

  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

export function getQueryValue(query: unknown, key: string): string | undefined {
  if (!query || typeof query !== "object") return undefined;

  const record = query as Record<string, unknown>;
  const direct = normalizeScalar(record[key]);
  if (direct) return direct;

  if (!key.includes(".")) return undefined;

  return normalizeScalar(getNestedValue(record, key.split(".")));
}

export function parseMercadoPagoSignatureHeader(
  header: string | string[] | undefined,
): MercadoPagoSignatureParts | null {
  const rawHeader = normalizeScalar(header);
  if (!rawHeader) return null;

  const parts = rawHeader
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  const signature: MercadoPagoSignatureParts = {};

  for (const part of parts) {
    const [rawKey, rawValue] = part.split("=", 2);
    const key = rawKey?.trim().toLowerCase();
    const value = rawValue?.trim();

    if (!key || !value) continue;

    if (key === "ts") signature.ts = value;
    if (key === "v1") signature.v1 = value.toLowerCase();
  }

  return signature.ts || signature.v1 ? signature : null;
}

export function normalizeMercadoPagoSignatureDataId(dataId?: string): string | undefined {
  if (!dataId) return undefined;
  return /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
}

export function buildMercadoPagoSignatureManifest(input: {
  dataId?: string;
  requestId?: string;
  ts?: string;
}): string {
  const parts: string[] = [];
  const normalizedDataId = normalizeMercadoPagoSignatureDataId(input.dataId);

  if (normalizedDataId) parts.push(`id:${normalizedDataId};`);
  if (input.requestId) parts.push(`request-id:${input.requestId};`);
  if (input.ts) parts.push(`ts:${input.ts};`);

  return parts.join("");
}

export function computeMercadoPagoSignature(secret: string, manifest: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");
}

export function getMercadoPagoRequestId(headers: unknown): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;

  const record = headers as Record<string, unknown>;
  return normalizeScalar(record["x-request-id"] ?? record["X-Request-Id"]);
}

export function getMercadoPagoSignatureDataId(query: unknown): string | undefined {
  return getQueryValue(query, "data.id");
}

export function getMercadoPagoResourceId(input: {
  query?: unknown;
  body?: unknown;
}): string | undefined {
  const body = input.body as {
    id?: string | number;
    data?: { id?: string | number };
  } | undefined;

  const fromBodyData = normalizeScalar(body?.data?.id);
  if (fromBodyData) return fromBodyData;

  const fromBodyId = normalizeScalar(body?.id);
  if (fromBodyId) return fromBodyId;

  const fromQueryData = getMercadoPagoSignatureDataId(input.query);
  if (fromQueryData) return fromQueryData;

  return getQueryValue(input.query, "id");
}

export function verifyMercadoPagoWebhookSignature(input: {
  secret?: string;
  header: string | string[] | undefined;
  headers: unknown;
  query: unknown;
}): MercadoPagoSignatureValidationResult {
  if (!input.secret) {
    return { valid: false, reason: "missing_secret" };
  }

  const signature = parseMercadoPagoSignatureHeader(input.header);
  if (!signature) {
    return { valid: false, reason: "missing_signature" };
  }

  if (!signature.ts && !signature.v1) {
    return { valid: false, reason: "invalid_signature_header" };
  }

  if (!signature.ts) {
    return { valid: false, reason: "missing_ts" };
  }

  if (!signature.v1) {
    return { valid: false, reason: "missing_v1" };
  }

  const requestId = getMercadoPagoRequestId(input.headers);
  if (!requestId) {
    return { valid: false, reason: "missing_request_id" };
  }

  const manifest = buildMercadoPagoSignatureManifest({
    dataId: getMercadoPagoSignatureDataId(input.query),
    requestId,
    ts: signature.ts,
  });

  const expectedSignature = computeMercadoPagoSignature(input.secret, manifest);
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(signature.v1, "hex");

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return { valid: false, reason: "signature_mismatch" };
  }

  return {
    valid: true,
    manifest,
    expectedSignature,
    signature,
  };
}
