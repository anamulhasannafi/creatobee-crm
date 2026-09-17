import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// 1. Admin Accounts
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("SUPER_ADMIN"),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Persistent Database Sessions (Production-safe across restarts & multi-process)
export const adminSessions = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  csrfToken: text("csrf_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Business Settings Control Center
export const businessSettings = pgTable("business_settings", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull().default("Creato Bee Digital Agency"),
  tagline: text("tagline").notNull().default("Enterprise Performance Marketing & Creative Systems"),
  email: text("email").notNull().default("billing@creatobee.com"),
  phone: text("phone").notNull().default("+880 1711-000000"),
  address: text("address").notNull().default("Level 9, Ventura Iconia, Banani, Dhaka-1213, Bangladesh"),
  website: text("website").notNull().default("https://creatobee.com"),
  taxId: text("tax_id").notNull().default("BIN-994820192-BD"),
  logoDataUri: text("logo_data_uri"),
  signatureDataUri: text("signature_data_uri"),
  faviconDataUri: text("favicon_data_uri"),
  // QR Code Control Center Settings
  qrMode: text("qr_mode").notNull().default("LOCAL_GENERATED"), // 'LOCAL_GENERATED' | 'UPLOADED_IMAGE'
  qrContentType: text("qr_content_type").notNull().default("INVOICE_VERIFICATION"), // 'URL' | 'TEXT' | 'PAYMENT_INFO' | 'WHATSAPP' | 'INVOICE_VERIFICATION'
  qrContent: text("qr_content").notNull().default("https://creatobee.com/pay?merchant=CREATOBEE-ERP"),
  qrDataUri: text("qr_data_uri"),
  qrLabel: text("qr_label").notNull().default("Scan for Instant Payment & Verification"),
  qrPlacement: text("qr_placement").notNull().default("BOTTOM_RIGHT"), // 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT'
  qrEnabledOnInvoices: boolean("qr_enabled_on_invoices").notNull().default(true),
  // Invoice & Currency Defaults
  invoicePrefix: text("invoice_prefix").notNull().default("CB-INV"),
  invoiceFooterNote: text("invoice_footer_note")
    .notNull()
    .default("Thank you for partnering with Creato Bee. Note: QR payment links do not constitute payment confirmation until verified in ledger."),
  defaultCurrency: text("default_currency").notNull().default("USD"),
  usdToBdtRate: doublePrecision("usd_to_bdt_rate").notNull().default(121.5),
  timezone: text("timezone").notNull().default("Asia/Dhaka"),
  paymentMethodsJson: text("payment_methods_json")
    .notNull()
    .default(JSON.stringify(["Bank Wire (SWIFT/ACH)", "bKash Merchant", "Stripe Corporate", "Payoneer", "Cash / Check"])),
  expenseCategoriesJson: text("expense_categories_json")
    .notNull()
    .default(JSON.stringify(["Server & Cloud Infrastructure", "Creative Software Licenses", "Contractor & Freelancer Payout", "Office Operations", "Marketing & PR", "Client Ad Spend Pass-Through"])),
  adPlatformsJson: text("ad_platforms_json")
    .notNull()
    .default(JSON.stringify(["Meta Ads (Facebook/Instagram)", "Google Ads (Search/YouTube)", "TikTok Business Ads", "LinkedIn B2B Ads", "X / Programmatic DSP"])),
  notificationsJson: text("notifications_json")
    .notNull()
    .default(JSON.stringify({ emailAlerts: true, overdueInvoiceAlerts: true, campaignExpiryHours: 24, lowBalanceWarning: true })),
  appearanceJson: text("appearance_json")
    .notNull()
    .default(JSON.stringify({ theme: "obsidian-gold", compactTables: false, showDualCurrencySubtext: true })),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 4. Historical Exchange Rates
export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  fromCurrency: text("from_currency").notNull().default("USD"),
  toCurrency: text("to_currency").notNull().default("BDT"),
  rate: doublePrecision("rate").notNull(),
  effectiveDate: text("effective_date").notNull(),
  note: text("note"),
  createdBy: text("created_by").notNull().default("System Admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 5. Agency Services Catalog
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  defaultPriceMinor: bigint("default_price_minor", { mode: "number" }).notNull(),
  currency: text("currency").notNull().default("USD"),
  billingCycle: text("billing_cycle").notNull().default("ONE_TIME"), // 'ONE_TIME' | 'MONTHLY' | 'CAMPAIGN'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. Clients CRM
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  country: text("country").notNull().default("United States"),
  preferredCurrency: text("preferred_currency").notNull().default("USD"),
  address: text("address"),
  taxNumber: text("tax_number"),
  status: text("status").notNull().default("ACTIVE"), // 'ACTIVE' | 'VIP' | 'ON_HOLD' | 'ARCHIVED'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. Client Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("CONFIRMED"), // 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  currency: text("currency").notNull().default("USD"),
  subtotalMinor: bigint("subtotal_minor", { mode: "number" }).notNull(),
  discountMinor: bigint("discount_minor", { mode: "number" }).notNull().default(0),
  taxMinor: bigint("tax_minor", { mode: "number" }).notNull().default(0),
  totalMinor: bigint("total_minor", { mode: "number" }).notNull(),
  exchangeRateSnapshot: doublePrecision("exchange_rate_snapshot").notNull(),
  convertedUsdMinor: bigint("converted_usd_minor", { mode: "number" }).notNull(),
  convertedBdtMinor: bigint("converted_bdt_minor", { mode: "number" }).notNull(),
  idempotencyKey: text("idempotency_key").unique(),
  dueDate: text("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Order Line Items
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").references(() => services.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPriceMinor: bigint("unit_price_minor", { mode: "number" }).notNull(),
  totalMinor: bigint("total_minor", { mode: "number" }).notNull(),
});

// 9. Professional Invoices (Strict invariant: totalMinor - paidMinor = outstandingMinor)
export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    invoiceNumber: text("invoice_number").notNull().unique(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    status: text("status").notNull().default("UNPAID"), // 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'REFUNDED'
    issueDate: text("issue_date").notNull(),
    dueDate: text("due_date").notNull(),
    currency: text("currency").notNull().default("USD"),
    subtotalMinor: bigint("subtotal_minor", { mode: "number" }).notNull(),
    discountMinor: bigint("discount_minor", { mode: "number" }).notNull().default(0),
    taxMinor: bigint("tax_minor", { mode: "number" }).notNull().default(0),
    adjustmentsMinor: bigint("adjustments_minor", { mode: "number" }).notNull().default(0),
    totalMinor: bigint("total_minor", { mode: "number" }).notNull(),
    paidMinor: bigint("paid_minor", { mode: "number" }).notNull().default(0),
    outstandingMinor: bigint("outstanding_minor", { mode: "number" }).notNull(),
    refundedMinor: bigint("refunded_minor", { mode: "number" }).notNull().default(0),
    exchangeRateSnapshot: doublePrecision("exchange_rate_snapshot").notNull(),
    convertedUsdMinor: bigint("converted_usd_minor", { mode: "number" }).notNull(),
    convertedBdtMinor: bigint("converted_bdt_minor", { mode: "number" }).notNull(),
    // Embedded QR & Branding Snapshot for immutable historical PDF generation
    qrDataUriSnapshot: text("qr_data_uri_snapshot"),
    qrContentSnapshot: text("qr_content_snapshot"),
    qrLabelSnapshot: text("qr_label_snapshot"),
    qrPlacementSnapshot: text("qr_placement_snapshot").default("BOTTOM_RIGHT"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_invoices_number").on(table.invoiceNumber)]
);

// 10. Invoice Line Items
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPriceMinor: bigint("unit_price_minor", { mode: "number" }).notNull(),
  totalMinor: bigint("total_minor", { mode: "number" }).notNull(),
});

// 11. Payments & Refunds (Idempotent & Transactional)
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  paymentReference: text("payment_reference").notNull().unique(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "restrict" }),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  type: text("type").notNull().default("PAYMENT"), // 'PAYMENT' | 'REFUND'
  method: text("method").notNull().default("Bank Wire (SWIFT/ACH)"),
  status: text("status").notNull().default("VERIFIED"), // 'VERIFIED' | 'PENDING' | 'VOIDED'
  originalCurrency: text("original_currency").notNull(),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  exchangeRateSnapshot: doublePrecision("exchange_rate_snapshot").notNull(),
  invoiceCurrencyAmountMinor: bigint("invoice_currency_amount_minor", { mode: "number" }).notNull(),
  convertedUsdMinor: bigint("converted_usd_minor", { mode: "number" }).notNull(),
  convertedBdtMinor: bigint("converted_bdt_minor", { mode: "number" }).notNull(),
  transactionId: text("transaction_id"),
  idempotencyKey: text("idempotency_key").unique(),
  paymentDate: text("payment_date").notNull(),
  notes: text("notes"),
  receiptFileId: integer("receipt_file_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 12. Expenses & Ad Spend Segregation
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  expenseNumber: text("expense_number").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  // Critical Accounting Segregation: AGENCY_OPERATING vs CLIENT_AD_SPEND
  expenseType: text("expense_type").notNull().default("AGENCY_OPERATING"), // 'AGENCY_OPERATING' | 'CLIENT_AD_SPEND'
  vendor: text("vendor").notNull(),
  originalCurrency: text("original_currency").notNull().default("USD"),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  exchangeRateSnapshot: doublePrecision("exchange_rate_snapshot").notNull(),
  convertedUsdMinor: bigint("converted_usd_minor", { mode: "number" }).notNull(),
  convertedBdtMinor: bigint("converted_bdt_minor", { mode: "number" }).notNull(),
  campaignId: integer("campaign_id"),
  clientId: integer("client_id"),
  expenseDate: text("expense_date").notNull(),
  receiptFileId: integer("receipt_file_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 13. Ad Campaigns (Time-aware deterministic status + manual overrides)
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  campaignCode: text("campaign_code").notNull().unique(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  objective: text("objective").notNull().default("Conversions & ROAS"),
  manualStatus: text("manual_status").notNull().default("ACTIVE"), // 'ACTIVE' | 'PAUSED' | 'CANCELLED'
  scheduledStartDate: text("scheduled_start_date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull().default("09:00"), // HH:mm
  endDate: text("end_date").notNull(), // YYYY-MM-DD
  endTime: text("end_time").notNull().default("23:59"), // HH:mm
  currency: text("currency").notNull().default("USD"),
  // Segregated financials: Client Ad Budget vs Agency Retainer/Management Fee vs Actual Spend
  clientBudgetMinor: bigint("client_budget_minor", { mode: "number" }).notNull(),
  agencyFeeMinor: bigint("agency_fee_minor", { mode: "number" }).notNull(),
  actualAdSpendMinor: bigint("actual_ad_spend_minor", { mode: "number" }).notNull().default(0),
  exchangeRateSnapshot: doublePrecision("exchange_rate_snapshot").notNull(),
  convertedUsdBudgetMinor: bigint("converted_usd_budget_minor", { mode: "number" }).notNull(),
  convertedBdtBudgetMinor: bigint("converted_bdt_budget_minor", { mode: "number" }).notNull(),
  convertedUsdFeeMinor: bigint("converted_usd_fee_minor", { mode: "number" }).notNull(),
  convertedBdtFeeMinor: bigint("converted_bdt_fee_minor", { mode: "number" }).notNull(),
  convertedUsdSpendMinor: bigint("converted_usd_spend_minor", { mode: "number" }).notNull(),
  convertedBdtSpendMinor: bigint("converted_bdt_spend_minor", { mode: "number" }).notNull(),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 14. Campaign Metrics History
export const campaignMetrics = pgTable("campaign_metrics", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  metricDate: text("metric_date").notNull(),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  spendMinor: bigint("spend_minor", { mode: "number" }).notNull().default(0),
});

// 15. Uploaded Files & Assets Registry
export const uploadedFiles = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  safeStorageName: text("safe_storage_name").notNull(),
  category: text("category").notNull().default("DOCUMENT"), // 'LOGO' | 'SIGNATURE' | 'QR_CODE' | 'RECEIPT' | 'DOCUMENT'
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: text("storage_path").notNull(),
  dataUri: text("data_uri").notNull(), // Ensures resilience even on ephemeral container storage
  isPublic: boolean("is_public").notNull().default(false),
  uploadedBy: text("uploaded_by").notNull().default("Admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 16. Backup Snapshots
export const backups = pgTable("backups", {
  id: serial("id").primaryKey(),
  backupCode: text("backup_code").notNull().unique(),
  label: text("label").notNull(),
  backupType: text("backup_type").notNull().default("FULL_SYSTEM_SNAPSHOT"),
  sizeBytes: integer("size_bytes").notNull(),
  recordCount: integer("record_count").notNull(),
  checksumSha256: text("checksum_sha256").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdBy: text("created_by").notNull().default("Admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 17. Structured Diagnostics & Audit Logs
export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull().default("INFO"), // 'INFO' | 'WARN' | 'ERROR' | 'SECURITY'
  category: text("category").notNull().default("SYSTEM"), // 'AUTH' | 'DATABASE' | 'MIGRATION' | 'QR_PDF' | 'UPLOAD' | 'FINANCE' | 'CAMPAIGN' | 'SYSTEM'
  diagnosticCode: text("diagnostic_code").notNull(),
  message: text("message").notNull(),
  metadataJson: text("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
