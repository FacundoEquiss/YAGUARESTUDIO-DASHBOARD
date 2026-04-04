import { pgTable, serial, integer, varchar, timestamp, text, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export interface ServicePricingRule {
  id: string;
  label?: string;
  minQty: number;
  maxQty?: number | null;
  unitPrice: number;
}

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  pricingType: varchar("pricing_type", { length: 50 }).notNull().default("fixed"),
  pricingRules: jsonb("pricing_rules").notNull().$type<ServicePricingRule[]>().default([]),
  unit: varchar("unit", { length: 50 }).notNull().default("unidad"),
  baseCost: numeric("base_cost", { precision: 14, scale: 2 }).notNull().default("0"),
  suggestedPrice: numeric("suggested_price", { precision: 14, scale: 2 }).notNull().default("0"),
  usesIndirectInput: boolean("uses_indirect_input").notNull().default(false),
  reportArea: varchar("report_area", { length: 100 }),
  reportConcept: varchar("report_concept", { length: 100 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Service = typeof services.$inferSelect;