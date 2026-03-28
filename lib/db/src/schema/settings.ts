import { pgTable, integer, real, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const dtfGlobalSettings = pgTable("dtf_global_settings", {
  id: integer("id").primaryKey().default(1),
  pricePerMeter: integer("price_per_meter").notNull().default(10000),
  rollWidth: real("roll_width").notNull().default(58),
});

export type DTFGlobalSettings = typeof dtfGlobalSettings.$inferSelect;

export const userDtfSettings = pgTable("user_dtf_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  pricePerMeter: integer("price_per_meter").notNull().default(10000),
  rollWidth: real("roll_width").notNull().default(58),
  baseMargin: integer("base_margin").notNull().default(2000),
  wholesaleMargin: integer("wholesale_margin").notNull().default(1200),
  pressPassThreshold: integer("press_pass_threshold").notNull().default(2),
  pressPassExtraCost: integer("press_pass_extra_cost").notNull().default(800),
  talleEnabled: boolean("talle_enabled").notNull().default(false),
  talleSurcharge: integer("talle_surcharge").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserDtfSettings = typeof userDtfSettings.$inferSelect;
