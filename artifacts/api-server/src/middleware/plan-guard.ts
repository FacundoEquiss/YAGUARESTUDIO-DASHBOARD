import { Request, Response, NextFunction } from "express";
import { db, subscriptionPlans, userSubscriptions } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { PlanLimits } from "@workspace/db/schema";

type Feature = keyof PlanLimits;

async function rolloverSubscription(userId: number): Promise<void> {
  const [sub] = await db
    .select({
      id: userSubscriptions.id,
      periodEnd: userSubscriptions.currentPeriodEnd,
    })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  if (!sub) return;

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
  }
}

export function requirePlan(feature: Feature) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    if (req.user.role === "master") {
      next();
      return;
    }

    await rolloverSubscription(req.user.userId);

    const [sub] = await db
      .select({
        limits: subscriptionPlans.limits,
        status: userSubscriptions.status,
      })
      .from(userSubscriptions)
      .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(eq(userSubscriptions.userId, req.user.userId));

    if (!sub || sub.status !== "active") {
      res.status(403).json({
        error: "Suscripción inactiva",
        requiresPlan: true,
      });
      return;
    }

    const limits = sub.limits as PlanLimits;
    if (limits[feature] === 0) {
      res.status(403).json({
        error: "Tu plan no incluye esta función",
        requiresPlan: true,
        feature,
      });
      return;
    }

    next();
  };
}
