import { NextRequest, NextResponse } from "next/server";
import { requireSchoolRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ schoolId: string }> };

interface ImportChild {
  name: string;
  group: string;
  grade?: string;
}

const MAX_IMPORT_SIZE = 500;

// POST /api/schools/:schoolId/import - bulk import children
export async function POST(req: NextRequest, { params }: Params) {
  const { schoolId } = await params;
  const { error, session } = await requireSchoolRole(schoolId, "OWNER", "ADMIN");
  if (error) return error;

  const { children } = (await req.json()) as { children: ImportChild[] };

  if (!Array.isArray(children) || children.length === 0) {
    return NextResponse.json({ error: "No children to import" }, { status: 400 });
  }

  if (children.length > MAX_IMPORT_SIZE) {
    return NextResponse.json(
      { error: `Maximum ${MAX_IMPORT_SIZE} children per import` },
      { status: 400 }
    );
  }

  // Find or create system user for unclaimed children
  const systemUser = await prisma.user.upsert({
    where: { email: "system@otef-parents.app" },
    update: {},
    create: { name: "מערכת", email: "system@otef-parents.app", role: "TEACHER" },
  });

  // Collect unique group names
  const groupNames = [...new Set(children.map((c) => c.group))];

  // Find or create groups in this school, track new ones
  const groupMap = new Map<string, string>(); // name → id
  let groupsCreated = 0;
  for (const name of groupNames) {
    let group = await prisma.group.findFirst({
      where: { name, schoolId },
    });
    if (!group) {
      group = await prisma.group.create({
        data: {
          name,
          teacherId: session!.user.id,
          schoolId,
        },
      });
      groupsCreated++;
    }
    groupMap.set(name, group.id);
  }

  // Create children and add to groups in a transaction
  let childrenCreated = 0;
  const batchOps = children
    .filter((child) => groupMap.has(child.group) && child.name.trim())
    .map((child) => {
      const groupId = groupMap.get(child.group)!;
      return prisma.child
        .create({
          data: {
            name: child.name.trim().slice(0, 100), // limit name length
            grade: child.grade?.slice(0, 20) || null,
            parentId: systemUser.id,
          },
        })
        .then((newChild) =>
          prisma.groupMember.create({
            data: { groupId, childId: newChild.id },
          })
        );
    });

  // Process in batches of 50 to avoid overwhelming the DB
  for (let i = 0; i < batchOps.length; i += 50) {
    const batch = batchOps.slice(i, i + 50);
    await Promise.all(batch);
    childrenCreated += batch.length;
  }

  return NextResponse.json({ groupsCreated, childrenCreated });
}
