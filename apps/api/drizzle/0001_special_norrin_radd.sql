ALTER TABLE "teams" DROP CONSTRAINT "teams_max_size_check";--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_max_size_check" CHECK ("teams"."max_size" >= 1);