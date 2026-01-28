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

  // For GitHub Pages -> Render, cookies must be cross-site:
  // SameSite=None + Secure (in production).
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: isProd,                 // must be true when SameSite=None
    sameSite: isProd ? "none" : "lax",
    path: "/",                      // send access cookie to all routes
    // optional but recommended:
    // maxAge: 15 * 60 * 1000,
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/auth/refresh",          // only send refresh cookie to refresh endpoint
    // optional but recommended:
    // maxAge: 7 * 24 * 60 * 60 * 1000,
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
  const isProd = process.env.NODE_ENV === "production";
  const sameSite = isProd ? "none" : "lax";
  const secure = isProd;

  res.clearCookie("access_token", { path: "/", sameSite, secure });
  res.clearCookie("refresh_token", { path: "/auth/refresh", sameSite, secure });

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
