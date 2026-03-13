import { NextRequest, NextResponse } from "next/server";
import { requireSchoolRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ schoolId: string }> };

// GET /api/schools/:schoolId/groups - list school groups
export async function GET(_req: NextRequest, { params }: Params) {
  const { schoolId } = await params;
  const { error } = await requireSchoolRole(schoolId, "OWNER", "ADMIN", "TEACHER");
  if (error) return error;

  const groups = await prisma.group.findMany({
    where: { schoolId },
    include: {
      teacher: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true, lessons: true, playdates: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(groups);
}
