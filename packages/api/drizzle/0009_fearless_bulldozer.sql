ALTER TABLE "merchants" ADD COLUMN "city_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "merchants" ADD CONSTRAINT "merchants_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchants_city_id_idx" ON "merchants" USING btree ("city_id");--> statement-breakpoint
-- Existing merchants publish to their community's city marketplace by default.
UPDATE "merchants" m
SET "city_id" = c."city_id"
FROM "communities" c
WHERE c."id" = m."community_id" AND m."city_id" IS NULL AND c."city_id" IS NOT NULL;