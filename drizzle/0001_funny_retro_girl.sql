CREATE TABLE "generation_images" (
	"generation_id" uuid PRIMARY KEY NOT NULL,
	"image_base64" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "image_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_org_id" varchar(128) NOT NULL,
	"project_id" uuid NOT NULL,
	"creator_user_id" varchar(128) NOT NULL,
	"client_request_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"steps" integer NOT NULL,
	"seed" integer NOT NULL,
	"status" varchar(16) DEFAULT 'queued' NOT NULL,
	"failure_code" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "generation_images" ADD CONSTRAINT "generation_images_generation_id_image_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."image_generations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_generations" ADD CONSTRAINT "image_generations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generations_org_project_created_idx" ON "image_generations" USING btree ("clerk_org_id","project_id","created_at");--> statement-breakpoint
CREATE INDEX "generations_status_created_idx" ON "image_generations" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "generations_idempotency_idx" ON "image_generations" USING btree ("clerk_org_id","creator_user_id","client_request_id");