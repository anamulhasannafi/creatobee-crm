CREATE TABLE "admin_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"admin_id" integer NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"csrf_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'SUPER_ADMIN' NOT NULL,
	"reset_token" text,
	"reset_token_expires_at" timestamp,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username"),
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" serial PRIMARY KEY NOT NULL,
	"backup_code" text NOT NULL,
	"label" text NOT NULL,
	"backup_type" text DEFAULT 'FULL_SYSTEM_SNAPSHOT' NOT NULL,
	"size_bytes" integer NOT NULL,
	"record_count" integer NOT NULL,
	"checksum_sha256" text NOT NULL,
	"payload_json" text NOT NULL,
	"created_by" text DEFAULT 'Admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "backups_backup_code_unique" UNIQUE("backup_code")
);
--> statement-breakpoint
CREATE TABLE "business_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_name" text DEFAULT 'Creato Bee Digital Agency' NOT NULL,
	"tagline" text DEFAULT 'Enterprise Performance Marketing & Creative Systems' NOT NULL,
	"email" text DEFAULT 'billing@creatobee.com' NOT NULL,
	"phone" text DEFAULT '+880 1711-000000' NOT NULL,
	"address" text DEFAULT 'Level 9, Ventura Iconia, Banani, Dhaka-1213, Bangladesh' NOT NULL,
	"website" text DEFAULT 'https://creatobee.com' NOT NULL,
	"tax_id" text DEFAULT 'BIN-994820192-BD' NOT NULL,
	"logo_data_uri" text,
	"signature_data_uri" text,
	"favicon_data_uri" text,
	"qr_mode" text DEFAULT 'LOCAL_GENERATED' NOT NULL,
	"qr_content_type" text DEFAULT 'INVOICE_VERIFICATION' NOT NULL,
	"qr_content" text DEFAULT 'https://creatobee.com/pay?merchant=CREATOBEE-ERP' NOT NULL,
	"qr_data_uri" text,
	"qr_label" text DEFAULT 'Scan for Instant Payment & Verification' NOT NULL,
	"qr_placement" text DEFAULT 'BOTTOM_RIGHT' NOT NULL,
	"qr_enabled_on_invoices" boolean DEFAULT true NOT NULL,
	"invoice_prefix" text DEFAULT 'CB-INV' NOT NULL,
	"invoice_footer_note" text DEFAULT 'Thank you for partnering with Creato Bee. Note: QR payment links do not constitute payment confirmation until verified in ledger.' NOT NULL,
	"default_currency" text DEFAULT 'USD' NOT NULL,
	"usd_to_bdt_rate" double precision DEFAULT 121.5 NOT NULL,
	"timezone" text DEFAULT 'Asia/Dhaka' NOT NULL,
	"payment_methods_json" text DEFAULT '["Bank Wire (SWIFT/ACH)","bKash Merchant","Stripe Corporate","Payoneer","Cash / Check"]' NOT NULL,
	"expense_categories_json" text DEFAULT '["Server & Cloud Infrastructure","Creative Software Licenses","Contractor & Freelancer Payout","Office Operations","Marketing & PR","Client Ad Spend Pass-Through"]' NOT NULL,
	"ad_platforms_json" text DEFAULT '["Meta Ads (Facebook/Instagram)","Google Ads (Search/YouTube)","TikTok Business Ads","LinkedIn B2B Ads","X / Programmatic DSP"]' NOT NULL,
	"notifications_json" text DEFAULT '{"emailAlerts":true,"overdueInvoiceAlerts":true,"campaignExpiryHours":24,"lowBalanceWarning":true}' NOT NULL,
	"appearance_json" text DEFAULT '{"theme":"obsidian-gold","compactTables":false,"showDualCurrencySubtext":true}' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"metric_date" text NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"spend_minor" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_code" text NOT NULL,
	"client_id" integer NOT NULL,
	"name" text NOT NULL,
	"platform" text NOT NULL,
	"objective" text DEFAULT 'Conversions & ROAS' NOT NULL,
	"manual_status" text DEFAULT 'ACTIVE' NOT NULL,
	"scheduled_start_date" text NOT NULL,
	"start_time" text DEFAULT '09:00' NOT NULL,
	"end_date" text NOT NULL,
	"end_time" text DEFAULT '23:59' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"client_budget_minor" bigint NOT NULL,
	"agency_fee_minor" bigint NOT NULL,
	"actual_ad_spend_minor" bigint DEFAULT 0 NOT NULL,
	"exchange_rate_snapshot" double precision NOT NULL,
	"converted_usd_budget_minor" bigint NOT NULL,
	"converted_bdt_budget_minor" bigint NOT NULL,
	"converted_usd_fee_minor" bigint NOT NULL,
	"converted_bdt_fee_minor" bigint NOT NULL,
	"converted_usd_spend_minor" bigint NOT NULL,
	"converted_bdt_spend_minor" bigint NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_campaign_code_unique" UNIQUE("campaign_code")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"company" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"country" text DEFAULT 'United States' NOT NULL,
	"preferred_currency" text DEFAULT 'USD' NOT NULL,
	"address" text,
	"tax_number" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_currency" text DEFAULT 'USD' NOT NULL,
	"to_currency" text DEFAULT 'BDT' NOT NULL,
	"rate" double precision NOT NULL,
	"effective_date" text NOT NULL,
	"note" text,
	"created_by" text DEFAULT 'System Admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"expense_number" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"expense_type" text DEFAULT 'AGENCY_OPERATING' NOT NULL,
	"vendor" text NOT NULL,
	"original_currency" text DEFAULT 'USD' NOT NULL,
	"amount_minor" bigint NOT NULL,
	"exchange_rate_snapshot" double precision NOT NULL,
	"converted_usd_minor" bigint NOT NULL,
	"converted_bdt_minor" bigint NOT NULL,
	"campaign_id" integer,
	"client_id" integer,
	"expense_date" text NOT NULL,
	"receipt_file_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_expense_number_unique" UNIQUE("expense_number")
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"total_minor" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"client_id" integer NOT NULL,
	"order_id" integer,
	"status" text DEFAULT 'UNPAID' NOT NULL,
	"issue_date" text NOT NULL,
	"due_date" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"subtotal_minor" bigint NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"adjustments_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint NOT NULL,
	"paid_minor" bigint DEFAULT 0 NOT NULL,
	"outstanding_minor" bigint NOT NULL,
	"refunded_minor" bigint DEFAULT 0 NOT NULL,
	"exchange_rate_snapshot" double precision NOT NULL,
	"converted_usd_minor" bigint NOT NULL,
	"converted_bdt_minor" bigint NOT NULL,
	"qr_data_uri_snapshot" text,
	"qr_content_snapshot" text,
	"qr_label_snapshot" text,
	"qr_placement_snapshot" text DEFAULT 'BOTTOM_RIGHT',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"service_id" integer,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"total_minor" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"client_id" integer NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'CONFIRMED' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"subtotal_minor" bigint NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"tax_minor" bigint DEFAULT 0 NOT NULL,
	"total_minor" bigint NOT NULL,
	"exchange_rate_snapshot" double precision NOT NULL,
	"converted_usd_minor" bigint NOT NULL,
	"converted_bdt_minor" bigint NOT NULL,
	"idempotency_key" text,
	"due_date" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_reference" text NOT NULL,
	"invoice_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"type" text DEFAULT 'PAYMENT' NOT NULL,
	"method" text DEFAULT 'Bank Wire (SWIFT/ACH)' NOT NULL,
	"status" text DEFAULT 'VERIFIED' NOT NULL,
	"original_currency" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"exchange_rate_snapshot" double precision NOT NULL,
	"invoice_currency_amount_minor" bigint NOT NULL,
	"converted_usd_minor" bigint NOT NULL,
	"converted_bdt_minor" bigint NOT NULL,
	"transaction_id" text,
	"idempotency_key" text,
	"payment_date" text NOT NULL,
	"notes" text,
	"receipt_file_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_payment_reference_unique" UNIQUE("payment_reference"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"default_price_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"billing_cycle" text DEFAULT 'ONE_TIME' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "services_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" text DEFAULT 'INFO' NOT NULL,
	"category" text DEFAULT 'SYSTEM' NOT NULL,
	"diagnostic_code" text NOT NULL,
	"message" text NOT NULL,
	"metadata_json" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"safe_storage_name" text NOT NULL,
	"category" text DEFAULT 'DOCUMENT' NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_path" text NOT NULL,
	"data_uri" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"uploaded_by" text DEFAULT 'Admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invoices_number" ON "invoices" USING btree ("invoice_number");