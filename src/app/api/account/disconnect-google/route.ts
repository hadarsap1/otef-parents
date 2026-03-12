import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

// POST /api/account/disconnect-google — revoke Google tokens and remove calendar access
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "google" },
  });

  if (!account) {
    return NextResponse.json({ error: "No Google account linked" }, { status: 404 });
  }

  // Revoke the token at Google
  try {
    if (account.access_token) {
      const oauth2 = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID!.trim(),
        process.env.GOOGLE_CLIENT_SECRET!.trim()
      );
      await oauth2.revokeToken(account.access_token);
    }
  } catch {
    // Token may already be revoked — continue
  }

  // Clear stored tokens (keep the account link for login)
  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: null,
      refresh_token: null,
      expires_at: null,
    },
  });

  return NextResponse.json({ success: true });
}
