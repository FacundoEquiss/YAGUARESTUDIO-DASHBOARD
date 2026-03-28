import { pgTable, serial, integer, varchar, timestamp, text, numeric } from "drizzle-orm/pg-core";
import { users } from "./users";

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 30 }).notNull().default("nuevo"),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
