import { Router } from "express";
import { prisma } from "../prisma/client";
import { requireAuth } from "../middleware/auth";
import { AuthRequest } from "../types/auth";
import { ApiError } from "../middleware/errorHandler";

const router = Router();

/**
 * GET /kpi/actuals
 * ?rangeType=day|week|month|year
 * &userId=<optional, admin only>
 */
router.get("/actuals", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rangeType = (req.query.rangeType as string) || "month";
    const requestedUserId = req.query.userId as string | undefined;

    const isAdmin = req.user!.role === "ADMIN";
    const userId = isAdmin && requestedUserId ? requestedUserId : req.user!.id;

    if (requestedUserId && !isAdmin) {
      throw new ApiError(403, "Not authorized to view other users");
    }

    const now = new Date();

    let start: Date;
    let end: Date = now;

    switch (rangeType) {
      case "day":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case "week":
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case "month":
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const snapshots = await prisma.kpiSnapshot.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: end
        }
      }
    });

    const totals = snapshots.reduce(
      (acc, s) => {
        acc.calls += s.calls;
        acc.emails += s.emails;
        acc.meetingsBooked += s.meetingsBooked;
        acc.meetingsHeld += s.meetingsHeld;
        acc.opportunitiesCreated += s.opportunitiesCreated;
        acc.cleanOpportunities += s.cleanOpportunities;
        return acc;
      },
      {
        calls: 0,
        emails: 0,
        meetingsBooked: 0,
        meetingsHeld: 0,
        opportunitiesCreated: 0,
        cleanOpportunities: 0
      }
    );

    res.json({
      rangeType,
      startDate: start,
      endDate: end,
      metrics: totals
    });
  } catch (err) {
    next(err);
  }
});
/**
 * Forecast helpers
 */
type RangeType = "day" | "week" | "month" | "year";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getPeriod(rangeType: RangeType, now: Date) {
  const start = new Date(now);
  let endExclusive: Date;

  if (rangeType === "day") {
    start.setHours(0, 0, 0, 0);
    endExclusive = new Date(start);
    endExclusive.setDate(endExclusive.getDate() + 1);
  } else if (rangeType === "week") {
    // Sunday-start week (matches what you did in /actuals)
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    endExclusive = new Date(start);
    endExclusive.setDate(endExclusive.getDate() + 7);
  } else if (rangeType === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    endExclusive = new Date(start.getFullYear() + 1, 0, 1);
  } else {
    // month default
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    endExclusive = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  }

  const elapsedMs = now.getTime() - start.getTime();
  const totalMs = endExclusive.getTime() - start.getTime();
  const elapsedFraction = totalMs <= 0 ? 0 : clamp(elapsedMs / totalMs, 0, 1);

  return { start, endExclusive, elapsedFraction };
}

function scaleMonthlyQuota(monthly: number, rangeType: RangeType, now: Date) {
  if (rangeType === "month") return monthly;
  if (rangeType === "year") return monthly * 12;

  // For day/week, scale relative to days in current month (MVP approximation)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (rangeType === "week") return (monthly * 7) / daysInMonth;
  if (rangeType === "day") return monthly / daysInMonth;
  return monthly;
}

// pull quotas from markets assigned to a given user
async function getUserMonthlyQuotas(userId: string) {
  const markets = await prisma.userMarket.findMany({
    where: { userId },
    select: {
      market: {
        select: {
          quotaCalls: true,
          quotaEmails: true,
          quotaMeetingsBooked: true,
          quotaCleanOpportunities: true
        }
      }
    }
  });

  return markets.reduce(
    (acc, row) => {
      acc.calls += row.market.quotaCalls ?? 0;
      acc.emails += row.market.quotaEmails ?? 0;
      acc.meetingsBooked += row.market.quotaMeetingsBooked ?? 0;
      acc.cleanOpportunities += row.market.quotaCleanOpportunities ?? 0;
      return acc;
    },
    { calls: 0, emails: 0, meetingsBooked: 0, cleanOpportunities: 0 }
  );
}

/**
 * GET /kpi/forecast
 * ?rangeType=day|week|month|year
 * &userId=<optional, admin only>
 *
 * For ADMIN without userId -> aggregates across all users (quota summed per user; MVP behavior)
 */
