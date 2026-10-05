import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
  integer,
  uniqueIndex,
  jsonb,
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

export const imageGenerations = pgTable(
  "image_generations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkOrgId: varchar("clerk_org_id", { length: 128 }).notNull(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    creatorUserId: varchar("creator_user_id", { length: 128 }).notNull(),
    clientRequestId: uuid("client_request_id").notNull(),
    prompt: text("prompt").notNull(),
    steps: integer("steps").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("queued"),
    failureCode: varchar("failure_code", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("generations_org_project_created_idx").on(table.clerkOrgId, table.projectId, table.createdAt),
    index("generations_status_created_idx").on(table.status, table.createdAt),
    uniqueIndex("generations_idempotency_idx").on(table.clerkOrgId, table.creatorUserId, table.clientRequestId),
  ],
);
export type ImageGeneration = typeof imageGenerations.$inferSelect;

export const generationImages = pgTable("generation_images", {
  generationId: uuid("generation_id").primaryKey().references(() => imageGenerations.id),
  clerkOrgId: varchar("clerk_org_id", { length: 128 }).notNull(),
  imageBase64: text("image_base64").notNull(),
});

export type StoryFrame = { generationId: string; caption: string };
export const projectCreativeStates = pgTable("project_creative_states", {
  projectId: uuid("project_id").primaryKey().references(() => projects.id),
  clerkOrgId: varchar("clerk_org_id", { length: 128 }).notNull(),
  shortlist: jsonb("shortlist").$type<string[]>().notNull().default([]),
  frames: jsonb("frames").$type<StoryFrame[]>().notNull().default([]),
  revision: integer("revision").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("creative_states_org_project_idx").on(table.clerkOrgId, table.projectId)]);
