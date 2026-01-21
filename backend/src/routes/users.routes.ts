import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { AuthRequest } from "../types/auth";
import { prisma } from "../prisma/client";

const router = Router();

router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        isActive: true
      }
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { nickname } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { nickname },
      select: { id: true, email: true, nickname: true, role: true, isActive: true }
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
