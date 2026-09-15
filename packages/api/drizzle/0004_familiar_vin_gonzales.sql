ALTER TABLE "crowdfunding_projects" ADD COLUMN "contract_type" varchar(50);--> statement-breakpoint
ALTER TABLE "crowdfunding_projects" ADD COLUMN "risk_disclosure" text;--> statement-breakpoint
ALTER TABLE "crowdfunding_projects" ADD COLUMN "expected_returns" text;--> statement-breakpoint
ALTER TABLE "crowdfunding_projects" ADD COLUMN "investment_thesis" text;--> statement-breakpoint
ALTER TABLE "crowdfunding_projects" ADD COLUMN "shariah_review_status" varchar(50) DEFAULT 'PENDING_REVIEW';--> statement-breakpoint
ALTER TABLE "crowdfunding_projects" ADD COLUMN "legal_status" varchar(100);--> statement-breakpoint
ALTER TABLE "crowdfunding_projects" ADD COLUMN "legal_gate_passed" varchar(20) DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "finance_contracts" ADD COLUMN "legal_status" "legal_status" DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_contracts" ADD COLUMN "execution_approved" varchar(20) DEFAULT 'NO' NOT NULL;