import { pgTable, serial, varchar, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export interface PlanLimits {
  dtfQuotes: number;
  mockupPngs: number;
  pdfExports: number;
}

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  limits: jsonb("limits").notNull().$type<PlanLimits>(),
  price: integer("price").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
