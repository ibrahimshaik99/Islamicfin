CREATE TYPE "public"."billing_period" AS ENUM('MONTHLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."category_status" AS ENUM('ACTIVE', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."community_role" AS ENUM('COMMUNITY_OWNER', 'COMMUNITY_ADMIN', 'COMMUNITY_MODERATOR', 'COMMUNITY_FINANCE_MANAGER', 'MERCHANT', 'MERCHANT_STAFF', 'CUSTOMER');--> statement-breakpoint
CREATE TYPE "public"."community_status" AS ENUM('ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('MUDARABAH', 'MUSHARAKAH', 'MURABAHAH', 'IJARAH', 'QARD_HASAN', 'SADAQAH');--> statement-breakpoint
CREATE TYPE "public"."contribution_type" AS ENUM('DONATION', 'INVESTMENT');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('DIRECT', 'GROUP', 'ORDER', 'KAMETI', 'PROJECT');--> statement-breakpoint
CREATE TYPE "public"."crowdfunding_contribution_status" AS ENUM('PENDING', 'REPORTED', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."crowdfunding_project_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."finance_contract_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'TERMINATED');--> statement-breakpoint
CREATE TYPE "public"."finance_review_status" AS ENUM('PENDING_REVIEW', 'REVIEWED', 'NEEDS_REVISION', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."finance_transaction_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."kameti_contribution_status" AS ENUM('PENDING', 'PAID', 'VERIFIED', 'REJECTED', 'LATE');--> statement-breakpoint
CREATE TYPE "public"."kameti_frequency" AS ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."kameti_group_status" AS ENUM('ACTIVE', 'COMPLETED', 'CANCELLED', 'PAUSED');--> statement-breakpoint
CREATE TYPE "public"."kameti_member_status" AS ENUM('ACTIVE', 'LEFT', 'REMOVED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."kameti_payout_status" AS ENUM('PENDING', 'PAID', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."kameti_period_status" AS ENUM('PENDING', 'ACTIVE', 'COMPLETED', 'DEFAULTED');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('ACTIVE', 'SUSPENDED', 'INVITED', 'LEFT');--> statement-breakpoint
CREATE TYPE "public"."merchant_verification_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('TEXT', 'IMAGE', 'FILE', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('COD', 'DIRECT_UPI');--> statement-breakpoint
CREATE TYPE "public"."payment_record_status" AS ENUM('REPORTED', 'VERIFIED', 'REJECTED', 'NOT_REQUIRED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('UNPAID', 'PAYMENT_REPORTED', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED', 'REFUNDED', 'NOT_REQUIRED');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('DONATION', 'INVESTMENT');--> statement-breakpoint
CREATE TYPE "public"."service_listing_status" AS ENUM('ACTIVE', 'PAUSED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."service_request_status" AS ENUM('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."shariah_review_status" AS ENUM('PENDING_REVIEW', 'REVIEWED', 'NEEDS_REVISION', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid,
	"actor_id" uuid NOT NULL,
	"action" varchar(255) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_hash" varchar(255),
	"user_agent" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"logo_url" text,
	"address" text,
	"city" varchar(255),
	"state" varchar(255),
	"country" varchar(100) DEFAULT 'India',
	"contact_phone" varchar(20),
	"status" "community_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "communities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "community_role" DEFAULT 'CUSTOMER' NOT NULL,
	"status" "membership_status" DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_members" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_read_message_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"type" "conversation_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crowdfunding_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"contributor_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"contribution_type" "contribution_type" NOT NULL,
	"payment_method" varchar(50),
	"reference_number" varchar(255),
	"proof_url" text,
	"status" "crowdfunding_contribution_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crowdfunding_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"goal_amount" numeric(12, 2) NOT NULL,
	"raised_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"project_type" "project_type" NOT NULL,
	"status" "crowdfunding_project_status" DEFAULT 'DRAFT' NOT NULL,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"description" text,
	"seller" varchar(255),
	"purchase_price" numeric(14, 2),
	"purchase_date" date,
	"ownership_status" varchar(100),
	"possession_status" varchar(100),
	"sale_price" numeric(14, 2),
	"sale_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"contract_type" "contract_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"initiator_id" uuid NOT NULL,
	"status" "finance_contract_status" DEFAULT 'DRAFT' NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"principal_amount" numeric(14, 2) NOT NULL,
	"start_date" date,
	"end_date" date,
	"terms_version" integer DEFAULT 1 NOT NULL,
	"shariah_review_status" "shariah_review_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"file_url" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"participant_role" varchar(100) NOT NULL,
	"contribution_amount" numeric(14, 2),
	"profit_share" numeric(5, 2),
	"ownership_share" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"reviewer" varchar(255) NOT NULL,
	"status" "finance_review_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"comments" text,
	"reviewed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"terms_json" jsonb NOT NULL,
	"effective_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"type" varchar(100) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"reference" varchar(255),
	"payment_method" varchar(50),
	"status" "finance_transaction_status" DEFAULT 'PENDING' NOT NULL,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kameti_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kameti_group_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" varchar(50),
	"reference_number" varchar(255),
	"proof_url" text,
	"status" "kameti_contribution_status" DEFAULT 'PENDING' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kameti_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"contribution_amount" numeric(12, 2) NOT NULL,
	"frequency" "kameti_frequency" NOT NULL,
	"total_members" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" "kameti_group_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kameti_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kameti_group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"status" "kameti_member_status" DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kameti_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kameti_group_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"period_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "kameti_payout_status" DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp with time zone,
	"reference_number" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kameti_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kameti_group_id" uuid NOT NULL,
	"period_number" integer NOT NULL,
	"due_date" date NOT NULL,
	"status" "kameti_period_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"description" text,
	"phone" varchar(20),
	"whatsapp" varchar(20),
	"upi_id" varchar(255),
	"upi_qr_url" text,
	"address" text,
	"verification_status" "merchant_verification_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"message_type" "message_type" DEFAULT 'TEXT' NOT NULL,
	"body" text NOT NULL,
	"attachment_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"community_id" uuid,
	"type" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name_snapshot" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"customer_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"delivery_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_status" "payment_status" DEFAULT 'UNPAID' NOT NULL,
	"order_status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"shipping_address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reference_number" varchar(255),
	"proof_url" text,
	"status" "payment_record_status" DEFAULT 'REPORTED' NOT NULL,
	"reported_by" uuid,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"status" "category_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"category_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"sale_price" numeric(12, 2),
	"sku" varchar(100),
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"status" "product_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"category_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(12, 2),
	"location" varchar(255),
	"availability" text,
	"status" "service_listing_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"description" text,
	"status" "service_request_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"plan" varchar(100) DEFAULT 'standard' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"billing_period" "billing_period" DEFAULT 'MONTHLY' NOT NULL,
	"status" "subscription_status" DEFAULT 'ACTIVE' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"password_hash" text NOT NULL,
	"avatar_url" text,
	"status" "user_status" DEFAULT 'PENDING' NOT NULL,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crowdfunding_contributions" ADD CONSTRAINT "crowdfunding_contributions_project_id_crowdfunding_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."crowdfunding_projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crowdfunding_contributions" ADD CONSTRAINT "crowdfunding_contributions_contributor_id_users_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crowdfunding_projects" ADD CONSTRAINT "crowdfunding_projects_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crowdfunding_projects" ADD CONSTRAINT "crowdfunding_projects_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance_assets" ADD CONSTRAINT "finance_assets_contract_id_finance_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."finance_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance_contracts" ADD CONSTRAINT "finance_contracts_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance_contracts" ADD CONSTRAINT "finance_contracts_initiator_id_users_id_fk" FOREIGN KEY ("initiator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance_documents" ADD CONSTRAINT "finance_documents_contract_id_finance_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."finance_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance_participants" ADD CONSTRAINT "finance_participants_contract_id_finance_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."finance_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance_participants" ADD CONSTRAINT "finance_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance_reviews" ADD CONSTRAINT "finance_reviews_contract_id_finance_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."finance_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance_terms" ADD CONSTRAINT "finance_terms_contract_id_finance_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."finance_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_contract_id_finance_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."finance_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kameti_contributions" ADD CONSTRAINT "kameti_contributions_kameti_group_id_kameti_groups_id_fk" FOREIGN KEY ("kameti_group_id") REFERENCES "public"."kameti_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kameti_contributions" ADD CONSTRAINT "kameti_contributions_member_id_kameti_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."kameti_members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kameti_contributions" ADD CONSTRAINT "kameti_contributions_period_id_kameti_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."kameti_periods"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kameti_contributions" ADD CONSTRAINT "kameti_contributions_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kameti_groups" ADD CONSTRAINT "kameti_groups_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kameti_groups" ADD CONSTRAINT "kameti_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kameti_members" ADD CONSTRAINT "kameti_members_kameti_group_id_kameti_groups_id_fk" FOREIGN KEY ("kameti_group_id") REFERENCES "public"."kameti_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kameti_members" ADD CONSTRAINT "kameti_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kameti_payouts" ADD CONSTRAINT "kameti_payouts_kameti_group_id_kameti_groups_id_fk" FOREIGN KEY ("kameti_group_id") REFERENCES "public"."kameti_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kameti_payouts" ADD CONSTRAINT "kameti_payouts_member_id_kameti_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."kameti_members"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kameti_payouts" ADD CONSTRAINT "kameti_payouts_period_id_kameti_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."kameti_periods"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kameti_periods" ADD CONSTRAINT "kameti_periods_kameti_group_id_kameti_groups_id_fk" FOREIGN KEY ("kameti_group_id") REFERENCES "public"."kameti_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "merchants" ADD CONSTRAINT "merchants_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "merchants" ADD CONSTRAINT "merchants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_listings" ADD CONSTRAINT "service_listings_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_listings" ADD CONSTRAINT "service_listings_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_listings" ADD CONSTRAINT "service_listings_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_service_id_service_listings_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_listings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_community_id_idx" ON "audit_logs" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_type_entity_id_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communities_status_idx" ON "communities" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "communities_created_at_idx" ON "communities" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "community_memberships_community_user_idx" ON "community_memberships" USING btree ("community_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_memberships_community_id_idx" ON "community_memberships" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_memberships_user_id_idx" ON "community_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_memberships_role_idx" ON "community_memberships" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_members_conversation_user_idx" ON "conversation_members" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_members_user_id_idx" ON "conversation_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_community_id_idx" ON "conversations" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_type_idx" ON "conversations" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crowdfunding_contributions_project_id_idx" ON "crowdfunding_contributions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crowdfunding_contributions_contributor_id_idx" ON "crowdfunding_contributions" USING btree ("contributor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crowdfunding_contributions_status_idx" ON "crowdfunding_contributions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crowdfunding_projects_community_id_idx" ON "crowdfunding_projects" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crowdfunding_projects_creator_id_idx" ON "crowdfunding_projects" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crowdfunding_projects_status_idx" ON "crowdfunding_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crowdfunding_projects_project_type_idx" ON "crowdfunding_projects" USING btree ("project_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_assets_contract_id_idx" ON "finance_assets" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_contracts_community_id_idx" ON "finance_contracts" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_contracts_initiator_id_idx" ON "finance_contracts" USING btree ("initiator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_contracts_status_idx" ON "finance_contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_contracts_contract_type_idx" ON "finance_contracts" USING btree ("contract_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_documents_contract_id_idx" ON "finance_documents" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_participants_contract_id_idx" ON "finance_participants" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_participants_user_id_idx" ON "finance_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_reviews_contract_id_idx" ON "finance_reviews" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_reviews_status_idx" ON "finance_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_terms_contract_id_idx" ON "finance_terms" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_transactions_contract_id_idx" ON "finance_transactions" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_transactions_status_idx" ON "finance_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_contributions_group_id_idx" ON "kameti_contributions" USING btree ("kameti_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_contributions_member_id_idx" ON "kameti_contributions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_contributions_period_id_idx" ON "kameti_contributions" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_contributions_status_idx" ON "kameti_contributions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_groups_community_id_idx" ON "kameti_groups" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_groups_status_idx" ON "kameti_groups" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_groups_created_by_idx" ON "kameti_groups" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_members_group_id_idx" ON "kameti_members" USING btree ("kameti_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_members_user_id_idx" ON "kameti_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_payouts_group_id_idx" ON "kameti_payouts" USING btree ("kameti_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_payouts_member_id_idx" ON "kameti_payouts" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_payouts_period_id_idx" ON "kameti_payouts" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_payouts_status_idx" ON "kameti_payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_periods_group_id_idx" ON "kameti_periods" USING btree ("kameti_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kameti_periods_status_idx" ON "kameti_periods" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchants_community_id_idx" ON "merchants" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchants_user_id_idx" ON "merchants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "merchants_verification_status_idx" ON "merchants" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_community_id_idx" ON "notifications" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_read_at_idx" ON "notifications" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_community_order_number_idx" ON "orders" USING btree ("community_id","order_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_community_id_idx" ON "orders" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_merchant_id_idx" ON "orders" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_order_status_idx" ON "orders" USING btree ("order_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_payment_status_idx" ON "orders" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_records_community_id_idx" ON "payment_records" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_records_order_id_idx" ON "payment_records" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_records_status_idx" ON "payment_records" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_categories_community_slug_idx" ON "product_categories" USING btree ("community_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_categories_community_id_idx" ON "product_categories" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_images_product_id_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_community_id_idx" ON "products" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_merchant_id_idx" ON "products" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_community_merchant_idx" ON "products" USING btree ("community_id","merchant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_categories_community_id_idx" ON "service_categories" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_listings_community_id_idx" ON "service_listings" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_listings_provider_id_idx" ON "service_listings" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_listings_category_id_idx" ON "service_listings" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_listings_status_idx" ON "service_listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_requests_community_id_idx" ON "service_requests" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_requests_requester_id_idx" ON "service_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_requests_service_id_idx" ON "service_requests" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_requests_status_idx" ON "service_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_community_id_idx" ON "subscriptions" USING btree ("community_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" USING btree ("status");