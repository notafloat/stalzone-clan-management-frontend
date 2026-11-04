ALTER TABLE "players" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "note_updated_by" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "note_updated_at" timestamp with time zone;