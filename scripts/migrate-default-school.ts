import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Strip channel_binding for local script compatibility with Neon pooler
const connStr = (process.env.DATABASE_URL ?? "").replace(/&?channel_binding=require/, "");
const adapter = new PrismaPg({ connectionString: connStr });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Promote existing ADMIN users to SUPERADMIN
  const promoted = await prisma.user.updateMany({
    where: { role: "ADMIN" },
    data: { role: "SUPERADMIN" },
  });
  console.log(`Promoted ${promoted.count} ADMIN user(s) to SUPERADMIN`);

  // 2. Create default School
  const defaultSchool = await prisma.school.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "עוטף - ברירת מחדל",
      slug: "default",
      description: "בית הספר ברירת מחדל עבור קבוצות קיימות",
    },
  });
  console.log(`Default school: ${defaultSchool.id} (${defaultSchool.name})`);

  // 3. Set schoolId on all existing groups
  const groups = await prisma.group.findMany({
    where: { schoolId: null },
    select: { id: true, teacherId: true },
  });

  for (const group of groups) {
    await prisma.group.update({
      where: { id: group.id },
      data: { schoolId: defaultSchool.id },
    });
  }
  console.log(`Assigned ${groups.length} group(s) to default school`);

  // 4. Create SchoolMember for each group's teacher (deduplicate)
  const teacherIds = [...new Set(groups.map((g) => g.teacherId))];
  let memberCount = 0;

  for (const teacherId of teacherIds) {
    // Check if the teacher is a SUPERADMIN — they don't need school membership
    const user = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { role: true },
    });
    if (user?.role === "SUPERADMIN") continue;

    await prisma.schoolMember.upsert({
      where: {
        schoolId_userId: {
          schoolId: defaultSchool.id,
          userId: teacherId,
        },
      },
      update: {},
      create: {
        schoolId: defaultSchool.id,
        userId: teacherId,
        role: "OWNER",
      },
    });
    memberCount++;
  }
  console.log(`Created ${memberCount} SchoolMember(s)`);

  console.log("\nMigration complete!");
  console.log("Next step: After verifying data, make Group.schoolId required in schema.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
