import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/preferences - get digest settings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { digestEnabled: true, digestTime: true },
  });

  return NextResponse.json(user);
}

// PUT /api/user/preferences - update digest settings
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { digestEnabled, digestTime } = body as {
    digestEnabled?: boolean;
    digestTime?: string;
  };

  // Validate digestTime format "HH:mm"
  if (digestTime !== undefined && !/^\d{2}:\d{2}$/.test(digestTime)) {
    return NextResponse.json(
      { error: "Invalid time format. Use HH:mm" },
      { status: 400 }
    );
  }

  const data: { digestEnabled?: boolean; digestTime?: string } = {};
  if (digestEnabled !== undefined) data.digestEnabled = digestEnabled;
  if (digestTime !== undefined) data.digestTime = digestTime;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { digestEnabled: true, digestTime: true },
  });

  return NextResponse.json(updated);
}
