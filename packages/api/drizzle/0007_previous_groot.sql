ALTER TABLE "membership_requests" ADD COLUMN "city_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membership_requests" ADD CONSTRAINT "membership_requests_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
