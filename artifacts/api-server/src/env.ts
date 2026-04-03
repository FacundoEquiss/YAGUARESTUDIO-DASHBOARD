function isHostedEnvironment(source: NodeJS.ProcessEnv): boolean {
  return (
    source.NODE_ENV === "production" ||
    source.RAILWAY_ENVIRONMENT_NAME !== undefined ||
    source.RAILWAY_PUBLIC_DOMAIN !== undefined ||
    source.RENDER !== undefined
  );
}

function readEnv(source: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = source[name];
  if (value === undefined) return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePort(rawPort?: string): number {
  if (!rawPort) return 8080;

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  return port;
}

export interface RuntimeEnv {
  isHosted: boolean;
  port: number;
  databaseUrl?: string;
  jwtSecret?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  frontendUrl?: string;
  masterEmail?: string;
  masterPassword?: string;
  masterName: string;
  mpAccessToken?: string;
  mpWebhookSecret?: string;
  mpStandardPlanId?: string;
  mpPremiumPlanId?: string;
  warnings: string[];
}

export function buildRuntimeEnv(source: NodeJS.ProcessEnv = process.env): RuntimeEnv {
  const isHosted = isHostedEnvironment(source);
  const warnings: string[] = [];
  const errors: string[] = [];

  const runtimeEnv: RuntimeEnv = {
    isHosted,
    port: parsePort(readEnv(source, "PORT")),
    databaseUrl: readEnv(source, "DATABASE_URL"),
    jwtSecret: readEnv(source, "JWT_SECRET"),
    supabaseUrl: readEnv(source, "SUPABASE_URL"),
    supabaseAnonKey: readEnv(source, "SUPABASE_ANON_KEY"),
    frontendUrl: readEnv(source, "FRONTEND_URL"),
    masterEmail: readEnv(source, "MASTER_EMAIL"),
    masterPassword: readEnv(source, "MASTER_PASSWORD"),
    masterName: readEnv(source, "MASTER_NAME") ?? "YAGUAR ESTUDIO",
    mpAccessToken: readEnv(source, "MP_ACCESS_TOKEN"),
    mpWebhookSecret: readEnv(source, "MP_WEBHOOK_SECRET"),
    mpStandardPlanId: readEnv(source, "MP_STANDARD_PLAN_ID"),
    mpPremiumPlanId: readEnv(source, "MP_PREMIUM_PLAN_ID"),
    warnings,
  };

  if (!runtimeEnv.databaseUrl) {
    errors.push("DATABASE_URL is required.");
  }

  if (!runtimeEnv.jwtSecret) {
    errors.push("JWT_SECRET is required.");
  }

  if (isHosted && !runtimeEnv.frontendUrl) {
    errors.push("FRONTEND_URL is required in production to restrict CORS.");
  }

  if (Boolean(runtimeEnv.masterEmail) !== Boolean(runtimeEnv.masterPassword)) {
    errors.push("MASTER_EMAIL and MASTER_PASSWORD must be configured together.");
  }

  if (isHosted && !runtimeEnv.mpAccessToken) {
    warnings.push("MP_ACCESS_TOKEN is missing. Paid subscription checkout and sync will fail.");
  }

  if (isHosted && !runtimeEnv.mpWebhookSecret) {
    warnings.push("MP_WEBHOOK_SECRET is missing. Mercado Pago webhooks will not be verified.");
  }

  if (isHosted && !runtimeEnv.mpStandardPlanId) {
    warnings.push("MP_STANDARD_PLAN_ID is missing. Standard paid checkout will be unavailable.");
  }

  if (isHosted && !runtimeEnv.mpPremiumPlanId) {
    warnings.push("MP_PREMIUM_PLAN_ID is missing. Premium paid checkout will be unavailable.");
  }

  if (isHosted && !runtimeEnv.supabaseUrl) {
    warnings.push("SUPABASE_URL is missing. Supabase Auth sync endpoint will be unavailable.");
  }

  if (isHosted && !runtimeEnv.supabaseAnonKey) {
    warnings.push("SUPABASE_ANON_KEY is missing. Supabase Auth sync endpoint will be unavailable.");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid server environment:\n- ${errors.join("\n- ")}`);
  }

  return runtimeEnv;
}

export const env = buildRuntimeEnv();

export function logStartupWarnings(): void {
  for (const warning of env.warnings) {
    console.warn(`[config warning] ${warning}`);
  }
}
