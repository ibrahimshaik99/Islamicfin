DO $$ BEGIN
 CREATE TYPE "public"."bnpl_contract_status" AS ENUM('PENDING_REVIEW', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."bnpl_installment_frequency" AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."bnpl_installment_status" AS ENUM('PENDING', 'PAID', 'VERIFIED', 'REJECTED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."city_status" AS ENUM('ACTIVE', 'DISABLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."directory_role" AS ENUM('CUSTOMER', 'MERCHANT', 'COMMUNITY_ADMIN', 'COMMUNITY_MODERATOR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."finance_request_status" AS ENUM('PENDING', 'CONTACTED', 'CLOSED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."finance_request_type" AS ENUM('INVESTMENT', 'LOAN', 'DONATION', 'PARTNERSHIP');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."finance_type" AS ENUM('QARD_HASAN', 'MUDARABAH', 'MUSHARAKAH', 'MURABAHAH', 'IJARAH', 'NONE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."kameti_preference" AS ENUM('YES', 'NO', 'MAYBE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."return_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bnpl_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"items_snapshot" jsonb,
	"purchase_price" numeric(14, 2) NOT NULL,
	"total_sale_price" numeric(14, 2) NOT NULL,
	"down_payment" numeric(14, 2) DEFAULT '0' NOT NULL,
	"installment_amount" numeric(14, 2) NOT NULL,
	"installment_count" integer NOT NULL,
	"installment_frequency" "bnpl_installment_frequency" NOT NULL,
	"start_date" date NOT NULL,
	"first_due_date" date NOT NULL,
	"total_amount_payable" numeric(14, 2) NOT NULL,
	"status" "bnpl_contract_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"shariah_review_status" "shariah_review_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"review_comments" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"contract_terms" text,
	"terms_version" varchar(20) DEFAULT '1.0',
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bnpl_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"due_date" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"status" "bnpl_installment_status" DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_method" varchar(50),
	"reference_number" varchar(255),
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"state" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"status" "city_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_directory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"added_by_user_id" uuid,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"address" text,
	"email" varchar(255),
	"document_url" varchar(500),
	"document_type" varchar(100),
	"finance_type" "finance_type" DEFAULT 'NONE',
	"kameti_preference" "kameti_preference" DEFAULT 'NO',
	"role" "directory_role" DEFAULT 'CUSTOMER',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contract_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"title" varchar(255) NOT NULL,
	"contract_type" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"principal_amount" varchar(50),
	"partner_name" varchar(255),
	"duration_months" varchar(20),
	"profit_share_percent" varchar(10),
	"asset_description" text,
	"additional_terms" text,
	"status" varchar(20) DEFAULT 'DRAFT',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"request_type" "finance_request_type" NOT NULL,
	"amount" numeric(12, 2),
	"description" text NOT NULL,
	"contact_phone" varchar(20),
	"status" "finance_request_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "membership_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"community_id" uuid,
	"request_type" varchar(50) DEFAULT 'JOIN_COMMUNITY' NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"community_name" varchar(255),
	"community_slug" varchar(255),
	"message" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "return_status" DEFAULT 'PENDING' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "communities" ADD COLUMN "city_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_listings" ADD COLUMN "contact_name" varchar(255);
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_listings" ADD COLUMN "contact_phone" varchar(20);
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bnpl_contracts" ADD CONSTRAINT "bnpl_contracts_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bnpl_contracts" ADD CONSTRAINT "bnpl_contracts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bnpl_contracts" ADD CONSTRAINT "bnpl_contracts_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bnpl_contracts" ADD CONSTRAINT "bnpl_contracts_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bnpl_contracts" ADD CONSTRAINT "bnpl_contracts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bnpl_contracts" ADD CONSTRAINT "bnpl_contracts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bnpl_installments" ADD CONSTRAINT "bnpl_installments_contract_id_bnpl_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."bnpl_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bnpl_installments" ADD CONSTRAINT "bnpl_installments_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "community_directory" ADD CONSTRAINT "community_directory_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "community_directory" ADD CONSTRAINT "community_directory_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance_requests" ADD CONSTRAINT "finance_requests_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance_requests" ADD CONSTRAINT "finance_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membership_requests" ADD CONSTRAINT "membership_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membership_requests" ADD CONSTRAINT "membership_requests_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membership_requests" ADD CONSTRAINT "membership_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bnpl_contracts_order_idx" ON "bnpl_contracts" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bnpl_contracts_community_id_idx" ON "bnpl_contracts" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bnpl_contracts_customer_id_idx" ON "bnpl_contracts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bnpl_contracts_merchant_id_idx" ON "bnpl_contracts" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bnpl_contracts_status_idx" ON "bnpl_contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bnpl_contracts_community_created_idx" ON "bnpl_contracts" USING btree ("community_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bnpl_installments_contract_number_idx" ON "bnpl_installments" USING btree ("contract_id","installment_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bnpl_installments_due_date_idx" ON "bnpl_installments" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bnpl_installments_status_idx" ON "bnpl_installments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cities_name_state_idx" ON "cities" USING btree ("name","state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cities_status_idx" ON "cities" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cities_name_idx" ON "cities" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_requests_community_id_index" ON "finance_requests" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_requests_user_id_index" ON "finance_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_requests_request_type_index" ON "finance_requests" USING btree ("request_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_requests_status_index" ON "finance_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "membership_requests_status_idx" ON "membership_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "membership_requests_user_id_idx" ON "membership_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "membership_requests_community_id_idx" ON "membership_requests" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "membership_requests_type_idx" ON "membership_requests" USING btree ("request_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_returns_community_id_index" ON "order_returns" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_returns_order_id_index" ON "order_returns" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_returns_customer_id_index" ON "order_returns" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_returns_merchant_id_index" ON "order_returns" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_returns_status_index" ON "order_returns" USING btree ("status");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communities" ADD CONSTRAINT "communities_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communities_city_id_idx" ON "communities" USING btree ("city_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "communities_city_slug_idx" ON "communities" USING btree ("city_id","slug");