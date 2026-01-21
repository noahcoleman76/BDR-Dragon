import { Router } from "express";
import { prisma } from "../prisma/client";
import { requireAuth } from "../middleware/auth";
import { AuthRequest } from "../types/auth";

const router = Router();

/**
 * GET /market/me
 * Returns the Market records for the current user (read-only)
 */
router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const links = await prisma.userMarket.findMany({
      where: { userId },
      select: {
        market: {
          select: {
            id: true,
            name: true,
            geographicDescription: true,
            accountExecutives: true,
            managerName: true,
            startDate: true
          }
        }
      }
    });

    const markets = links.map((l) => l.market);
    res.json({ markets });
  } catch (err) {
    next(err);
  }
});

export default router;
