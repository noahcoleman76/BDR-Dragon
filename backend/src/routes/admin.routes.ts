import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../prisma/client";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { AuthRequest } from "../types/auth";

const router = Router();

router.use(requireAuth);
router.use(requireRole("ADMIN"));

/**
 * USERS
 * GET /admin/users
 */
router.get("/users", async (_req: AuthRequest, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        quotaCalls: true,
        quotaEmails: true,
        quotaMeetingsBooked: true,
        quotaCleanOpportunities: true,

        // IMPORTANT: this relation name must match your schema.
        // In most setups it is `userMarkets`, not `markets`.
        userMarkets: {
          select: {
            market: { select: { id: true, name: true } }
          }
        }
      }
    });

    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        quotaCalls: u.quotaCalls,
        quotaEmails: u.quotaEmails,
        quotaMeetingsBooked: u.quotaMeetingsBooked,
        quotaCleanOpportunities: u.quotaCleanOpportunities,
        markets: u.userMarkets.map((x: { market: { id: string; name: string } }) => x.market)
      }))
    );
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/users
 * body: {
 *  email, role, firstName?, lastName?, tempPassword,
 *  marketIds?: string[],
 *  quotaCalls?, quotaEmails?, quotaMeetingsBooked?, quotaCleanOpportunities?
 * }
 */
