import { prisma } from "../prisma/client";
import { hashPassword, verifyPassword } from "../utils/password";
import { ApiError } from "../middleware/errorHandler";

// avoid depending on Prisma's Role type for now
type RoleType = "ADMIN" | "BASIC";


export const findUserByEmail = (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const createUser = async (params: {
  email: string;
  role: RoleType;
  nickname?: string;
  tempPassword: string;
}) => {
  const passwordHash = await hashPassword(params.tempPassword);

  const user = await prisma.user.create({
    data: {
      email: params.email,
      passwordHash,
      role: params.role,
      nickname: params.nickname
    }
  });

  // default task lists
  await prisma.taskList.createMany({
    data: [
      { userId: user.id, name: "Today’s Tasks", type: "TODAY" },
      { userId: user.id, name: "This Week’s Tasks", type: "THIS_WEEK" },
      { userId: user.id, name: "This Month’s Tasks", type: "THIS_MONTH" }
    ]
  });

  return user;
};

export const validateUserCredentials = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new ApiError(401, "Invalid credentials");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new ApiError(401, "Invalid credentials");

  return user;
};

export const changeUserPassword = async (userId: string, current: string, next: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  const valid = await verifyPassword(current, user.passwordHash);
  if (!valid) throw new ApiError(400, "Current password is incorrect");

  const passwordHash = await hashPassword(next);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });
};
