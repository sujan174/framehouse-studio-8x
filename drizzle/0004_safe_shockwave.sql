CREATE TABLE "project_creative_states" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"clerk_org_id" varchar(128) NOT NULL,
	"shortlist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"frames" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_creative_states" ADD CONSTRAINT "project_creative_states_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creative_states_org_project_idx" ON "project_creative_states" USING btree ("clerk_org_id","project_id");