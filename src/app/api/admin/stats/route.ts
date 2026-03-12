import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireRole("SUPERADMIN");
  if (error) return error;

  const [users, children, groups, lessons] = await Promise.all([
    prisma.user.count(),
    prisma.child.count(),
    prisma.group.count(),
    prisma.lesson.count(),
  ]);

  return NextResponse.json({ users, children, groups, lessons });
}
