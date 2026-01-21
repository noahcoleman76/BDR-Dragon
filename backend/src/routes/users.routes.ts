import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { AuthRequest } from "../types/auth";
import { prisma } from "../prisma/client";
import { ApiError } from "../middleware/errorHandler";

const router = Router();

const userMeSelect = {
  id: true,
  email: true,
  nickname: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  quotaCalls: true,
  quotaEmails: true,
  quotaMeetingsBooked: true,
  quotaCleanOpportunities: true
} as const;

router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: userMeSelect
    });

    if (!user) throw new ApiError(404, "User not found");
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { nickname } = req.body ?? {};

    if (nickname !== undefined) {
      if (nickname !== null && typeof nickname !== "string") {
        throw new ApiError(400, "nickname must be a string or null");
      }
      if (typeof nickname === "string" && nickname.length > 50) {
        throw new ApiError(400, "nickname must be 50 characters or less");
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        nickname: nickname === undefined ? undefined : nickname
      },
      select: userMeSelect
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
