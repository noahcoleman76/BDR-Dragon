import { prisma } from "../prisma/client";

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.kpiSnapshot.create({
    data: {
      userId: user.id,
      date: today,
      calls: 45,
      emails: 120,
      meetingsBooked: 3,
      meetingsHeld: 2,
      opportunitiesCreated: 1,
      cleanOpportunities: 1
    }
  });

  console.log("Seeded KPI snapshot");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
