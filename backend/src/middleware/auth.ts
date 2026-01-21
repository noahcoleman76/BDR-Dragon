import { NextFunction, Response } from "express";
import { AuthRequest } from "../types/auth";
import { verifyAccessToken } from "../utils/jwt";

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const requireRole = (role: "ADMIN" | "BASIC") => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
    next();
  };
};