router.post("/users", async (req: AuthRequest, res, next) => {
  try {
    const {
      email,
      role,
      firstName,
      lastName,
      tempPassword,
      marketIds,
      quotaCalls,
      quotaEmails,
      quotaMeetingsBooked,
      quotaCleanOpportunities
    } = req.body ?? {};

    if (!email || typeof email !== "string") throw new ApiError(400, "email is required");
    if (role !== "ADMIN" && role !== "BASIC") throw new ApiError(400, "role must be ADMIN or BASIC");
    if (!tempPassword || typeof tempPassword !== "string" || tempPassword.length < 8) {
      throw new ApiError(400, "tempPassword must be at least 8 characters");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, "User with this email already exists");

    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.create({
      data: {
        email,
        role,
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        passwordHash,
        isActive: true,
        quotaCalls: Number(quotaCalls) || 0,
        quotaEmails: Number(quotaEmails) || 0,
        quotaMeetingsBooked: Number(quotaMeetingsBooked) || 0,
        quotaCleanOpportunities: Number(quotaCleanOpportunities) || 0
      }
    });

    // Assign markets (optional)
    if (Array.isArray(marketIds)) {
      if (marketIds.length > 0) {
        const found = await prisma.market.findMany({
          where: { id: { in: marketIds } },
          select: { id: true }
        });
        if (found.length !== marketIds.length) throw new ApiError(400, "One or more marketIds are invalid");

        await prisma.userMarket.createMany({
          data: marketIds.map((marketId: string) => ({ userId: user.id, marketId }))
        });
      }
    }

    // default task lists
    await prisma.taskList.createMany({
      data: [
        { userId: user.id, name: "Today’s Tasks", type: "TODAY" },
        { userId: user.id, name: "This Week’s Tasks", type: "THIS_WEEK" },
        { userId: user.id, name: "This Month’s Tasks", type: "THIS_MONTH" }
      ]
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      quotaCalls: user.quotaCalls,
      quotaEmails: user.quotaEmails,
      quotaMeetingsBooked: user.quotaMeetingsBooked,
      quotaCleanOpportunities: user.quotaCleanOpportunities
    });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:id/set-password", requireAuth, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body ?? {};

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ error: "newPassword must be at least 8 characters" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /admin/users/:id
 * body supports: role, isActive, firstName, lastName, marketIds, quotas
 */
router.put("/users/:id", async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "User not found");

    const {
      role,
      isActive,
      firstName,
      lastName,
      marketIds,
      quotaCalls,
      quotaEmails,
      quotaMeetingsBooked,
      quotaCleanOpportunities
    } = req.body ?? {};

    const updated = await prisma.user.update({
      where: { id },
      data: {
        role: role === "ADMIN" || role === "BASIC" ? role : undefined,
        isActive: typeof isActive === "boolean" ? isActive : undefined,
        firstName: firstName !== undefined ? (firstName ?? null) : undefined,
        lastName: lastName !== undefined ? (lastName ?? null) : undefined,        
        quotaCalls: quotaCalls !== undefined ? Number(quotaCalls) : undefined,
        quotaEmails: quotaEmails !== undefined ? Number(quotaEmails) : undefined,
        quotaMeetingsBooked: quotaMeetingsBooked !== undefined ? Number(quotaMeetingsBooked) : undefined,
        quotaCleanOpportunities:
          quotaCleanOpportunities !== undefined ? Number(quotaCleanOpportunities) : undefined
      }
    });

    // markets assignment (replace set)
    if (Array.isArray(marketIds)) {
      if (marketIds.length > 0) {
        const found = await prisma.market.findMany({
          where: { id: { in: marketIds } },
          select: { id: true }
        });
        if (found.length !== marketIds.length) throw new ApiError(400, "One or more marketIds are invalid");
      }

      await prisma.userMarket.deleteMany({ where: { userId: id } });

      if (marketIds.length > 0) {
        await prisma.userMarket.createMany({
          data: marketIds.map((marketId: string) => ({ userId: id, marketId }))
        });
      }
    }

    const userMarkets = await prisma.userMarket.findMany({
      where: { userId: id },
      select: { market: { select: { id: true, name: true } } }
    });

    res.json({
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      role: updated.role,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      quotaCalls: updated.quotaCalls,
      quotaEmails: updated.quotaEmails,
      quotaMeetingsBooked: updated.quotaMeetingsBooked,
      quotaCleanOpportunities: updated.quotaCleanOpportunities,
      markets: userMarkets.map((m: { market: { id: string; name: string } }) => m.market)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * MARKETS
 * GET /admin/markets
 */
router.get("/markets", async (_req: AuthRequest, res, next) => {
  try {
    const markets = await prisma.market.findMany({ orderBy: { createdAt: "desc" } });
    res.json(markets);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/markets
 * body: { name, geographicDescription?, accountExecutives?, managerName?, startDate? }
 */
router.post("/markets", async (req: AuthRequest, res, next) => {
  try {
    const { name, geographicDescription, accountExecutives, managerName, startDate } = req.body ?? {};

    if (!name || typeof name !== "string") throw new ApiError(400, "name is required");

    const market = await prisma.market.create({
      data: {
        name,
        geographicDescription: geographicDescription ?? null,
        accountExecutives: accountExecutives ?? null,
        managerName: managerName ?? null,
        startDate: startDate ? new Date(startDate) : null
      }
    });

    res.status(201).json(market);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /admin/markets/:id
 * body: { name?, geographicDescription?, accountExecutives?, managerName?, startDate? }
 */
router.put("/markets/:id", async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { name, geographicDescription, accountExecutives, managerName, startDate } = req.body ?? {};

    const existing = await prisma.market.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Market not found");

    const updated = await prisma.market.update({
      where: { id },
      data: {
        name: typeof name === "string" ? name : undefined,
        geographicDescription:
          geographicDescription !== undefined ? (geographicDescription ?? null) : undefined,
        accountExecutives: accountExecutives !== undefined ? (accountExecutives ?? null) : undefined,
        managerName: managerName !== undefined ? (managerName ?? null) : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined
      }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// delete admin market
router.delete("/markets/:id", async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.market.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Market not found");

    await prisma.$transaction([
      // remove all user ↔ market assignments
      prisma.userMarket.deleteMany({
        where: { marketId: id }
      }),

      // delete the market itself
      prisma.market.delete({
        where: { id }
      })
    ]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});



/**
 * INTEGRATION STATUS
 * GET /admin/integration-status
 */
router.get("/integration-status", async (_req: AuthRequest, res, next) => {
  try {
    const status = await prisma.integrationStatus.findFirst({
      where: { scope: "GLOBAL" },
      orderBy: { updatedAt: "desc" }
    });

    res.json(
      status ?? {
        scope: "GLOBAL",
        salesforceStatus: "NOT_CONFIGURED",
        outreachStatus: "STUBBED",
        lastSyncAt: null
      }
    );
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/sync
 * Stub: updates IntegrationStatus.lastSyncAt
 * NOTE: This version does NOT require scope to be unique.
 */
router.post("/sync", async (_req: AuthRequest, res, next) => {
  try {
    const now = new Date();

    const existing = await prisma.integrationStatus.findFirst({
      where: { scope: "GLOBAL" }
    });

    const updated = existing
      ? await prisma.integrationStatus.update({
          where: { id: existing.id },
          data: {
            lastSyncAt: now,
            salesforceStatus: "CONFIGURED",
            outreachStatus: "STUBBED"
          }
        })
      : await prisma.integrationStatus.create({
          data: {
            scope: "GLOBAL",
            lastSyncAt: now,
            salesforceStatus: "CONFIGURED",
            outreachStatus: "STUBBED"
          }
        });

    res.json({ message: "Sync triggered (stub)", lastSyncAt: updated.lastSyncAt });
  } catch (err) {
    next(err);
  }
});

export default router;
