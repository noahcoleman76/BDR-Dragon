import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { AuthRequest } from "../types/auth";
import { prisma } from "../prisma/client";

const router = Router();

const userMeSelect = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  firstName: true,
  lastName: true,
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
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /users/me
 * Only ADMIN can update name (firstName/lastName)
 * Everyone can keep this endpoint for future self-settings, but for now we block name updates for BASIC.
 */
router.put("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { firstName, lastName } = req.body ?? {};

    // Only admins can change name
    if (req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can update user name" });
    }

    if (typeof firstName !== "string" || !firstName.trim()) {
      return res.status(400).json({ error: "firstName is required" });
    }
    if (typeof lastName !== "string" || !lastName.trim()) {
      return res.status(400).json({ error: "lastName is required" });
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { firstName: firstName.trim(), lastName: lastName.trim() },
      select: userMeSelect
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
