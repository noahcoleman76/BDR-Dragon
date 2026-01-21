import { Router } from "express";
import { prisma } from "../prisma/client";
import { requireAuth } from "../middleware/auth";
import { AuthRequest } from "../types/auth";

const router = Router();

// GET /market/me -> markets for current user (read-only)
router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const markets = await prisma.userMarket.findMany({
      where: { userId },
      include: { market: true },
      orderBy: { createdAt: "desc" }
    });

    res.json(markets.map((um) => um.market));
  } catch (err) {
    next(err);
  }
});

export default router;
