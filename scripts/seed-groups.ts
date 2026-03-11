import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── גן שחף ─────────────────────────────────────────────────
const ganShachafKids = [
  "ריף עמית",
  "אלה כהן",
  "שירה פז",
  "אבישג חמלניצקי",
  "עומר ספיר ורדי",
  "אמילי ארביב",
  "שחר יעקבי",
  "אביב שמא",
  "אביב דוידוב",
  "טאי גיל",
  "ארבל פאעל",
  "עומר הספל",
  "תום ניימן",
  "עומר ניימן",
  "אמילי גרנט",
  "יותם אפיק גידרון",
  "יהונתן כהן",
  "עידו מרום",
  "מעיין גרמה ענבר",
  "נעם בן אריה",
  "יובל פרזי",
  "ירדן תמנה",
  "יונתן לרר",
  "אלון באומגרטן",
  "ירדן סגיר",
  "נגה בן נון",
  "נאיה קרטיס",
  "לאלי פלק",
  "נוגה מי-פז",
  "יובל דגני",
  "שחר הלפרין",
  "יונתן גלעד דהן",
];

// ── כיתה ב׳ 1 ──────────────────────────────────────────────
const kitaBet1Kids = [
  "לונה אור פרסר",
  "גפן באומגרטן",
  "זואי בן שטרית",
  "איתמר גרנט",
  "איתי דמירל",
  "מתן הורן",
  "כרמל ניסן ירקוני",
  "יוני כהן",
  "לוטם מישל להב",
  "עפרי לוי",
  "ראם לוי",
  "ליאור לוי-מנדל",
  "עמית לוי-מנדל",
  "ניר לויט",
  "אדם פלא לוקאש",
  "ליבי מנדל",
  "אלה ספיר ורדי",
  "איתמר פז",
  "נמרוד פלד קריק",
  "זואי פלק",
  "יאיר פרזי",
  "יובל רות קריגר ביינוו",
  "ארבל קריטי בר און",
  "אריאל ארי שוהם",
  "עומרי שי",
  "שחר שיין לומברוס",
  "נועה שמש",
];

async function main() {
  // Find or create a system user to own the groups and children
  const systemUser = await prisma.user.upsert({
    where: { email: "system@otef-parents.app" },
    update: {},
    create: {
      name: "מערכת",
      email: "system@otef-parents.app",
      role: "ADMIN",
    },
  });

  console.log("System user:", systemUser.id);

  // Delete old groups and their members (clean slate)
  const existingGroups = await prisma.group.findMany();
  for (const g of existingGroups) {
    await prisma.groupMember.deleteMany({ where: { groupId: g.id } });
    await prisma.group.delete({ where: { id: g.id } });
  }
  console.log(`Deleted ${existingGroups.length} existing groups`);

  // Create the two groups
  const ganShachaf = await prisma.group.create({
    data: {
      name: "גן שחף",
      teacherId: systemUser.id,
    },
  });
  console.log(`Created group: ${ganShachaf.name} (${ganShachaf.id})`);

  const kitaBet = await prisma.group.create({
    data: {
      name: "כיתה ב׳ 1",
      teacherId: systemUser.id,
    },
  });
  console.log(`Created group: ${kitaBet.name} (${kitaBet.id})`);

  // Helper: create children and add them as group members
  async function seedGroup(groupId: string, names: string[], grade: string) {
    let count = 0;
    for (const name of names) {
      // Check if child with same name already exists under system user
      let child = await prisma.child.findFirst({
        where: { name, parentId: systemUser.id },
      });

      if (!child) {
        child = await prisma.child.create({
          data: {
            name,
            grade,
            parentId: systemUser.id,
          },
        });
      }

      // Add to group
      await prisma.groupMember.upsert({
        where: { groupId_childId: { groupId, childId: child.id } },
        update: {},
        create: { groupId, childId: child.id },
      });

      count++;
    }
    return count;
  }

  const ganCount = await seedGroup(ganShachaf.id, ganShachafKids, "גן");
  console.log(`Added ${ganCount} children to גן שחף`);

  const betCount = await seedGroup(kitaBet.id, kitaBet1Kids, "ב׳");
  console.log(`Added ${betCount} children to כיתה ב׳ 1`);

  console.log("\nDone! Total children seeded:", ganCount + betCount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
