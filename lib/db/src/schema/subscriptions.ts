import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { subscriptionPlans } from "./plans";

export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  // Campos Mercado Pago para tracking e Idempotencia
  mpSubscriptionId: varchar("mp_subscription_id", { length: 255 }),
  mpLastEventId: varchar("mp_last_event_id", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
