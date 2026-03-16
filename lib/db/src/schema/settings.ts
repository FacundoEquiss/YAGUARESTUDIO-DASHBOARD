import { pgTable, integer, real } from "drizzle-orm/pg-core";

export const dtfGlobalSettings = pgTable("dtf_global_settings", {
  id: integer("id").primaryKey().default(1),
  pricePerMeter: integer("price_per_meter").notNull().default(10000),
  rollWidth: real("roll_width").notNull().default(58),
});

export type DTFGlobalSettings = typeof dtfGlobalSettings.$inferSelect;
