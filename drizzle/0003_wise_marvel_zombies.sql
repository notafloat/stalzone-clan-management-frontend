CREATE TABLE "clan_info" (
	"id" integer PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "character_id" text;--> statement-breakpoint
CREATE INDEX "players_character_id_idx" ON "players" USING btree ("character_id");