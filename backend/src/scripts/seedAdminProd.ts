import bcrypt from "bcrypt";
import { prisma } from "../prisma/client";

async function seedAdminProd() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      isActive: true
    },
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
  console.log("ID:", admin.id);
}

seedAdminProd()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
