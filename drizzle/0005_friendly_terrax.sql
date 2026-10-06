CREATE TABLE "published_stories" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"clerk_org_id" varchar(128) NOT NULL,
	"token" varchar(64) NOT NULL,
	"title" varchar(120) NOT NULL,
	"frames" jsonb NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "published_stories_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "reference_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"clerk_org_id" varchar(128) NOT NULL,
	"creator_user_id" varchar(128) NOT NULL,
	"image_base64" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "image_generations" ADD COLUMN "model" varchar(40) DEFAULT 'flux-1-schnell' NOT NULL;--> statement-breakpoint
ALTER TABLE "image_generations" ADD COLUMN "reference_generation_id" uuid;--> statement-breakpoint
ALTER TABLE "image_generations" ADD COLUMN "reference_upload_id" uuid;--> statement-breakpoint
ALTER TABLE "published_stories" ADD CONSTRAINT "published_stories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_images" ADD CONSTRAINT "reference_images_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "published_stories_org_project_idx" ON "published_stories" USING btree ("clerk_org_id","project_id");--> statement-breakpoint
CREATE INDEX "reference_images_org_project_idx" ON "reference_images" USING btree ("clerk_org_id","project_id");