import { pgTable, serial, integer, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { users } from "./users";

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  businessName: varchar("business_name", { length: 255 }),
  category: varchar("category", { length: 100 }),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Supplier = typeof suppliers.$inferSelect;
