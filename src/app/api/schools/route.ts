import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { sanitizeString } from "@/lib/validation";

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

// POST /api/schools - create a new school (TEACHER, ADMIN, SUPERADMIN only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["TEACHER", "ADMIN", "SUPERADMIN"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description } = await req.json();

  const sanitizedName = sanitizeString(name, 200);
  const sanitizedDescription = sanitizeString(description, 2000);

  if (!sanitizedName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const slug = slugify(sanitizedName);
  if (!slug) {
    return NextResponse.json({ error: "Invalid name for slug" }, { status: 400 });
  }

  // Check uniqueness
  const existing = await prisma.school.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
  }

  try {
    const school = await prisma.school.create({
      data: {
        name: sanitizedName,
        slug,
        description: sanitizedDescription,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
    });

    return NextResponse.json(school, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create school" }, { status: 500 });
  }
}
