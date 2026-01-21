// backend/src/routes/kpi.routes.ts
import { Router } from "express";
import { prisma } from "../prisma/client";
import { requireAuth } from "../middleware/auth";
import { AuthRequest } from "../types/auth";
import { ApiError } from "../middleware/errorHandler";

const router = Router();

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
    // Sunday-start week (matches earlier logic)
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

async function getMonthlyQuotasForUsers(userIds: string[]) {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isActive: true },
    select: {
      quotaCalls: true,
      quotaEmails: true,
      quotaMeetingsBooked: true,
      quotaCleanOpportunities: true
    }
  });

  return users.reduce(
    (acc, u) => {
      acc.calls += u.quotaCalls ?? 0;
      acc.emails += u.quotaEmails ?? 0;
      acc.meetingsBooked += u.quotaMeetingsBooked ?? 0;
      acc.cleanOpportunities += u.quotaCleanOpportunities ?? 0;
      return acc;
    },
    { calls: 0, emails: 0, meetingsBooked: 0, cleanOpportunities: 0 }
  );
}

/**
 * GET /kpi/actuals
 * ?rangeType=day|week|month|year
 * &userId=<optional>
 *
 * BASIC: ignores userId (returns own)
 * ADMIN: if userId omitted => aggregate all active users
 */
router.get("/actuals", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rangeType = ((req.query.rangeType as string) || "month") as RangeType;
    const requestedUserId = req.query.userId as string | undefined;

    const isAdmin = req.user!.role === "ADMIN";

    let userIds: string[] = [];
    if (isAdmin) {
      if (requestedUserId) {
        userIds = [requestedUserId];
      } else {
        const users = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true }
        });
        userIds = users.map((u) => u.id);
      }
    } else {
      if (requestedUserId) throw new ApiError(403, "Not authorized to view other users");
      userIds = [req.user!.id];
    }

    const now = new Date();
    const { start } = getPeriod(rangeType, now);

    const snapshots = await prisma.kpiSnapshot.findMany({
      where: {
        userId: { in: userIds },
        date: { gte: start, lte: now }
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
      endDate: now,
      metrics: totals
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /kpi/forecast
 * ?rangeType=day|week|month|year
 * &userId=<optional>
 *
 * BASIC: ignores userId (returns own)
 * ADMIN: if userId omitted => aggregate all active users
 *
 * Forecast logic: pacing vs quota (Option B)
 */
router.get("/forecast", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const rangeType = ((req.query.rangeType as string) || "month") as RangeType;
    const requestedUserId = req.query.userId as string | undefined;

    const isAdmin = req.user!.role === "ADMIN";

    let userIds: string[] = [];
    if (isAdmin) {
      if (requestedUserId) {
        userIds = [requestedUserId];
      } else {
        const users = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true }
        });
        userIds = users.map((u) => u.id);
      }
    } else {
      if (requestedUserId) throw new ApiError(403, "Not authorized to view other users");
      userIds = [req.user!.id];
    }

    const now = new Date();
    const { start, endExclusive, elapsedFraction } = getPeriod(rangeType, now);

    // Actuals so far: start -> now
    const snapshots = await prisma.kpiSnapshot.findMany({
      where: { userId: { in: userIds }, date: { gte: start, lte: now } }
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

    // Quotas come from User (monthly), then scaled to range
    const monthlyQuotaTotals = await getMonthlyQuotasForUsers(userIds);

    const quota = {
      calls: scaleMonthlyQuota(monthlyQuotaTotals.calls, rangeType, now),
      emails: scaleMonthlyQuota(monthlyQuotaTotals.emails, rangeType, now),
      meetingsBooked: scaleMonthlyQuota(monthlyQuotaTotals.meetingsBooked, rangeType, now),
      cleanOpportunities: scaleMonthlyQuota(monthlyQuotaTotals.cleanOpportunities, rangeType, now),

      // Not defined in schema (MVP)
      meetingsHeld: 0,
      opportunitiesCreated: 0
    };

    const buildLine = (actualVal: number, quotaVal: number) => {
      const expected = quotaVal * elapsedFraction;
      const projected = elapsedFraction > 0 ? actualVal / elapsedFraction : 0;
      const pacePct = quotaVal > 0 ? (projected / quotaVal) * 100 : null;
      return { actual: actualVal, expected, projected, quota: quotaVal, pacePct };
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
