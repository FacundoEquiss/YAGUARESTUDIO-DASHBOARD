import { pgTable, serial, integer, varchar, timestamp, text, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";
import { suppliers } from "./suppliers";
import { orders } from "./orders";

export interface ProductPriceTier {
  id: string;
  label: string;
  type: string;
  price: number;
  isDefault?: boolean;
  minQty?: number;
  maxQty?: number | null;
  isActive?: boolean;
}

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 50 }).notNull().default("unidad"),
  salePrice: numeric("sale_price", { precision: 14, scale: 2 }).notNull().default("0"),
  priceTiers: jsonb("price_tiers").notNull().$type<ProductPriceTier[]>().default([]),
  allowManualPrice: boolean("allow_manual_price").notNull().default(true),
  costPrice: numeric("cost_price", { precision: 14, scale: 2 }).notNull().default("0"),
  currentStock: numeric("current_stock", { precision: 14, scale: 2 }).notNull().default("0"),
  minStock: numeric("min_stock", { precision: 14, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;

export const productStockMovements = pgTable("product_stock_movements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
  movementType: varchar("movement_type", { length: 50 }).notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 2 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProductStockMovement = typeof productStockMovements.$inferSelect;
