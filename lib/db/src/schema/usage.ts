import { pgTable, serial, integer, varchar, timestamp, unique, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export const usageCounters = pgTable("usage_counters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  counterType: varchar("counter_type", { length: 50 }).notNull(),
  count: integer("count").notNull().default(0),
  periodStart: timestamp("period_start").notNull().defaultNow(),
}, (table) => [
  unique("uq_user_counter").on(table.userId, table.counterType),
]);

export type UsageCounter = typeof usageCounters.$inferSelect;

export const usageEvents = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type UsageEvent = typeof usageEvents.$inferSelect;
