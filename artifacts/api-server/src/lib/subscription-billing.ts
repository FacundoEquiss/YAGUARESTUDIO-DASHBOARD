import { db, subscriptionPlans, userSubscriptions, users } from "@workspace/db";
import type { SubscriptionPlan } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { mpPreApproval } from "./mercadopago";
import { env } from "../env";

const EXTERNAL_REFERENCE_PREFIX = "subscription";

const DEFAULT_PREAPPROVAL_PLAN_INPUTS: Record<string, string> = {
  standard: "8b039046a1c04525ae701638863d2217",
  premium: "334e828403a245d89b4dc0f24bd6e458",
};

export interface MercadoPagoCheckoutResult {
  id?: string;
  initPoint: string;
  mode: "hosted_plan" | "preapproval";
}

export interface SubscriptionSyncResult {
  userId: number;
  planSlug: string;
  mpSubscriptionId: string;
  mpStatus: string;
  localStatus: string;
  skipped?: boolean;
}

function extractPlanIdFromInput(value?: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  if (!normalized.includes("://")) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    return parsed.searchParams.get("preapproval_plan_id")?.trim() || null;
  } catch {
    return null;
  }
}

function buildHostedPlanUrl(planId: string): string {
  return `https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=${planId}`;
}

function getPlanConfig(planSlug: string) {
  const envKey = planSlug === "standard"
    ? "MP_STANDARD_PLAN_ID"
    : planSlug === "premium"
      ? "MP_PREMIUM_PLAN_ID"
      : null;

  const configuredValue = envKey === "MP_STANDARD_PLAN_ID"
    ? env.mpStandardPlanId
    : envKey === "MP_PREMIUM_PLAN_ID"
      ? env.mpPremiumPlanId
      : undefined;
  const fallbackValue = !env.isHosted ? DEFAULT_PREAPPROVAL_PLAN_INPUTS[planSlug] : undefined;

  const id = extractPlanIdFromInput(configuredValue || fallbackValue);
  if (!id) return null;

  return {
    id,
    initPoint: buildHostedPlanUrl(id),
  };
}

function resolvePlanSlugFromPlanId(preapprovalPlanId?: string | null): string | null {
  if (!preapprovalPlanId) return null;

  const supportedSlugs = ["standard", "premium"];
  for (const slug of supportedSlugs) {
    const config = getPlanConfig(slug);
    if (config?.id === preapprovalPlanId) {
      return slug;
    }
  }

  return null;
}

export function buildSubscriptionExternalReference(userId: number, planSlug: string): string {
  return `${EXTERNAL_REFERENCE_PREFIX}:user:${userId}:plan:${planSlug}`;
}

export function parseSubscriptionExternalReference(reference?: string | null): {
  userId: number;
  planSlug: string;
} | null {
  if (!reference) return null;

  const match = reference.match(/^subscription:user:(\d+):plan:([a-z0-9_-]+)$/i);
  if (!match) return null;

  return {
    userId: Number(match[1]),
    planSlug: match[2],
  };
}

function mapMpStatusToLocalStatus(mpStatus?: string | null): string {
  const normalized = (mpStatus || "").toLowerCase();

  if (normalized === "authorized" || normalized === "active") {
    return "active";
  }

  if (normalized === "paused") {
    return "paused";
  }

  if (normalized === "cancelled" || normalized === "cancelled_by_user") {
    return "cancelled";
  }

  return "pending";
}

