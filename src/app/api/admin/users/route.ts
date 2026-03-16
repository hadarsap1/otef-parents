import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeString } from "@/lib/validation";

export async function GET() {
  const { error } = await requireRole("SUPERADMIN");
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          children: true,
          childParents: true,
          lessons: true,
          ownedGroups: true,
        },
      },
      schoolMemberships: {
        select: {
          role: true,
          school: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function PUT(req: Request) {
  const { error } = await requireRole("SUPERADMIN");
  if (error) return error;

  const { userId, role } = await req.json();

  const sanitizedUserId = sanitizeString(userId, 30);

  if (!sanitizedUserId || !["PARENT", "TEACHER", "ADMIN", "SUPERADMIN"].includes(role)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: sanitizedUserId },
      data: { role },
      select: { id: true, name: true, role: true },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
