CREATE TABLE "lineups" (
	"id" integer PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"version" integer NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
