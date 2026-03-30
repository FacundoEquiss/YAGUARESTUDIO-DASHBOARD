import { pgTable, text, timestamp, varchar, integer, serial } from "drizzle-orm/pg-core";
import { users } from "./users";

export const feedbacks = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // 'bug', 'sugerencia', 'otro'
  message: text("message").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending', 'resolved'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
