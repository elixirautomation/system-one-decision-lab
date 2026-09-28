ALTER TABLE "decisions" ALTER COLUMN "provider" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "decisions" DROP CONSTRAINT IF EXISTS "decisions_provider_check";
