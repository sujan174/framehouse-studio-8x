import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
} from "drizzle-orm/pg-core";
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkOrgId: varchar("clerk_org_id", { length: 128 }).notNull(),
    creatorUserId: varchar("creator_user_id", { length: 128 }).notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("projects_org_updated_idx").on(table.clerkOrgId, table.updatedAt),
    index("projects_org_id_idx").on(table.clerkOrgId, table.id),
  ],
);
export type Project = typeof projects.$inferSelect;
