import { Router, Response } from "express";
import { AuthRequest } from "../types/auth";
import { validateUserCredentials, changeUserPassword, createUser } from "../services/authService";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";

const router = Router();

const setAuthCookies = (res: Response, userId: string, role: "ADMIN" | "BASIC") => {
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = signRefreshToken({ sub: userId, role });
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("access_token", accessToken, {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/"
  // no maxAge => session cookie
});

res.cookie("refresh_token", refreshToken, {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/auth/refresh"
  // no maxAge => session cookie (dies when tab/browser closes)
});

};

router.post("/login", async (req: AuthRequest, res: Response, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new ApiError(400, "Email and password required");

    const user = await validateUserCredentials(email, password);
    setAuthCookies(res, user.id, user.role);

    return res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  return res.json({ message: "Logged out" });
});

router.post("/refresh", (req: AuthRequest, res: Response, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) throw new ApiError(401, "No refresh token");

    const payload = verifyRefreshToken(token);
    setAuthCookies(res, payload.sub, payload.role);

    return res.json({ message: "Refreshed" });
  } catch (err) {
    next(err);
  }
});

router.post("/change-password", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new ApiError(400, "currentPassword and newPassword required");
    }

    await changeUserPassword(req.user!.id, currentPassword, newPassword);
    return res.json({ message: "Password changed" });
  } catch (err) {
    next(err);
  }
});

// admin-only register
router.post("/register", requireAuth, requireRole("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    const { email, role, firstName, lastName, tempPassword } = req.body;
    if (!email || !tempPassword) throw new ApiError(400, "email and tempPassword required");

    const normalizedRole = role === "ADMIN" ? "ADMIN" : "BASIC";

    const user = await createUser({
      email,
      role: normalizedRole,
      firstName,
      lastName,
      tempPassword
    });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    });
  } catch (err) {
    next(err);
  }
});

export default router;
