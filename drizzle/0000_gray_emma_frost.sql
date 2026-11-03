CREATE TABLE "activity_days" (
	"player_uuid" text NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "activity_days_player_uuid_day_pk" PRIMARY KEY("player_uuid","day")
);
--> statement-breakpoint
CREATE TABLE "clan_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"player_uuid" text NOT NULL,
	"player_name" text NOT NULL,
	"type" text NOT NULL,
	"from_value" text,
	"to_value" text,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "clan_events_once" UNIQUE("player_uuid","type","occurred_at")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"uuid" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rank" text NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"last_login" timestamp with time zone,
	"left_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_days" ADD CONSTRAINT "activity_days_player_uuid_players_uuid_fk" FOREIGN KEY ("player_uuid") REFERENCES "public"."players"("uuid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clan_events" ADD CONSTRAINT "clan_events_player_uuid_players_uuid_fk" FOREIGN KEY ("player_uuid") REFERENCES "public"."players"("uuid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clan_events_occurred_at_idx" ON "clan_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "players_name_idx" ON "players" USING btree ("name");