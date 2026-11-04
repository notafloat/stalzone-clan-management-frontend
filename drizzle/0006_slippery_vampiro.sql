ALTER TABLE "kv_wars" ADD COLUMN "mandatory" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "kv_wars" SET "mandatory" = (extract(isodow from "date")::int - 1) IN (SELECT jsonb_array_elements_text("value"->'mandatory')::int FROM "settings" WHERE "key" = 'kv_rules') WHERE EXISTS (SELECT 1 FROM "settings" WHERE "key" = 'kv_rules');
