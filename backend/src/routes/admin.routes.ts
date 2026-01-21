import { Router } from "express";
import { prisma } from "../prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";

const router = Router();

// All admin routes require auth + admin role
router.use(requireAuth);
router.use(requireRole("ADMIN"));

/**
 * Markets
 */

// GET /admin/markets
router.get("/markets", async (_req, res, next) => {
  try {
    const markets = await prisma.market.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(markets);
  } catch (err) {
    next(err);
  }
});

// POST /admin/markets
router.post("/markets", async (req, res, next) => {
  try {
    const {
      name,
      geographicDescription,
      accountExecutives,
      managerName,
      quotaCalls,
      quotaEmails,
      quotaMeetingsBooked,
      quotaCleanOpportunities,
      startDate
    } = req.body ?? {};

    if (!name || typeof name !== "string") {
      throw new ApiError(400, "name is required");
    }

    const market = await prisma.market.create({
      data: {
        name,
        geographicDescription: geographicDescription ?? null,
        accountExecutives: accountExecutives ?? null,
        managerName: managerName ?? null,
        quotaCalls: Number.isFinite(quotaCalls) ? Number(quotaCalls) : 0,
        quotaEmails: Number.isFinite(quotaEmails) ? Number(quotaEmails) : 0,
        quotaMeetingsBooked: Number.isFinite(quotaMeetingsBooked) ? Number(quotaMeetingsBooked) : 0,
        quotaCleanOpportunities: Number.isFinite(quotaCleanOpportunities)
          ? Number(quotaCleanOpportunities)
          : 0,
        startDate: startDate ? new Date(startDate) : null
      }
    });

    res.status(201).json(market);
  } catch (err) {
    next(err);
  }
});

// PUT /admin/markets/:id
router.put("/markets/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      geographicDescription,
      accountExecutives,
      managerName,
      quotaCalls,
      quotaEmails,
      quotaMeetingsBooked,
      quotaCleanOpportunities,
      startDate
    } = req.body ?? {};

    const existing = await prisma.market.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Market not found");

    const market = await prisma.market.update({
      where: { id },
      data: {
        name: typeof name === "string" ? name : undefined,
        geographicDescription: geographicDescription ?? undefined,
        accountExecutives: accountExecutives ?? undefined,
        managerName: managerName ?? undefined,
        quotaCalls: quotaCalls !== undefined ? Number(quotaCalls) : undefined,
        quotaEmails: quotaEmails !== undefined ? Number(quotaEmails) : undefined,
        quotaMeetingsBooked:
          quotaMeetingsBooked !== undefined ? Number(quotaMeetingsBooked) : undefined,
        quotaCleanOpportunities:
          quotaCleanOpportunities !== undefined ? Number(quotaCleanOpportunities) : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined
      }
    });

    res.json(market);
  } catch (err) {
    next(err);
  }
});

/**
 * Users
 */

// GET /admin/users
router.get("/users", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        isActive: true,
        createdAt: true,
        userMarkets: {
          select: {
            market: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    const shaped = users.map((u) => ({
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      markets: u.userMarkets.map((um) => um.market)
    }));

    res.json(shaped);
  } catch (err) {
    next(err);
  }
});

// PUT /admin/users/:id
// body can include: { role?: "ADMIN"|"BASIC", isActive?: boolean, marketIds?: string[] }
router.put("/users/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, isActive, marketIds } = req.body ?? {};

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "User not found");

    // Update user core fields
    const updated = await prisma.user.update({
      where: { id },
      data: {
        role: role === "ADMIN" || role === "BASIC" ? role : undefined,
        isActive: typeof isActive === "boolean" ? isActive : undefined
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    // Replace market assignments if provided
    if (Array.isArray(marketIds)) {
      // Validate IDs exist (optional but helpful)
      const found = await prisma.market.findMany({
        where: { id: { in: marketIds } },
        select: { id: true }
      });
      if (found.length !== marketIds.length) {
        throw new ApiError(400, "One or more marketIds are invalid");
      }

      await prisma.userMarket.deleteMany({ where: { userId: id } });

      if (marketIds.length > 0) {
        await prisma.userMarket.createMany({
          data: marketIds.map((marketId) => ({ userId: id, marketId }))
        });
      }
    }

    // Return updated with markets
    const withMarkets = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        isActive: true,
        createdAt: true,
        userMarkets: { select: { market: { select: { id: true, name: true } } } }
      }
    });

    res.json({
      ...updated,
      markets: withMarkets?.userMarkets.map((um) => um.market) ?? []
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Manual sync (stub)
 * POST /admin/sync
 */
router.post("/sync", async (_req, res, next) => {
  try {
    const now = new Date();

    // Store last sync status globally (stubbed)
    const integration = await prisma.integrationStatus.upsert({
      where: { id: "global" }, // NOTE: This requires a row with id="global" OR you can remove this and use create/findFirst.
      update: { lastSyncAt: now, scope: "GLOBAL", salesforceStatus: "CONFIGURED", outreachStatus: "STUBBED" },
      create: {
        id: "global",
        scope: "GLOBAL",
        salesforceStatus: "CONFIGURED",
        outreachStatus: "STUBBED",
        lastSyncAt: now
      }
    });

    res.json({ message: "Sync triggered (stub)", lastSyncAt: integration.lastSyncAt });
  } catch (err: any) {
    // If you haven't created an IntegrationStatus row yet, Prisma may complain about upsert where clause.
    // If you hit that, tell me the exact error and I'll adjust this to use findFirst+create/update.
    next(err);
  }
});

export default router;
