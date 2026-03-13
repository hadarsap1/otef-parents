import { NextRequest, NextResponse } from "next/server";
import { requireRole, teacherFilter } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

type Params = { params: Promise<{ id: string }> };

function generateCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
}

// POST /api/groups/:id/invite - generate a group invite code
export async function POST(_req: NextRequest, { params }: Params) {
  const { error, session } = await requireRole("TEACHER", "SUPERADMIN");
  if (error) return error;

  const { id } = await params;

  const group = await prisma.group.findFirst({
    where: { id, ...teacherFilter(session) },
  });

  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.groupInvite.create({
    data: {
      code,
      groupId: id,
      createdByUserId: session.user.id,
      expiresAt,
    },
  });

  return NextResponse.json({ code: invite.code, expiresAt: invite.expiresAt }, { status: 201 });
}
