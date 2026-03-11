import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create a fake "other parent" user
  const otherParent = await prisma.user.upsert({
    where: { email: "mock-parent@example.com" },
    update: {},
    create: {
      name: "דנה כהן",
      email: "mock-parent@example.com",
      role: "PARENT",
    },
  });

  // Find or create a group for the playdate
  let group = await prisma.group.findFirst();
  if (!group) {
    group = await prisma.group.create({
      data: {
        name: "כיתה א׳",
        teacherId: otherParent.id,
      },
    });
  }

  // Create a playdate hosted by the other parent, tomorrow at 16:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(16, 0, 0, 0);

  const playdate = await prisma.playdate.create({
    data: {
      hostId: otherParent.id,
      groupId: group.id,
      address: "רחוב הדקל 12, שדרות",
      dateTime: tomorrow,
      maxCapacity: 4,
      status: "OPEN",
      notes: "להביא בגד ים, יש בריכה!",
    },
  });

  console.log("Created mock playdate:", playdate.id);
  console.log("Host:", otherParent.name);
  console.log("Date:", tomorrow.toLocaleString("he-IL"));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
