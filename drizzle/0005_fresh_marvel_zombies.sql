CREATE TABLE "kv_marks" (
	"war_date" date NOT NULL,
	"player_uuid" text NOT NULL,
	"plan" text NOT NULL,
	"stages" jsonb NOT NULL,
	"absence" text NOT NULL,
	"reason" text NOT NULL,
	"why" text NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kv_marks_war_date_player_uuid_pk" PRIMARY KEY("war_date","player_uuid")
);
--> statement-breakpoint
CREATE TABLE "kv_wars" (
	"date" date PRIMARY KEY NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kv_marks" ADD CONSTRAINT "kv_marks_war_date_kv_wars_date_fk" FOREIGN KEY ("war_date") REFERENCES "public"."kv_wars"("date") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kv_marks" ADD CONSTRAINT "kv_marks_player_uuid_players_uuid_fk" FOREIGN KEY ("player_uuid") REFERENCES "public"."players"("uuid") ON DELETE no action ON UPDATE no action;