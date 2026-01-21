import jwt, { SignOptions, Secret } from "jsonwebtoken";
import { env } from "../config/env";

export type JwtPayload = {
  sub: string;
  role: "ADMIN" | "BASIC";
};

// we know env values are valid for jsonwebtoken, so cast them
const accessTokenOptions: SignOptions = {
  expiresIn: env.JWT_ACCESS_EXPIRES_IN as any
};

const refreshTokenOptions: SignOptions = {
  expiresIn: env.JWT_REFRESH_EXPIRES_IN as any
};

export const signAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(
    payload,
    env.JWT_ACCESS_SECRET as Secret,
    accessTokenOptions
  );
};

export const signRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(
    payload,
    env.JWT_REFRESH_SECRET as Secret,
    refreshTokenOptions
  );
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET as Secret) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET as Secret) as JwtPayload;
};
