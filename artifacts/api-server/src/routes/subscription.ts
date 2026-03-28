import { Router } from "express";
import { db, subscriptionPlans, userSubscriptions, usageCounters, usageEvents } from "@workspace/db";
import { eq, and, sql, desc, gte } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import type { PlanLimits } from "@workspace/db/schema";

const subscriptionRouter = Router();

async function rolloverAndGetPeriodStart(userId: number): Promise<Date> {
  const [sub] = await db
    .select({
      id: userSubscriptions.id,
      periodStart: userSubscriptions.currentPeriodStart,
      periodEnd: userSubscriptions.currentPeriodEnd,
    })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  if (!sub) return new Date();

  const now = new Date();
  if (sub.periodEnd && sub.periodEnd < now) {
    let newStart = new Date(sub.periodEnd);
    let newEnd = new Date(newStart);
    newEnd.setMonth(newEnd.getMonth() + 1);
    while (newEnd < now) {
      newStart = new Date(newEnd);
      newEnd = new Date(newStart);
      newEnd.setMonth(newEnd.getMonth() + 1);
    }
    await db
      .update(userSubscriptions)
      .set({ currentPeriodStart: newStart, currentPeriodEnd: newEnd })
      .where(eq(userSubscriptions.id, sub.id));
    return newStart;
  }

  return sub.periodStart;
}

async function getOrResetCounter(userId: number, counterType: string): Promise<number> {
  const periodStart = await rolloverAndGetPeriodStart(userId);
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
      periodStart,
    });
    return 0;
  }

  if (counter.periodStart < periodStart) {
    await db
      .update(usageCounters)
      .set({ count: 0, periodStart })
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
    const isMaster = req.user!.role === "master";
    const { type } = req.body as { type?: string };

    const validTypes = ["dtf_quotes", "mockup_pngs", "pdf_exports"];
    if (!type || !validTypes.includes(type)) {
      res.status(400).json({ error: "Tipo inválido. Use: dtf_quotes, mockup_pngs, pdf_exports" });
      return;
    }

    const featureKey = type === "dtf_quotes" ? "dtfQuotes" : type === "mockup_pngs" ? "mockupPngs" : "pdfExports";

    const periodStart = await rolloverAndGetPeriodStart(userId);

    const [sub] = await db
      .select({
        limits: subscriptionPlans.limits,
        status: userSubscriptions.status,
      })
      .from(userSubscriptions)
      .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(eq(userSubscriptions.userId, userId));

    if (!isMaster) {
      if (!sub || sub.status !== "active") {
        res.status(403).json({ error: "Suscripción inactiva", requiresPlan: true });
        return;
      }
      const featureLimits = sub.limits as PlanLimits;
      if (featureLimits[featureKey] === 0) {
        res.status(403).json({ error: "Tu plan no incluye esta función", requiresPlan: true, feature: featureKey });
        return;
      }
    }

    const limits = (sub?.limits as PlanLimits) || { dtfQuotes: 10, mockupPngs: 5, pdfExports: 3 };
    const limit = limits[featureKey];

    const queryResult = await db.execute(sql`
      INSERT INTO usage_counters (user_id, counter_type, count, period_start)
      VALUES (${userId}, ${type}, 1, ${periodStart})
      ON CONFLICT (user_id, counter_type)
      DO UPDATE SET
        count = CASE
          WHEN usage_counters.period_start < ${periodStart}
          THEN 1
          ELSE usage_counters.count + 1
        END,
        period_start = CASE
          WHEN usage_counters.period_start < ${periodStart}
          THEN ${periodStart}
          ELSE usage_counters.period_start
        END
      RETURNING count
    `);

    const rows = queryResult.rows as { count: number }[];
    const newCount = Number(rows[0].count);

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

    await db.insert(usageEvents).values({
      userId,
      eventType: type,
      metadata: req.body.metadata ?? null,
    });

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

subscriptionRouter.get("/usage/events", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await db
      .select({
        id: usageEvents.id,
        eventType: usageEvents.eventType,
        metadata: usageEvents.metadata,
        createdAt: usageEvents.createdAt,
      })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.userId, userId),
          gte(usageEvents.createdAt, since),
        )
      )
      .orderBy(desc(usageEvents.createdAt))
      .limit(100);

    res.json({ events });
  } catch (err) {
    console.error("GET /usage/events error:", err);
    res.status(500).json({ error: "Error al obtener eventos" });
  }
});

export default subscriptionRouter;
