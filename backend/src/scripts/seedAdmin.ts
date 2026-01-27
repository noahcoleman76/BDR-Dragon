import bcrypt from "bcrypt";
import { prisma } from "../prisma/client";

async function seedAdmin() {
  const email = "admin@bdrdragon.local";
  const password = "Admin123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      role: "ADMIN",
      isActive: true,
      firstName: "Admin",
      lastName: "User",
      quotaCalls: 0,
      quotaEmails: 0,
      quotaMeetingsBooked: 0,
      quotaCleanOpportunities: 0
    }
  });

  console.log("Seeded admin:");
  console.log("Email:", email);
  console.log("Password:", password);
  console.log("ID:", admin.id);
}

seedAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
