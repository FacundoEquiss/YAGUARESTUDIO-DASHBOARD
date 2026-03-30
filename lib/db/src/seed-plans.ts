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
    price: 14990,
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
    } else {
      const dbPlan = existing[0];
      if (dbPlan.price !== plan.price) {
        await db.update(subscriptionPlans).set({ price: plan.price }).where(eq(subscriptionPlans.slug, plan.slug));
        console.log(`Updated price for plan ${plan.name} from ${dbPlan.price} to ${plan.price}`);
      }
    }
  }
}
