CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_org_id" varchar(128) NOT NULL,
	"creator_user_id" varchar(128) NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "projects_org_updated_idx" ON "projects" USING btree ("clerk_org_id","updated_at");--> statement-breakpoint
CREATE INDEX "projects_org_id_idx" ON "projects" USING btree ("clerk_org_id","id");