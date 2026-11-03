ALTER TABLE "clan_events" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "clan_events" ADD COLUMN "note_updated_by" text;--> statement-breakpoint
ALTER TABLE "clan_events" ADD COLUMN "note_updated_at" timestamp with time zone;