import { NextRequest, NextResponse } from "next/server";
import { requireSchoolRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

type Params = { params: Promise<{ schoolId: string }> };

// GET /api/schools/:schoolId — school details
export async function GET(_req: NextRequest, { params }: Params) {
  const { schoolId } = await params;
  const { error } = await requireSchoolRole(schoolId, "OWNER", "ADMIN", "TEACHER");
  if (error) return error;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      _count: { select: { groups: true, members: true } },
    },
  });

  if (!school) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(school);
}

// PUT /api/schools/:schoolId — update school
export async function PUT(req: NextRequest, { params }: Params) {
  const { schoolId } = await params;
  const { error } = await requireSchoolRole(schoolId, "OWNER", "ADMIN");
  if (error) return error;

  const { name, description } = await req.json();

  const data: Record<string, unknown> = {};
  if (name?.trim()) {
    data.name = name.trim();
    const newSlug = slugify(name.trim());
    if (!newSlug) {
      return NextResponse.json({ error: "Invalid name for slug" }, { status: 400 });
    }
    // Check slug uniqueness (exclude self)
    const existing = await prisma.school.findFirst({
      where: { slug: newSlug, NOT: { id: schoolId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }
    data.slug = newSlug;
  }
  if (description !== undefined) {
    data.description = description?.trim() || null;
  }

  const updated = await prisma.school.update({ where: { id: schoolId }, data });
  return NextResponse.json(updated);
}

// DELETE /api/schools/:schoolId — delete school
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { schoolId } = await params;
  const { error } = await requireSchoolRole(schoolId, "OWNER");
  if (error) return error;

  await prisma.school.delete({ where: { id: schoolId } });
  return NextResponse.json({ ok: true });
}
