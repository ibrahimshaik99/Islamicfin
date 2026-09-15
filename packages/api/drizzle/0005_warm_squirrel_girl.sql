CREATE TYPE "public"."risk_flag_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."risk_flag_status" AS ENUM('FLAGGED', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid NOT NULL,
	"severity" "risk_flag_severity" DEFAULT 'LOW' NOT NULL,
	"reason" varchar(500) NOT NULL,
	"status" "risk_flag_status" DEFAULT 'FLAGGED' NOT NULL,
	"reviewer_id" uuid,
	"notes" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "risk_flags_community_id_idx" ON "risk_flags" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "risk_flags_status_idx" ON "risk_flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "risk_flags_entity_idx" ON "risk_flags" USING btree ("entity_type","entity_id");