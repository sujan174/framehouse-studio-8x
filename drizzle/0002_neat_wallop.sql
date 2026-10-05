ALTER TABLE "generation_images" ADD COLUMN "clerk_org_id" varchar(128);
--> statement-breakpoint
UPDATE "generation_images" AS image SET "clerk_org_id" = generation."clerk_org_id"
FROM "image_generations" AS generation WHERE image."generation_id" = generation."id";
--> statement-breakpoint
ALTER TABLE "generation_images" ALTER COLUMN "clerk_org_id" SET NOT NULL;