router.get("/forecast", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rangeType = ((req.query.rangeType as string) || "month") as RangeType;
    const requestedUserId = req.query.userId as string | undefined;

    const isAdmin = req.user!.role === "ADMIN";
    if (requestedUserId && !isAdmin) throw new ApiError(403, "Not authorized to view other users");

    const now = new Date();
    const { start, endExclusive, elapsedFraction } = getPeriod(rangeType, now);

    // Determine scope: single user vs aggregate
    let userIds: string[] = [];

    if (isAdmin && !requestedUserId) {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true }
      });
      userIds = users.map((u) => u.id);
    } else {
      userIds = [isAdmin && requestedUserId ? requestedUserId : req.user!.id];
    }

    // Actuals so far: start -> now (inclusive)
    const snapshots = await prisma.kpiSnapshot.findMany({
      where: {
        userId: { in: userIds },
        date: { gte: start, lte: now }
      }
    });

    const actual = snapshots.reduce(
      (acc, s) => {
        acc.calls += s.calls;
        acc.emails += s.emails;
        acc.meetingsBooked += s.meetingsBooked;
        acc.meetingsHeld += s.meetingsHeld;
        acc.opportunitiesCreated += s.opportunitiesCreated;
        acc.cleanOpportunities += s.cleanOpportunities;
        return acc;
      },
      {
        calls: 0,
        emails: 0,
        meetingsBooked: 0,
        meetingsHeld: 0,
        opportunitiesCreated: 0,
        cleanOpportunities: 0
      }
    );

    // Quotas: sum monthly quotas for each user, then scale to selected period (MVP behavior)
    let monthlyQuotaTotals = { calls: 0, emails: 0, meetingsBooked: 0, cleanOpportunities: 0 };

    if (userIds.length === 1) {
      monthlyQuotaTotals = await getUserMonthlyQuotas(userIds[0]);
    } else {
      // aggregate: sum per user
      for (const uid of userIds) {
        const q = await getUserMonthlyQuotas(uid);
        monthlyQuotaTotals.calls += q.calls;
        monthlyQuotaTotals.emails += q.emails;
        monthlyQuotaTotals.meetingsBooked += q.meetingsBooked;
        monthlyQuotaTotals.cleanOpportunities += q.cleanOpportunities;
      }
    }

    const quota = {
      calls: scaleMonthlyQuota(monthlyQuotaTotals.calls, rangeType, now),
      emails: scaleMonthlyQuota(monthlyQuotaTotals.emails, rangeType, now),
      meetingsBooked: scaleMonthlyQuota(monthlyQuotaTotals.meetingsBooked, rangeType, now),
      cleanOpportunities: scaleMonthlyQuota(monthlyQuotaTotals.cleanOpportunities, rangeType, now),

      // No quotas defined in your Market model for these yet (MVP => quota 0)
      meetingsHeld: 0,
      opportunitiesCreated: 0
    };

    const buildLine = (actualVal: number, quotaVal: number) => {
      const expected = quotaVal * elapsedFraction;
      const projected = elapsedFraction > 0 ? actualVal / elapsedFraction : 0;
      const pacePct = quotaVal > 0 ? (projected / quotaVal) * 100 : null;
      return {
        actual: actualVal,
        expected,
        projected,
        quota: quotaVal,
        pacePct
      };
    };

    res.json({
      rangeType,
      startDate: start,
      endDateExclusive: endExclusive,
      elapsedFraction,
      kpis: {
        calls: buildLine(actual.calls, quota.calls),
        emails: buildLine(actual.emails, quota.emails),
        meetingsBooked: buildLine(actual.meetingsBooked, quota.meetingsBooked),
        meetingsHeld: buildLine(actual.meetingsHeld, quota.meetingsHeld),
        opportunitiesCreated: buildLine(actual.opportunitiesCreated, quota.opportunitiesCreated),
        cleanOpportunities: buildLine(actual.cleanOpportunities, quota.cleanOpportunities)
      }
    });
  } catch (err) {
    next(err);
  }
});


export default router;
