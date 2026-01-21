import { Request } from "express";

export type AuthUser = {
  id: string;
  role: "ADMIN" | "BASIC";
};

export interface AuthRequest extends Request {
  user?: AuthUser;
}
