ALTER TABLE "recipes" ADD COLUMN "active_time_in_minutes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "total_time_in_minutes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "number_of_servings" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "images" DROP COLUMN IF EXISTS "created_at";