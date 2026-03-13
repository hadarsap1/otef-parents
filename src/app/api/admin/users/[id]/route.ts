import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/users/[id] - fully remove a user (cascades handle related data)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireRole("SUPERADMIN");
  if (error) return error;

  const { id } = await params;

  // Prevent self-deletion
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "לא ניתן למחוק את עצמך" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

// POST /api/admin/users/[id]/reset - reset user data (keep account, clear everything else)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireRole("SUPERADMIN");
  if (error) return error;

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Delete all user-related data in a transaction
  await prisma.$transaction([
    // Children (cascades to: ScheduleItem, PlaydateParticipant, ChildParent, ChildInvite, GroupMember)
    prisma.child.deleteMany({ where: { parentId: id } }),
    // Hosted playdates (cascades to PlaydateParticipant)
    prisma.playdate.deleteMany({ where: { hostId: id } }),
    // Co-parent links
    prisma.childParent.deleteMany({ where: { userId: id } }),
    // Invites
    prisma.childInvite.deleteMany({ where: { createdByUserId: id } }),
    // Groups (cascades to GroupMember, GroupInvite, ScheduleItem, Lesson)
    prisma.group.deleteMany({ where: { teacherId: id } }),
    // Group invites created by user
    prisma.groupInvite.deleteMany({ where: { createdByUserId: id } }),
    // Lessons
    prisma.lesson.deleteMany({ where: { teacherId: id } }),
    // Personal events
    prisma.personalEvent.deleteMany({ where: { userId: id } }),
    // School memberships
    prisma.schoolMember.deleteMany({ where: { userId: id } }),
  ]);

  return NextResponse.json({ success: true });
}
