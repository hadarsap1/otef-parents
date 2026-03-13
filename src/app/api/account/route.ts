import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

// DELETE /api/account - delete the current user's account and all data
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Revoke Google tokens before deleting
  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
    });
    if (account?.access_token) {
      const oauth2 = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID!.trim(),
        process.env.GOOGLE_CLIENT_SECRET!.trim()
      );
      await oauth2.revokeToken(account.access_token);
    }
  } catch {
    // Token may already be revoked - continue with deletion
  }

  // Delete user (cascades handle all related data)
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true });
}
