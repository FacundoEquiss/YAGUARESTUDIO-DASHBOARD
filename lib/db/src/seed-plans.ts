import { eq } from "drizzle-orm";
import { db } from "./index";
import { subscriptionPlans } from "./schema/plans";
import type { PlanLimits } from "./schema/plans";

const PLANS: { name: string; slug: string; limits: PlanLimits; price: number }[] = [
  {
    name: "Gratis",
    slug: "free",
    limits: { dtfQuotes: 10, mockupPngs: 5, pdfExports: 3 },
    price: 0,
  },
  {
    name: "Estándar",
    slug: "standard",
    limits: { dtfQuotes: 40, mockupPngs: 30, pdfExports: 25 },
    price: 4990,
  },
  {
    name: "Premium",
    slug: "premium",
    limits: { dtfQuotes: -1, mockupPngs: -1, pdfExports: -1 },
    price: 9990,
  },
];

export async function seedPlans() {
  for (const plan of PLANS) {
    const existing = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, plan.slug));
    if (existing.length === 0) {
      await db.insert(subscriptionPlans).values(plan);
      console.log(`Seeded plan: ${plan.name}`);
    }
  }
}
