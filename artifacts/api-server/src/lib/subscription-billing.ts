import { db, subscriptionPlans, userSubscriptions } from "@workspace/db";
import type { SubscriptionPlan } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { mpPreApproval } from "./mercadopago";

const EXTERNAL_REFERENCE_PREFIX = "subscription";

const PREAPPROVAL_PLANS: Record<string, string> = {
  standard: "8b039046a1c04525ae701638863d2217",
  premium: "334e828403a245d89b4dc0f24bd6e458",
};

export interface MercadoPagoCheckoutResult {
  id: string;
  initPoint: string;
}

export interface SubscriptionSyncResult {
  userId: number;
  planSlug: string;
  mpSubscriptionId: string;
  mpStatus: string;
  localStatus: string;
  skipped?: boolean;
}

function normalizeOrigin(origin: string): string {
  const trimmed = origin.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) {
    throw new Error("FRONTEND_URL contiene un origen vacío");
  }

  const candidate = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(candidate).origin;
}

function getPrimaryFrontendOrigin(): string {
  const origin = (process.env.FRONTEND_URL || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
    .map(normalizeOrigin)[0];

  if (!origin) {
    throw new Error("FRONTEND_URL must be configured to create subscription checkout links");
  }

  return origin;
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
  const token = process.env.MP_ACCESS_TOKEN?.trim();

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

  const { userId, email, plan } = args;

  if (plan.price <= 0) {
    throw new Error("El plan gratuito no requiere checkout");
  }

  const preapprovalPlanId = PREAPPROVAL_PLANS[plan.slug];
  if (!preapprovalPlanId) {
    throw new Error(`El plan '${plan.name}' aún no está asociado a Mercado Pago.`);
  }

  const response = await mpPreApproval.create({
    body: {
      reason: `${plan.name} - Yaguar Estudio`,
      payer_email: email,
      external_reference: buildSubscriptionExternalReference(userId, plan.slug),
      back_url: `${getPrimaryFrontendOrigin()}/profile?billing=returned`,
      preapproval_plan_id: preapprovalPlanId,
      status: "pending",
    },
  });

  if (!response.id || !response.init_point) {
    throw new Error("Mercado Pago no devolvió una URL de checkout válida");
  }

  return {
    id: response.id,
    initPoint: response.init_point,
  };
}

export async function syncMercadoPagoPreapprovalById(
  preapprovalId: string,
  options?: { notificationId?: string },
): Promise<SubscriptionSyncResult> {
  assertMercadoPagoConfigured();

  const response = await mpPreApproval.get({ id: preapprovalId });
  const parsedReference = parseSubscriptionExternalReference(response.external_reference);

  if (!parsedReference) {
    throw new Error(`External reference inválida para la suscripción ${preapprovalId}`);
  }

  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.slug, parsedReference.planSlug));

  if (!plan) {
    throw new Error(`Plan no encontrado para slug ${parsedReference.planSlug}`);
  }

  const [existing] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, parsedReference.userId));

  const notificationId = options?.notificationId;
  if (existing?.mpLastEventId && notificationId && existing.mpLastEventId === notificationId) {
    return {
      userId: parsedReference.userId,
      planSlug: parsedReference.planSlug,
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
      userId: parsedReference.userId,
      planSlug: parsedReference.planSlug,
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
      userId: parsedReference.userId,
      planId: plan.id,
      status: localStatus,
      currentPeriodStart,
      currentPeriodEnd,
      ...baseUpdate,
    });
  }

  return {
    userId: parsedReference.userId,
    planSlug: parsedReference.planSlug,
    mpSubscriptionId,
    mpStatus,
    localStatus,
  };
}
