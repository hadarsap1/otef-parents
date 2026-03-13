import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// GET /api/schools - list current user's schools
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // SUPERADMIN sees all schools
  if (session.user.role === "SUPERADMIN") {
    const schools = await prisma.school.findMany({
      include: { _count: { select: { groups: true, members: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(schools);
  }

  const memberships = await prisma.schoolMember.findMany({
    where: { userId: session.user.id },
    include: {
      school: {
        include: { _count: { select: { groups: true, members: true } } },
      },
    },
  });

  const schools = memberships.map((m) => ({
    ...m.school,
    myRole: m.role,
  }));

  return NextResponse.json(schools);
}

// POST /api/schools - create a new school
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description } = await req.json();

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Invalid name for slug" }, { status: 400 });
  }

  // Check uniqueness
  const existing = await prisma.school.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  const school = await prisma.school.create({
    data: {
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
    },
  });

  // Upgrade user to TEACHER if they're currently a PARENT
  if (session.user.role === "PARENT") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "TEACHER" },
    });
  }

  return NextResponse.json(school, { status: 201 });
}