function resolvePeriodEnd(nextPaymentDate?: string | null): Date {
  if (nextPaymentDate) {
    const parsed = new Date(nextPaymentDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const fallback = new Date();
  fallback.setMonth(fallback.getMonth() + 1);
  return fallback;
}

function assertMercadoPagoConfigured() {
  const token = env.mpAccessToken;

  if (!token) {
    throw new Error("MP_ACCESS_TOKEN no está configurado");
  }

  if (token.includes("xxxx") || token.startsWith("your_")) {
    throw new Error("MP_ACCESS_TOKEN parece seguir siendo un placeholder y no un token real");
  }
}

export function getMercadoPagoErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  const maybeObject = error as {
    message?: string;
    cause?: { message?: string };
    response?: { data?: { message?: string } };
    api_response?: { message?: string };
  } | null;

  return (
    maybeObject?.response?.data?.message ||
    maybeObject?.api_response?.message ||
    maybeObject?.cause?.message ||
    maybeObject?.message ||
    "No se pudo iniciar el checkout con Mercado Pago"
  );
}

export async function createMercadoPagoSubscriptionCheckout(args: {
  userId: number;
  email: string;
  plan: SubscriptionPlan;
}): Promise<MercadoPagoCheckoutResult> {
  assertMercadoPagoConfigured();

  const { plan } = args;

  if (plan.price <= 0) {
    throw new Error("El plan gratuito no requiere checkout");
  }

  const planConfig = getPlanConfig(plan.slug);
  if (!planConfig) {
    throw new Error(`El plan '${plan.name}' aún no está asociado a Mercado Pago.`);
  }

  return {
    initPoint: planConfig.initPoint,
    mode: "hosted_plan",
  };
}

export async function syncMercadoPagoPreapprovalById(
  preapprovalId: string,
  options?: { notificationId?: string },
): Promise<SubscriptionSyncResult> {
  assertMercadoPagoConfigured();

  const response = await mpPreApproval.get({ id: preapprovalId }) as Awaited<ReturnType<typeof mpPreApproval.get>> & {
    preapproval_plan_id?: string | null;
    payer_email?: string | null;
  };
  const parsedReference = parseSubscriptionExternalReference(response.external_reference);
  const payerEmail = response.payer_email?.trim().toLowerCase() || null;
  const fallbackPlanSlug = resolvePlanSlugFromPlanId(response.preapproval_plan_id);

  let userId = parsedReference?.userId ?? null;
  let planSlug = parsedReference?.planSlug ?? fallbackPlanSlug ?? null;

  if (!userId && payerEmail) {
    const [matchedUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, payerEmail));

    userId = matchedUser?.id ?? null;
  }

  if (!userId || !planSlug) {
    throw new Error(`No se pudo vincular la suscripción ${preapprovalId} con un usuario o plan local`);
  }

  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.slug, planSlug));

  if (!plan) {
    throw new Error(`Plan no encontrado para slug ${planSlug}`);
  }

  const [existing] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  const notificationId = options?.notificationId;
  if (existing?.mpLastEventId && notificationId && existing.mpLastEventId === notificationId) {
    return {
      userId,
      planSlug,
      mpSubscriptionId: response.id || preapprovalId,
      mpStatus: (response.status || "pending").toLowerCase(),
      localStatus: existing.status,
      skipped: true,
    };
  }

  const mpStatus = (response.status || "pending").toLowerCase();
  const localStatus = mapMpStatusToLocalStatus(mpStatus);
  const mpSubscriptionId = response.id || preapprovalId;

  const baseUpdate = {
    mpSubscriptionId,
    mpLastEventId: notificationId || existing?.mpLastEventId || mpSubscriptionId,
  };

  if (localStatus !== "active") {
    if (existing) {
      const shouldUpdateStatus = existing.mpSubscriptionId === mpSubscriptionId && existing.status !== localStatus;

      await db
        .update(userSubscriptions)
        .set(shouldUpdateStatus ? { ...baseUpdate, status: localStatus } : baseUpdate)
        .where(eq(userSubscriptions.id, existing.id));
    }

    return {
      userId,
      planSlug,
      mpSubscriptionId,
      mpStatus,
      localStatus,
    };
  }

  const currentPeriodStart = new Date();
  const currentPeriodEnd = resolvePeriodEnd(response.next_payment_date);

  if (existing) {
    await db
      .update(userSubscriptions)
      .set({
        ...baseUpdate,
        planId: plan.id,
        status: localStatus,
        currentPeriodStart,
        currentPeriodEnd,
      })
      .where(eq(userSubscriptions.id, existing.id));
  } else {
    await db.insert(userSubscriptions).values({
      userId,
      planId: plan.id,
      status: localStatus,
      currentPeriodStart,
      currentPeriodEnd,
      ...baseUpdate,
    });
  }

  return {
    userId,
    planSlug,
    mpSubscriptionId,
    mpStatus,
    localStatus,
  };
}
