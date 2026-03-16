import { NextRequest, NextResponse } from "next/server";
import { requireSchoolRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ schoolId: string }> };

// GET /api/schools/:schoolId/members - list school members
export async function GET(_req: NextRequest, { params }: Params) {
  const { schoolId } = await params;
  const { error } = await requireSchoolRole(schoolId, "OWNER", "ADMIN", "TEACHER");
  if (error) return error;

  const members = await prisma.schoolMember.findMany({
    where: { schoolId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

// POST /api/schools/:schoolId/members - add a member by email
export async function POST(req: NextRequest, { params }: Params) {
  const { schoolId } = await params;
  const { error } = await requireSchoolRole(schoolId, "OWNER", "ADMIN");
  if (error) return error;

  const { email, role } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Only OWNER can assign ADMIN; default to TEACHER
  const { error: roleErr, session: callerSession } = await requireSchoolRole(schoolId, "OWNER");
  const canAssignAdmin = !roleErr;
  const validRoles = canAssignAdmin ? ["ADMIN", "TEACHER"] : ["TEACHER"];
  const memberRole = validRoles.includes(role) ? role : "TEACHER";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await prisma.schoolMember.findUnique({
    where: { schoolId_userId: { schoolId, userId: user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  const member = await prisma.schoolMember.create({
    data: { schoolId, userId: user.id, role: memberRole },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  // Upgrade user role if they're a PARENT
  if (user.role === "PARENT") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: memberRole },
    });
  }

  return NextResponse.json(member, { status: 201 });
}

// DELETE /api/schools/:schoolId/members - remove a member
export async function DELETE(req: NextRequest, { params }: Params) {
  const { schoolId } = await params;
  const { error } = await requireSchoolRole(schoolId, "OWNER", "ADMIN");
  if (error) return error;

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Prevent removing the OWNER
  const target = await prisma.schoolMember.findFirst({ where: { schoolId, userId } });
  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "Cannot remove school owner" }, { status: 403 });
  }

  await prisma.schoolMember.deleteMany({
    where: { schoolId, userId },
  });

  return NextResponse.json({ ok: true });
}
