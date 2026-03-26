import { Request, Response, NextFunction } from "express";
import { db, subscriptionPlans, userSubscriptions } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { PlanLimits } from "@workspace/db/schema";

type Feature = keyof PlanLimits;

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

    const [sub] = await db
      .select({
        limits: subscriptionPlans.limits,
        status: userSubscriptions.status,
        periodEnd: userSubscriptions.currentPeriodEnd,
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

    if (sub.periodEnd && new Date(sub.periodEnd) < new Date()) {
      res.status(403).json({
        error: "Suscripción expirada",
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
