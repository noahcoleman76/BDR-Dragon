import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/users.routes";
import kpiRoutes from "./routes/kpi.routes";
import taskRoutes from "./routes/tasks.routes";
import marketRoutes from "./routes/market.routes";
import adminRoutes from "./routes/admin.routes";
import { errorHandler } from "./middleware/errorHandler";

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: [
        env.CORS_ORIGIN,
        "http://localhost:5173",
        "http://localhost:3000",
        "https://noahcoleman76.github.io"
      ],
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth", authRoutes);
  app.use("/users", userRoutes);
  app.use("/kpi", kpiRoutes);
  app.use("/tasks", taskRoutes);
  app.use("/market", marketRoutes);
  app.use("/admin", adminRoutes);

  app.use(errorHandler);

  return app;
};
