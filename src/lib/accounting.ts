/**
 * CREATo BEE — DECIMAL-SAFE ACCOUNTING & DETERMINISTIC CAMPAIGN ENGINE
 * All monetary amounts are stored and computed in minor currency units (cents / paisa).
 * 1.00 USD = 100 minor units
 * 1.00 BDT = 100 minor units
 */

export type CurrencyCode = "USD" | "BDT";

export function majorToMinor(majorAmount: number | string): number {
  const num = typeof majorAmount === "string" ? parseFloat(majorAmount) : majorAmount;
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function minorToMajor(minorAmount: number): number {
  return Math.round(minorAmount) / 100;
}

export function formatMinorCurrency(minorAmount: number, currency: string = "USD"): string {
  const isNegative = minorAmount < 0;
  const absMinor = Math.abs(Math.round(minorAmount));
  const major = Math.floor(absMinor / 100);
  const cents = String(absMinor % 100).padStart(2, "0");
  const formattedMajor = major.toLocaleString("en-US");
  const symbol = currency.toUpperCase() === "BDT" ? "৳" : "$";
  return `${isNegative ? "-" : ""}${symbol}${formattedMajor}.${cents}`;
}

/**
 * Computes USD and BDT minor unit snapshots from an original minor amount and exchange rate
 * without mutating the original transaction amount.
 */
export function computeCurrencySnapshots(
  amountMinor: number,
  originalCurrency: string,
  usdToBdtRate: number
): {
  originalMinor: number;
  originalCurrency: CurrencyCode;
  exchangeRateSnapshot: number;
  convertedUsdMinor: number;
  convertedBdtMinor: number;
} {
  const cleanMinor = Math.round(amountMinor);
  const safeRate = usdToBdtRate > 0 ? usdToBdtRate : 121.5;
  const cur = originalCurrency.toUpperCase() === "BDT" ? "BDT" : "USD";

  if (cur === "USD") {
    return {
      originalMinor: cleanMinor,
      originalCurrency: "USD",
      exchangeRateSnapshot: safeRate,
      convertedUsdMinor: cleanMinor,
      convertedBdtMinor: Math.round(cleanMinor * safeRate),
    };
  } else {
    return {
      originalMinor: cleanMinor,
      originalCurrency: "BDT",
      exchangeRateSnapshot: safeRate,
      convertedUsdMinor: Math.round(cleanMinor / safeRate),
      convertedBdtMinor: cleanMinor,
    };
  }
}

/**
 * Enforces strict accounting invariant:
 * Total = Subtotal - Discount + Tax + Adjustments
 * Net Paid = Verified Payments - Verified Refunds
 * Outstanding Balance = Max(0, Total - Net Paid)
 */
export function calculateInvoiceFinancials(params: {
  subtotalMinor: number;
  discountMinor?: number;
  taxMinor?: number;
  adjustmentsMinor?: number;
  paidMinor?: number;
  refundedMinor?: number;
  isCancelled?: boolean;
}) {
  const subtotalMinor = Math.max(0, Math.round(params.subtotalMinor || 0));
  const discountMinor = Math.max(0, Math.round(params.discountMinor || 0));
  const taxMinor = Math.max(0, Math.round(params.taxMinor || 0));
  const adjustmentsMinor = Math.round(params.adjustmentsMinor || 0);

  const totalMinor = Math.max(0, subtotalMinor - discountMinor + taxMinor + adjustmentsMinor);
  const paidMinor = Math.max(0, Math.round(params.paidMinor || 0));
  const refundedMinor = Math.max(0, Math.round(params.refundedMinor || 0));
  const netAppliedMinor = Math.max(0, paidMinor - refundedMinor);

  if (params.isCancelled) {
    return {
      subtotalMinor,
      discountMinor,
      taxMinor,
      adjustmentsMinor,
      totalMinor,
      paidMinor,
      refundedMinor,
      netAppliedMinor,
      outstandingMinor: 0,
      status: "CANCELLED" as const,
      invariantHolds: true,
    };
  }

  const outstandingMinor = Math.max(0, totalMinor - netAppliedMinor);
  let status: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "REFUNDED" = "UNPAID";

  if (refundedMinor > 0 && netAppliedMinor === 0) {
    status = "REFUNDED";
  } else if (outstandingMinor === 0 && totalMinor > 0) {
    status = "PAID";
  } else if (netAppliedMinor > 0 && outstandingMinor > 0) {
    status = "PARTIALLY_PAID";
  } else {
    status = "UNPAID";
  }

  const invariantHolds = totalMinor - netAppliedMinor === outstandingMinor || netAppliedMinor >= totalMinor;

  return {
    subtotalMinor,
    discountMinor,
    taxMinor,
    adjustmentsMinor,
    totalMinor,
    paidMinor,
    refundedMinor,
    netAppliedMinor,
    outstandingMinor,
    status,
    invariantHolds,
  };
}

/**
 * Deterministic Campaign Lifecycle Calculator
 * Evaluates Scheduled Start Date + Start Time, End Date + End Time, and Manual Override (PAUSED / CANCELLED)
 * without requiring a background worker process.
 */
export interface CampaignTimingInput {
  manualStatus: string; // 'ACTIVE' | 'PAUSED' | 'CANCELLED'
  scheduledStartDate: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm'
  endDate: string; // 'YYYY-MM-DD'
  endTime: string; // 'HH:mm'
}

export function computeCampaignLifecycleStatus(campaign: CampaignTimingInput, nowOverride?: Date): {
  computedStatus: "SCHEDULED" | "ACTIVE_RUNNING" | "PAUSED" | "COMPLETED_ENDED" | "CANCELLED";
  statusSource: "MANUAL_OVERRIDE" | "TIME_CALCULATED";
  badgeLabel: string;
  progressPercent: number;
  timeRemainingText: string;
} {
  const now = nowOverride || new Date();

  if (campaign.manualStatus === "CANCELLED") {
    return {
      computedStatus: "CANCELLED",
      statusSource: "MANUAL_OVERRIDE",
      badgeLabel: "Cancelled (Manual)",
      progressPercent: 0,
      timeRemainingText: "Terminated by administrator",
    };
  }

  if (campaign.manualStatus === "PAUSED") {
    return {
      computedStatus: "PAUSED",
      statusSource: "MANUAL_OVERRIDE",
      badgeLabel: "Paused (Manual)",
      progressPercent: 50,
      timeRemainingText: "Manually paused — resume to continue schedule",
    };
  }

  const startIso = `${campaign.scheduledStartDate}T${campaign.startTime || "00:00"}:00`;
  const endIso = `${campaign.endDate}T${campaign.endTime || "23:59"}:59`;

  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  const nowMs = now.getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return {
      computedStatus: "ACTIVE_RUNNING",
      statusSource: "TIME_CALCULATED",
      badgeLabel: "Active (Running)",
      progressPercent: 50,
      timeRemainingText: "Ongoing schedule",
    };
  }

  if (nowMs < startMs) {
    const hoursUntil = Math.max(1, Math.round((startMs - nowMs) / (1000 * 3600)));
    const daysUntil = Math.floor(hoursUntil / 24);
    return {
      computedStatus: "SCHEDULED",
      statusSource: "TIME_CALCULATED",
      badgeLabel: "Scheduled (Auto)",
      progressPercent: 0,
      timeRemainingText: daysUntil > 0 ? `Starts in ${daysUntil}d ${hoursUntil % 24}h` : `Starts in ${hoursUntil}h`,
    };
  }

  if (nowMs > endMs) {
    return {
      computedStatus: "COMPLETED_ENDED",
      statusSource: "TIME_CALCULATED",
      badgeLabel: "Completed (Auto)",
      progressPercent: 100,
      timeRemainingText: `Concluded on ${campaign.endDate} at ${campaign.endTime}`,
    };
  }

  const totalWindow = Math.max(1, endMs - startMs);
  const elapsed = Math.max(0, nowMs - startMs);
  const progressPercent = Math.min(99, Math.max(1, Math.round((elapsed / totalWindow) * 100)));
  const hoursLeft = Math.max(1, Math.round((endMs - nowMs) / (1000 * 3600)));
  const daysLeft = Math.floor(hoursLeft / 24);

  return {
    computedStatus: "ACTIVE_RUNNING",
    statusSource: "TIME_CALCULATED",
    badgeLabel: "Live Running (Auto)",
    progressPercent,
    timeRemainingText: daysLeft > 0 ? `${daysLeft}d ${hoursLeft % 24}h remaining` : `${hoursLeft}h remaining`,
  };
}
