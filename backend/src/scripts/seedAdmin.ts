import { prisma } from "../prisma/client";
import { hashPassword } from "../utils/password";

async function main() {
  const email = "admin@bdrdragon.test"; // change if you want
  const plainPassword = "Password123!"; // change if you want

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists, updating password...`);
    const passwordHash = await hashPassword(plainPassword);
    await prisma.user.update({
      where: { email },
      data: { passwordHash, role: "ADMIN", isActive: true }
    });
  } else {
    const passwordHash = await hashPassword(plainPassword);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        nickname: "Admin"
      }
    });

    await prisma.taskList.createMany({
      data: [
        { userId: user.id, name: "Today’s Tasks", type: "TODAY" },
        { userId: user.id, name: "This Week’s Tasks", type: "THIS_WEEK" },
        { userId: user.id, name: "This Month’s Tasks", type: "THIS_MONTH" }
      ]
    });

    console.log(`Created admin user ${email}`);
  }

  console.log(`Admin credentials -> email: ${email}, password: ${plainPassword}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
