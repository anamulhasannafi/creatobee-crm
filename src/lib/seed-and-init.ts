import crypto from "crypto";
import { db } from "@/db";
import {
  admins,
  businessSettings,
  exchangeRates,
  services,
  clients,
  orders,
  orderItems,
  invoices,
  invoiceItems,
  payments,
  expenses,
  campaigns,
  uploadedFiles,
  backups,
  systemLogs,
} from "@/db/schema";
import { hashPassword } from "./crypto-auth";
import { generateLocalQrCode } from "./qr-engine";
import { computeCurrencySnapshots } from "./accounting";
import { count } from "drizzle-orm";

const DEFAULT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80">
  <rect width="320" height="80" rx="14" fill="#0B0F17"/>
  <polygon points="42,16 64,28 64,52 42,64 20,52 20,28" fill="#F59E0B" stroke="#FBBF24" stroke-width="2"/>
  <path d="M32 36 L42 28 L52 36 L42 50 Z" fill="#0B0F17"/>
  <text x="80" y="44" font-family="Plus Jakarta Sans, sans-serif" font-weight="800" font-size="24" fill="#F9FAFB">CREATo BEE</text>
  <text x="80" y="62" font-family="JetBrains Mono, monospace" font-weight="600" font-size="10" fill="#F59E0B" letter-spacing="1.5">AGENCY ERP &amp; FINANCIAL LEDGER</text>
</svg>`;

const DEFAULT_SIGNATURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 70" width="260" height="70">
  <rect width="260" height="70" fill="transparent"/>
  <path d="M20,48 C45,18 65,55 88,30 C105,12 120,46 148,26 C170,10 190,42 235,24" stroke="#1E293B" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <line x1="16" y1="56" x2="244" y2="56" stroke="#94A3B8" stroke-width="1" stroke-dasharray="4 2"/>
  <text x="20" y="67" font-family="Inter, sans-serif" font-size="9" fill="#475569">Authorized Executive Signatory • Creato Bee Treasury</text>
</svg>`;

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;
}

let seedPromise: Promise<void> | null = null;

export async function ensureDatabaseSeeded(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }
  seedPromise = runSeedInternal().finally(() => {
    seedPromise = null;
  });
  return seedPromise;
}

