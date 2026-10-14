import {
  bigint,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["in_progress", "done"] })
    .notNull()
    .default("in_progress"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const steps = pgTable(
  "steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    phase: text("phase").notNull().default("Planning & design"),
    subGroup: text("sub_group"),
    title: text("title").notNull(),
    notes: text("notes"),
    apiDurationS: integer("api_duration_s"),
    wallDurationS: integer("wall_duration_s"),
    fingerprint: text("fingerprint").notNull(),
    sourceText: text("source_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("steps_project_position_idx").on(t.projectId, t.position),
    index("steps_project_fingerprint_idx").on(t.projectId, t.fingerprint),
  ],
);

export const stepUsages = pgTable(
  "step_usages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stepId: uuid("step_id")
      .notNull()
      .references(() => steps.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    model: text("model").notNull(),
    effort: text("effort"),
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
    cacheRead: bigint("cache_read", { mode: "number" }).notNull().default(0),
    cacheWrite: bigint("cache_write", { mode: "number" }).notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 12, scale: 4 }),
  },
  (t) => [index("step_usages_step_idx").on(t.stepId)],
);

export type Project = typeof projects.$inferSelect;
export type Step = typeof steps.$inferSelect;
export type StepUsage = typeof stepUsages.$inferSelect;
