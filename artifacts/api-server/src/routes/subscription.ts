import { Router } from "express";
import { db, subscriptionPlans, userSubscriptions, usageCounters } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { PlanLimits } from "@workspace/db/schema";

const subscriptionRouter = Router();

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function getOrResetCounter(userId: number, counterType: string): Promise<number> {
  const monthStart = getMonthStart();
  const [counter] = await db
    .select()
    .from(usageCounters)
    .where(
      and(
        eq(usageCounters.userId, userId),
        eq(usageCounters.counterType, counterType)
      )
    );

  if (!counter) {
    await db.insert(usageCounters).values({
      userId,
      counterType,
      count: 0,
      periodStart: monthStart,
    });
    return 0;
  }

  if (counter.periodStart < monthStart) {
    await db
      .update(usageCounters)
      .set({ count: 0, periodStart: monthStart })
      .where(eq(usageCounters.id, counter.id));
    return 0;
  }

  return counter.count;
}

subscriptionRouter.get("/subscription", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const [sub] = await db
      .select({
        planId: subscriptionPlans.id,
        planName: subscriptionPlans.name,
        planSlug: subscriptionPlans.slug,
        limits: subscriptionPlans.limits,
        price: subscriptionPlans.price,
        status: userSubscriptions.status,
        periodStart: userSubscriptions.currentPeriodStart,
        periodEnd: userSubscriptions.currentPeriodEnd,
      })
      .from(userSubscriptions)
      .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(eq(userSubscriptions.userId, userId));

    if (!sub) {
      res.json({ subscription: null, usage: {} });
      return;
    }

    const dtfQuotes = await getOrResetCounter(userId, "dtf_quotes");
    const mockupPngs = await getOrResetCounter(userId, "mockup_pngs");
    const pdfExports = await getOrResetCounter(userId, "pdf_exports");

    res.json({
      subscription: {
        planName: sub.planName,
        planSlug: sub.planSlug,
        limits: sub.limits,
        price: sub.price,
        status: sub.status,
        periodStart: sub.periodStart,
        periodEnd: sub.periodEnd,
      },
      usage: {
        dtfQuotes,
        mockupPngs,
        pdfExports,
      },
    });
  } catch (err) {
    console.error("GET /subscription error:", err);
    res.status(500).json({ error: "Error al obtener suscripción" });
  }
});

subscriptionRouter.get("/subscription/plans", async (_req, res) => {
  try {
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true));
    res.json({ plans });
  } catch (err) {
    console.error("GET /subscription/plans error:", err);
    res.status(500).json({ error: "Error al obtener planes" });
  }
});

subscriptionRouter.post("/subscription/upgrade", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { planSlug } = req.body as { planSlug?: string };

    if (!planSlug) {
      res.status(400).json({ error: "planSlug es requerido" });
      return;
    }

    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, planSlug));

    if (!plan) {
      res.status(404).json({ error: "Plan no encontrado" });
      return;
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const [existing] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));

    if (existing) {
      await db
        .update(userSubscriptions)
        .set({
          planId: plan.id,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        })
        .where(eq(userSubscriptions.userId, userId));
    } else {
      await db.insert(userSubscriptions).values({
        userId,
        planId: plan.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }

    res.json({
      message: `Plan actualizado a ${plan.name}`,
      plan: {
        name: plan.name,
        slug: plan.slug,
        limits: plan.limits,
        price: plan.price,
      },
    });
  } catch (err) {
    console.error("POST /subscription/upgrade error:", err);
    res.status(500).json({ error: "Error al cambiar plan" });
  }
});

subscriptionRouter.get("/usage", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const dtfQuotes = await getOrResetCounter(userId, "dtf_quotes");
    const mockupPngs = await getOrResetCounter(userId, "mockup_pngs");
    const pdfExports = await getOrResetCounter(userId, "pdf_exports");

    const [sub] = await db
      .select({ limits: subscriptionPlans.limits })
      .from(userSubscriptions)
      .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(eq(userSubscriptions.userId, userId));

    const limits = (sub?.limits as PlanLimits) || { dtfQuotes: 10, mockupPngs: 5, pdfExports: 3 };

    res.json({
      usage: { dtfQuotes, mockupPngs, pdfExports },
      limits,
      remaining: {
        dtfQuotes: limits.dtfQuotes === -1 ? -1 : Math.max(0, limits.dtfQuotes - dtfQuotes),
        mockupPngs: limits.mockupPngs === -1 ? -1 : Math.max(0, limits.mockupPngs - mockupPngs),
        pdfExports: limits.pdfExports === -1 ? -1 : Math.max(0, limits.pdfExports - pdfExports),
      },
    });
  } catch (err) {
    console.error("GET /usage error:", err);
    res.status(500).json({ error: "Error al obtener uso" });
  }
});

subscriptionRouter.post("/usage/increment", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { type } = req.body as { type?: string };

    const validTypes = ["dtf_quotes", "mockup_pngs", "pdf_exports"];
    if (!type || !validTypes.includes(type)) {
      res.status(400).json({ error: "Tipo inválido. Use: dtf_quotes, mockup_pngs, pdf_exports" });
      return;
    }

    const [sub] = await db
      .select({ limits: subscriptionPlans.limits })
      .from(userSubscriptions)
      .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(eq(userSubscriptions.userId, userId));

    const limits = (sub?.limits as PlanLimits) || { dtfQuotes: 10, mockupPngs: 5, pdfExports: 3 };

    const limitKey = type === "dtf_quotes" ? "dtfQuotes" : type === "mockup_pngs" ? "mockupPngs" : "pdfExports";
    const limit = limits[limitKey];

    const monthStart = getMonthStart();

    const [result] = await db.execute(sql`
      INSERT INTO usage_counters (user_id, counter_type, count, period_start)
      VALUES (${userId}, ${type}, 1, ${monthStart})
      ON CONFLICT (user_id, counter_type)
      DO UPDATE SET
        count = CASE
          WHEN usage_counters.period_start < ${monthStart}
          THEN 1
          ELSE usage_counters.count + 1
        END,
        period_start = CASE
          WHEN usage_counters.period_start < ${monthStart}
          THEN ${monthStart}
          ELSE usage_counters.period_start
        END
      RETURNING count
    `);

    const newCount = Number((result as { count: number }).count);

    if (limit !== -1 && newCount > limit) {
      await db.execute(sql`
        UPDATE usage_counters
        SET count = count - 1
        WHERE user_id = ${userId} AND counter_type = ${type}
      `);
      res.status(403).json({
        error: "Límite alcanzado",
        remaining: 0,
        limit,
        current: limit,
      });
      return;
    }

    res.json({
      current: newCount,
      limit,
      remaining: limit === -1 ? -1 : Math.max(0, limit - newCount),
    });
  } catch (err) {
    console.error("POST /usage/increment error:", err);
    res.status(500).json({ error: "Error al incrementar uso" });
  }
});

export default subscriptionRouter;