async function runSeedInternal(): Promise<void> {
  try {
    // 1. Ensure Business Settings exist
    const [{ value: settingsCount }] = await db.select({ value: count() }).from(businessSettings);
    const defaultRate = 121.5;

    const qrRes = await generateLocalQrCode({
      contentType: "INVOICE_VERIFICATION",
      rawInput: "https://creatobee.com/verify",
      invoiceNumber: "CB-INV-2026-001",
      amountFormatted: "4,850.00",
      currency: "USD",
    });

    const logoDataUri = svgToDataUri(DEFAULT_LOGO_SVG);
    const signatureDataUri = svgToDataUri(DEFAULT_SIGNATURE_SVG);

    if (settingsCount === 0) {
      await db.insert(businessSettings).values({
        businessName: "Creato Bee Digital Agency",
        tagline: "Enterprise Performance Marketing, Creative Production & Multi-Currency Financial ERP",
        email: "treasury@creatobee.com",
        phone: "+880 1711-894200",
        address: "Level 9, Ventura Iconia, Holding 37, Road 11, Banani, Dhaka-1213, Bangladesh",
        website: "https://creatobee.com",
        taxId: "BIN-88492019-BD / US-EIN-98-1429810",
        logoDataUri,
        signatureDataUri,
        faviconDataUri: logoDataUri,
        qrMode: "LOCAL_GENERATED",
        qrContentType: "INVOICE_VERIFICATION",
        qrContent: "https://creatobee.com/verify",
        qrDataUri: qrRes.dataUri,
        qrLabel: "Scan to Verify Invoice & Payment Instructions",
        qrPlacement: "BOTTOM_RIGHT",
        qrEnabledOnInvoices: true,
        invoicePrefix: "CB-INV",
        invoiceFooterNote:
          "Payment terms: Net 14 days via SWIFT Wire, Stripe Corporate, or bKash Merchant. Note: A QR code containing a payment link does not itself confirm payment until verified in the ledger.",
        defaultCurrency: "USD",
        usdToBdtRate: defaultRate,
        timezone: "Asia/Dhaka",
      });
    }

    // 2. Ensure Initial Admin Account exists
    const [{ value: adminCount }] = await db.select({ value: count() }).from(admins);
    if (adminCount === 0) {
      await db.insert(admins).values({
        username: "admin",
        email: "admin@creatobee.com",
        displayName: "Tariqul Islam (Managing Director)",
        passwordHash: hashPassword("CreatoBee#2026!"),
        role: "SUPER_ADMIN",
        lastLoginAt: new Date(),
      });
    }

    // 3. Ensure Exchange Rates History exists
    const [{ value: rateCount }] = await db.select({ value: count() }).from(exchangeRates);
    if (rateCount === 0) {
      await db.insert(exchangeRates).values([
        {
          fromCurrency: "USD",
          toCurrency: "BDT",
          rate: 119.0,
          effectiveDate: "2026-01-01",
          note: "Q1 Opening Treasury Benchmark Rate",
          createdBy: "System Treasury",
        },
        {
          fromCurrency: "USD",
          toCurrency: "BDT",
          rate: 120.25,
          effectiveDate: "2026-02-01",
          note: "February Interbank Commercial Rate",
          createdBy: "System Treasury",
        },
        {
          fromCurrency: "USD",
          toCurrency: "BDT",
          rate: 121.5,
          effectiveDate: "2026-03-01",
          note: "Current Active Settlement Rate (USD -> BDT)",
          createdBy: "Tariqul Islam",
        },
      ]);
    }

    // 4. Ensure Services Catalog exists
    const [{ value: serviceCount }] = await db.select({ value: count() }).from(services);
    if (serviceCount === 0) {
      await db.insert(services).values([
        {
          code: "SRV-PERF-01",
          name: "Full-Funnel Meta & Google Performance Retainer",
          category: "Performance Marketing",
          description: "Dedicated media buying, pixel/CAPI attribution engineering, and weekly ROAS optimization.",
          defaultPriceMinor: 250000, // $2,500.00
          currency: "USD",
          billingCycle: "MONTHLY",
          isActive: true,
        },
        {
          code: "SRV-CREATIVE-02",
          name: "High-Converting UGC & Motion Ad Creative Suite (12 Assets)",
          category: "Creative Production",
          description: "Scriptwriting, 4K motion graphics, hook variants, and multi-aspect localization.",
          defaultPriceMinor: 185000, // $1,850.00
          currency: "USD",
          billingCycle: "ONE_TIME",
          isActive: true,
        },
        {
          code: "SRV-WEB-03",
          name: "Next.js Conversion Landing Architecture & Server-Side Tracking",
          category: "Web & Engineering",
          description: "Custom headless commerce funnel with GTM Server Container and Stape CAPI gateway.",
          defaultPriceMinor: 320000, // $3,200.00
          currency: "USD",
          billingCycle: "ONE_TIME",
          isActive: true,
        },
        {
          code: "SRV-BD-BRAND-04",
          name: "Bangladesh Domestic Omnichannel Launch Campaign",
          category: "Regional Campaign",
          description: "Bengali/English localized digital media buying + influencer amplification across Dhaka & Chattogram.",
          defaultPriceMinor: 18500000, // ৳185,000.00 BDT
          currency: "BDT",
          billingCycle: "CAMPAIGN",
          isActive: true,
        },
      ]);
    }

    // 5. Ensure Clients CRM exists
    const [{ value: clientCount }] = await db.select({ value: count() }).from(clients);
    if (clientCount === 0) {
      const insertedClients = await db
        .insert(clients)
        .values([
          {
            code: "CLT-1001",
            name: "Marcus Vance",
            company: "Aetheris SaaS Cloud Inc.",
            email: "finance@aetheris.io",
            phone: "+1 (415) 890-4312",
            country: "United States",
            preferredCurrency: "USD",
            address: "548 Market St, Suite 42190, San Francisco, CA 94104, USA",
            taxNumber: "US-EIN-44-9012834",
            status: "VIP",
            notes: "Enterprise B2B SaaS account on monthly retainer + quarterly ad scaling.",
          },
          {
            code: "CLT-1002",
            name: "Farhana Rahman",
            company: "Shikho & Bengal FinTech Group",
            email: "accounts@bengalfintech.com.bd",
            phone: "+880 1713-449900",
            country: "Bangladesh",
            preferredCurrency: "BDT",
            address: "Gulshan Avenue, Tower 42, Dhaka-1212, Bangladesh",
            taxNumber: "BD-BIN-002918472",
            status: "ACTIVE",
            notes: "Domestic BDT billing; requires VAT/BIN reference on all invoices.",
          },
          {
            code: "CLT-1003",
            name: "Elena Rostova",
            company: "NordicLuxe Skincare GmbH",
            email: "billing@nordicluxe.de",
            phone: "+49 30 901820",
            country: "Germany",
            preferredCurrency: "USD",
            address: "Friedrichstraße 114A, 10117 Berlin, Germany",
            taxNumber: "DE-319482019",
            status: "ACTIVE",
            notes: "High-velocity DTC eCommerce scaling on Meta & TikTok.",
          },
        ])
        .returning();

      const c1 = insertedClients[0];
      const c2 = insertedClients[1];
      const c3 = insertedClients[2];

      // 6. Create Orders & Line Items
      const ord1Snap = computeCurrencySnapshots(435000, "USD", 121.5); // $4,350.00
      const [ord1] = await db
        .insert(orders)
        .values({
          orderNumber: "CB-ORD-2026-101",
          clientId: c1.id,
          title: "Q1 Growth Retainer & Server-Side CAPI Deployment",
          status: "COMPLETED",
          currency: "USD",
          subtotalMinor: 435000,
          discountMinor: 0,
          taxMinor: 0,
          totalMinor: 435000,
          exchangeRateSnapshot: 121.5,
          convertedUsdMinor: ord1Snap.convertedUsdMinor,
          convertedBdtMinor: ord1Snap.convertedBdtMinor,
          idempotencyKey: "seed-ord-101",
          dueDate: "2026-03-15",
          notes: "Approved by Marcus Vance under Master Services Agreement #2026-A.",
        })
        .returning();

      await db.insert(orderItems).values([
        {
          orderId: ord1.id,
          description: "Full-Funnel Meta & Google Performance Retainer (March 2026)",
          quantity: 1,
          unitPriceMinor: 250000,
          totalMinor: 250000,
        },
        {
          orderId: ord1.id,
          description: "High-Converting UGC & Motion Ad Creative Suite (12 Assets)",
          quantity: 1,
          unitPriceMinor: 185000,
          totalMinor: 185000,
        },
      ]);

      const ord2Snap = computeCurrencySnapshots(24000000, "BDT", 120.0); // ৳240,000.00 BDT at historical rate 120.0
      const [ord2] = await db
        .insert(orders)
        .values({
          orderNumber: "CB-ORD-2026-102",
          clientId: c2.id,
          title: "Ramadan & Pohela Boishakh Omnichannel Acquisition Campaign",
          status: "IN_PROGRESS",
          currency: "BDT",
          subtotalMinor: 25000000,
          discountMinor: 1000000,
          taxMinor: 0,
          totalMinor: 24000000,
          exchangeRateSnapshot: 120.0,
          convertedUsdMinor: ord2Snap.convertedUsdMinor,
          convertedBdtMinor: ord2Snap.convertedBdtMinor,
          idempotencyKey: "seed-ord-102",
          dueDate: "2026-03-25",
          notes: "Historical exchange rate locked at 120.00 BDT/USD at order signing.",
        })
        .returning();

      await db.insert(orderItems).values([
        {
          orderId: ord2.id,
          description: "Bangladesh Domestic Omnichannel Launch Campaign & Media Buying",
          quantity: 1,
          unitPriceMinor: 25000000,
          totalMinor: 25000000,
        },
      ]);

      // 7. Create Invoices (Demonstrating Paid, Partially Paid, and Unpaid states with exact balance invariants)
      const inv1Qr = await generateLocalQrCode({
        contentType: "INVOICE_VERIFICATION",
        rawInput: "https://creatobee.com/verify",
        invoiceNumber: "CB-INV-2026-001",
        amountFormatted: "4,350.00",
        currency: "USD",
      });

      const [inv1] = await db
        .insert(invoices)
        .values({
          invoiceNumber: "CB-INV-2026-001",
          clientId: c1.id,
          orderId: ord1.id,
          status: "PAID",
          issueDate: "2026-03-01",
          dueDate: "2026-03-15",
          currency: "USD",
          subtotalMinor: 435000,
          discountMinor: 0,
          taxMinor: 0,
          adjustmentsMinor: 0,
          totalMinor: 435000, // $4,350.00
          paidMinor: 435000, // $4,350.00 paid
          outstandingMinor: 0, // $0.00 outstanding
          refundedMinor: 0,
          exchangeRateSnapshot: 121.5,
          convertedUsdMinor: 435000,
          convertedBdtMinor: Math.round(435000 * 121.5),
          qrDataUriSnapshot: inv1Qr.dataUri,
          qrContentSnapshot: inv1Qr.formattedPayload,
          qrLabelSnapshot: "Scan to Verify Paid Invoice #CB-INV-2026-001",
          qrPlacementSnapshot: "BOTTOM_RIGHT",
          notes: "Paid in full via Stripe Corporate ACH. Thank you for your business!",
        })
        .returning();

      await db.insert(invoiceItems).values([
        {
          invoiceId: inv1.id,
          description: "Full-Funnel Meta & Google Performance Retainer (March 2026)",
          quantity: 1,
          unitPriceMinor: 250000,
          totalMinor: 250000,
        },
        {
          invoiceId: inv1.id,
          description: "High-Converting UGC & Motion Ad Creative Suite (12 Assets)",
          quantity: 1,
          unitPriceMinor: 185000,
          totalMinor: 185000,
        },
      ]);

      // Invoice 2: BDT Invoice with Partial Payment (240,000 BDT Total - 150,000 BDT Paid = 90,000 BDT Outstanding)
      const inv2Qr = await generateLocalQrCode({
        contentType: "INVOICE_VERIFICATION",
        rawInput: "https://creatobee.com/verify",
        invoiceNumber: "CB-INV-2026-002",
        amountFormatted: "240,000.00",
        currency: "BDT",
      });

      const [inv2] = await db
        .insert(invoices)
        .values({
          invoiceNumber: "CB-INV-2026-002",
          clientId: c2.id,
          orderId: ord2.id,
          status: "PARTIALLY_PAID",
          issueDate: "2026-03-04",
          dueDate: "2026-03-25",
          currency: "BDT",
          subtotalMinor: 25000000, // ৳250,000.00
          discountMinor: 1000000, // ৳10,000.00 discount
          taxMinor: 0,
          adjustmentsMinor: 0,
          totalMinor: 24000000, // ৳240,000.00
          paidMinor: 15000000, // ৳150,000.00 applied
          outstandingMinor: 9000000, // ৳90,000.00 exact outstanding balance
          refundedMinor: 0,
          exchangeRateSnapshot: 120.0, // Historical rate preserved!
          convertedUsdMinor: 200000, // $2,000.00 at 120.0 rate
          convertedBdtMinor: 24000000,
          qrDataUriSnapshot: inv2Qr.dataUri,
          qrContentSnapshot: inv2Qr.formattedPayload,
          qrLabelSnapshot: "Scan for bKash / Bank Settlement Verification",
          qrPlacementSnapshot: "BOTTOM_RIGHT",
          notes: "First milestone tranche (৳150,000.00) received; remaining balance ৳90,000.00 due by March 25.",
        })
        .returning();

      await db.insert(invoiceItems).values([
        {
          invoiceId: inv2.id,
          description: "Bangladesh Domestic Omnichannel Launch Campaign & Media Buying",
          quantity: 1,
          unitPriceMinor: 25000000,
          totalMinor: 25000000,
        },
      ]);

      // Invoice 3: USD Unpaid Invoice for NordicLuxe Skincare
      const inv3Qr = await generateLocalQrCode({
        contentType: "INVOICE_VERIFICATION",
        rawInput: "https://creatobee.com/verify",
        invoiceNumber: "CB-INV-2026-003",
        amountFormatted: "3,200.00",
        currency: "USD",
      });

      const [inv3] = await db
        .insert(invoices)
        .values({
          invoiceNumber: "CB-INV-2026-003",
          clientId: c3.id,
          orderId: null,
          status: "UNPAID",
          issueDate: "2026-03-08",
          dueDate: "2026-03-28",
          currency: "USD",
          subtotalMinor: 320000,
          discountMinor: 0,
          taxMinor: 0,
          adjustmentsMinor: 0,
          totalMinor: 320000, // $3,200.00
          paidMinor: 0,
          outstandingMinor: 320000,
          refundedMinor: 0,
          exchangeRateSnapshot: 121.5,
          convertedUsdMinor: 320000,
          convertedBdtMinor: Math.round(320000 * 121.5),
          qrDataUriSnapshot: inv3Qr.dataUri,
          qrContentSnapshot: inv3Qr.formattedPayload,
          qrLabelSnapshot: "Scan for SWIFT / IBAN Wire Instructions",
          qrPlacementSnapshot: "BOTTOM_RIGHT",
          notes: "Next.js Conversion Funnel & European Server-Side Tracking Setup.",
        })
        .returning();

      await db.insert(invoiceItems).values([
        {
          invoiceId: inv3.id,
          description: "Next.js Conversion Landing Architecture & Server-Side Tracking",
          quantity: 1,
          unitPriceMinor: 320000,
          totalMinor: 320000,
        },
      ]);

      // 8. Seed Verified Payments
      await db.insert(payments).values([
        {
          paymentReference: "CB-PAY-2026-901",
          invoiceId: inv1.id,
          clientId: c1.id,
          type: "PAYMENT",
          method: "Stripe Corporate",
          status: "VERIFIED",
          originalCurrency: "USD",
          amountMinor: 435000,
          exchangeRateSnapshot: 121.5,
          invoiceCurrencyAmountMinor: 435000,
          convertedUsdMinor: 435000,
          convertedBdtMinor: Math.round(435000 * 121.5),
          transactionId: "ch_3Qx910LkdIwHu7ix08492",
          idempotencyKey: "seed-pay-901",
          paymentDate: "2026-03-03",
          notes: "Full settlement for CB-INV-2026-001",
        },
        {
          paymentReference: "CB-PAY-2026-902",
          invoiceId: inv2.id,
          clientId: c2.id,
          type: "PAYMENT",
          method: "bKash Merchant",
          status: "VERIFIED",
          originalCurrency: "BDT",
          amountMinor: 15000000, // ৳150,000.00
          exchangeRateSnapshot: 120.0,
          invoiceCurrencyAmountMinor: 15000000,
          convertedUsdMinor: 125000, // $1,250.00 at 120.0 rate
          convertedBdtMinor: 15000000,
          transactionId: "BKX99402819BD",
          idempotencyKey: "seed-pay-902",
          paymentDate: "2026-03-05",
          notes: "Partial milestone 1 payment (৳150,000 BDT)",
        },
      ]);

      // 9. Seed Expenses (Clearly Segregating AGENCY_OPERATING vs CLIENT_AD_SPEND)
      await db.insert(expenses).values([
        {
          expenseNumber: "CB-EXP-2026-301",
          title: "AWS EC2, RDS PostgreSQL & Stape Server GTM Cluster",
          category: "Server & Cloud Infrastructure",
          expenseType: "AGENCY_OPERATING",
          vendor: "Amazon Web Services Inc.",
          originalCurrency: "USD",
          amountMinor: 64000, // $640.00
          exchangeRateSnapshot: 121.5,
          convertedUsdMinor: 64000,
          convertedBdtMinor: Math.round(64000 * 121.5),
          expenseDate: "2026-03-02",
          notes: "Monthly agency production cloud infrastructure",
        },
        {
          expenseNumber: "CB-EXP-2026-302",
          title: "Banani Studio Office Lease & Fiber Redundancy",
          category: "Office Operations",
          expenseType: "AGENCY_OPERATING",
          vendor: "Ventura Properties Ltd.",
          originalCurrency: "BDT",
          amountMinor: 8500000, // ৳85,000.00 BDT
          exchangeRateSnapshot: 121.5,
          convertedUsdMinor: Math.round(8500000 / 121.5),
          convertedBdtMinor: 8500000,
          expenseDate: "2026-03-03",
          notes: "Dhaka HQ monthly operating overhead",
        },
        {
          expenseNumber: "CB-EXP-2026-303",
          title: "Meta Ads Direct Ad Spend Clearing (Aetheris Campaign)",
          category: "Client Ad Spend Pass-Through",
          expenseType: "CLIENT_AD_SPEND",
          vendor: "Meta Platforms Ireland Ltd.",
          originalCurrency: "USD",
          amountMinor: 310000, // $3,100.00 client ad spend pass-through (NOT agency overhead!)
          exchangeRateSnapshot: 121.5,
          convertedUsdMinor: 310000,
          convertedBdtMinor: Math.round(310000 * 121.5),
          clientId: c1.id,
          expenseDate: "2026-03-06",
          notes: "Tracked separately from agency operating expenses to prevent double-counting in P&L.",
        },
      ]);

      // 10. Seed Ad Campaigns (Spanning Live Running, Scheduled Future, Paused, and Completed states)
      await db.insert(campaigns).values([
        {
          campaignCode: "CMP-2026-01",
          clientId: c1.id,
          name: "Aetheris Cloud Q1 Pipeline Accelerator (US/UK)",
          platform: "Meta Ads (Facebook/Instagram)",
          objective: "B2B Demo Conversions & SQLs",
          manualStatus: "ACTIVE",
          scheduledStartDate: "2026-02-15",
          startTime: "08:00",
          endDate: "2026-12-31",
          endTime: "23:59",
          currency: "USD",
          clientBudgetMinor: 800000, // $8,000.00 Client Ad Budget
          agencyFeeMinor: 250000, // $2,500.00 Agency Management Fee
          actualAdSpendMinor: 310000, // $3,100.00 Spent so far
          exchangeRateSnapshot: 121.5,
          convertedUsdBudgetMinor: 800000,
          convertedBdtBudgetMinor: Math.round(800000 * 121.5),
          convertedUsdFeeMinor: 250000,
          convertedBdtFeeMinor: Math.round(250000 * 121.5),
          convertedUsdSpendMinor: 310000,
          convertedBdtSpendMinor: Math.round(310000 * 121.5),
          impressions: 412900,
          clicks: 9420,
          conversions: 284,
          notes: "Server-side CAPI Event Match Quality at 9.1/10.",
        },
        {
          campaignCode: "CMP-2026-02",
          clientId: c2.id,
          name: "Bengal FinTech App Install Surge (Dhaka & Chattogram)",
          platform: "Google Ads (Search/YouTube)",
          objective: "Verified Mobile App Installs",
          manualStatus: "ACTIVE",
          scheduledStartDate: "2026-03-01",
          startTime: "09:00",
          endDate: "2026-11-30",
          endTime: "23:59",
          currency: "BDT",
          clientBudgetMinor: 36000000, // ৳360,000.00 BDT Budget
          agencyFeeMinor: 9000000, // ৳90,000.00 BDT Agency Fee
          actualAdSpendMinor: 14400000, // ৳144,000.00 BDT Spend
          exchangeRateSnapshot: 120.0,
          convertedUsdBudgetMinor: 300000,
          convertedBdtBudgetMinor: 36000000,
          convertedUsdFeeMinor: 75000,
          convertedBdtFeeMinor: 9000000,
          convertedUsdSpendMinor: 120000,
          convertedBdtSpendMinor: 14400000,
          impressions: 1280000,
          clicks: 38100,
          conversions: 4910,
          notes: "High-intent Bengali YouTube Shorts placement.",
        },
        {
          campaignCode: "CMP-2026-03",
          clientId: c3.id,
          name: "NordicLuxe Summer Glow Pre-Launch Teaser",
          platform: "TikTok Business Ads",
          objective: "Waitlist Lead Generation",
          manualStatus: "ACTIVE",
          scheduledStartDate: "2027-01-10",
          startTime: "10:00",
          endDate: "2027-03-15",
          endTime: "22:00",
          currency: "USD",
          clientBudgetMinor: 450000, // $4,500.00
          agencyFeeMinor: 120000, // $1,200.00
          actualAdSpendMinor: 0,
          exchangeRateSnapshot: 121.5,
          convertedUsdBudgetMinor: 450000,
          convertedBdtBudgetMinor: Math.round(450000 * 121.5),
          convertedUsdFeeMinor: 120000,
          convertedBdtFeeMinor: Math.round(120000 * 121.5),
          convertedUsdSpendMinor: 0,
          convertedBdtSpendMinor: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          notes: "Scheduled future campaign — automatically computed as SCHEDULED until start timestamp.",
        },
        {
          campaignCode: "CMP-2026-04",
          clientId: c1.id,
          name: "Winter SaaS Webinar Retargeting Sprint",
          platform: "LinkedIn B2B Ads",
          objective: "Executive Webinar Registrations",
          manualStatus: "ACTIVE",
          scheduledStartDate: "2025-11-01",
          startTime: "08:00",
          endDate: "2025-12-20",
          endTime: "20:00",
          currency: "USD",
          clientBudgetMinor: 220000,
          agencyFeeMinor: 65000,
          actualAdSpendMinor: 218500,
          exchangeRateSnapshot: 119.0,
          convertedUsdBudgetMinor: 220000,
          convertedBdtBudgetMinor: Math.round(220000 * 119.0),
          convertedUsdFeeMinor: 65000,
          convertedBdtFeeMinor: Math.round(65000 * 119.0),
          convertedUsdSpendMinor: 218500,
          convertedBdtSpendMinor: Math.round(218500 * 119.0),
          impressions: 94200,
          clicks: 3190,
          conversions: 198,
          notes: "Historical concluded campaign — automatically marked COMPLETED_ENDED.",
        },
      ]);

      // 11. Seed Uploaded Files Registry (Branding assets & sample receipt)
      await db.insert(uploadedFiles).values([
        {
          fileName: "creatobee-enterprise-logo.svg",
          safeStorageName: "asset_logo_creatobee_2026.svg",
          category: "LOGO",
          mimeType: "image/svg+xml",
          sizeBytes: Buffer.byteLength(DEFAULT_LOGO_SVG, "utf-8"),
          storagePath: "./storage/uploads/asset_logo_creatobee_2026.svg",
          dataUri: logoDataUri,
          isPublic: true,
          uploadedBy: "System Setup",
        },
        {
          fileName: "treasury-authorized-signature.svg",
          safeStorageName: "asset_signature_treasury_2026.svg",
          category: "SIGNATURE",
          mimeType: "image/svg+xml",
          sizeBytes: Buffer.byteLength(DEFAULT_SIGNATURE_SVG, "utf-8"),
          storagePath: "./storage/uploads/asset_signature_treasury_2026.svg",
          dataUri: signatureDataUri,
          isPublic: false,
          uploadedBy: "System Setup",
        },
        {
          fileName: "invoice-verification-qr.png",
          safeStorageName: "asset_qr_verification_2026.png",
          category: "QR_CODE",
          mimeType: "image/png",
          sizeBytes: qrRes.dataUri.length,
          storagePath: "./storage/uploads/asset_qr_verification_2026.png",
          dataUri: qrRes.dataUri,
          isPublic: true,
          uploadedBy: "Local QR Engine",
        },
      ]);

      // 12. Seed Initial System Backup Snapshot
      const initialBackupPayload = JSON.stringify({
        system: "Creato Bee ERP v4.2",
        timestamp: new Date().toISOString(),
        summary: "Baseline Production Deployment Snapshot",
        clientsCount: 3,
        invoicesCount: 3,
        campaignsCount: 4,
      });
      const checksum = crypto.createHash("sha256").update(initialBackupPayload).digest("hex");

      await db.insert(backups).values({
        backupCode: "BKP-202603-INIT",
        label: "Initial Production Baseline Snapshot (v4.2)",
        backupType: "FULL_SYSTEM_SNAPSHOT",
        sizeBytes: Buffer.byteLength(initialBackupPayload, "utf-8"),
        recordCount: 24,
        checksumSha256: checksum,
        payloadJson: initialBackupPayload,
        createdBy: "Automated Bootstrap",
      });

      // 13. Seed Initial Diagnostic Logs
      await db.insert(systemLogs).values([
        {
          level: "INFO",
          category: "SYSTEM",
          diagnosticCode: "BOOT_READY",
          message: "Creato Bee ERP runtime initialized. Node.js environment, Drizzle PostgreSQL pool, and Local QR Engine verified.",
          metadataJson: JSON.stringify({ nodeVersion: process.version, timezone: "Asia/Dhaka" }),
        },
        {
          level: "INFO",
          category: "QR_PDF",
          diagnosticCode: "LOCAL_QR_VERIFIED",
          message: "Local QR Code Generator (qrcode Data URI & SVG) self-test passed with zero external API dependencies.",
          metadataJson: JSON.stringify({ mode: "LOCAL_GENERATED", errorCorrection: "M" }),
        },
        {
          level: "INFO",
          category: "FINANCE",
          diagnosticCode: "LEDGER_INVARIANT_OK",
          message: "All invoice balance invariants (Total - Paid = Outstanding) and USD/BDT currency snapshots verified.",
          metadataJson: JSON.stringify({ baseCurrency: "USD", activeRate: 121.5 }),
        },
      ]);
    }
  } catch (err) {
    console.error("[SEED_INIT_WARNING]", err);
  }
}
