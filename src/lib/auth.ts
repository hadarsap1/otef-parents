import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { Role, SchoolRole } from "@/generated/prisma/enums";
import { NextResponse } from "next/server";

// Prisma 7.x strict mode rejects unknown fields - filter linkAccount data
const ACCOUNT_FIELDS = new Set([
  "id", "userId", "type", "provider", "providerAccountId",
  "refresh_token", "access_token", "expires_at", "token_type",
  "scope", "id_token", "session_state",
]);

const baseAdapter = PrismaAdapter(prisma);
const adapter: typeof baseAdapter = {
  ...baseAdapter,
  linkAccount: async (data) => {
    const filtered = Object.fromEntries(
      Object.entries(data).filter(([key]) => ACCOUNT_FIELDS.has(key))
    );
    await prisma.account.create({ data: filtered as any });
  },
};

export const authOptions: NextAuthOptions = {
  adapter: adapter as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
      // allowDangerousEmailAccountLinking removed for security
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        session.user.role = dbUser?.role ?? "PARENT";

        // Load school memberships
        const memberships = await prisma.schoolMember.findMany({
          where: { userId: user.id },
          include: { school: { select: { id: true, slug: true, name: true } } },
        });
        session.user.schools = memberships.map((m) => ({
          schoolId: m.school.id,
          slug: m.school.slug,
          name: m.school.name,
          role: m.role,
        }));
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

// Helper: get authenticated session or return 401
export async function getAuthSession() {
  const session = await getServerSession(authOptions);
  return session;
}

// Helper: require specific role(s) in API routes
export async function requireRole(...roles: Role[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  // SUPERADMIN bypasses all role checks
  if (session.user.role === "SUPERADMIN") {
    return { error: null, session };
  }
  if (!roles.includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

/** Returns a teacherId filter: SUPERADMIN sees all, others see own. */
export function teacherFilter(session: { user: { id: string; role: string } }) {
  return session.user.role === "SUPERADMIN" ? {} : { teacherId: session.user.id };
}

// Helper: require a school-level role. SUPERADMIN bypasses.
export async function requireSchoolRole(schoolId: string, ...roles: SchoolRole[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  // SUPERADMIN bypasses all school checks
  if (session.user.role === "SUPERADMIN") {
    return { error: null, session };
  }
  const membership = await prisma.schoolMember.findUnique({
    where: { schoolId_userId: { schoolId, userId: session.user.id } },
  });
  if (!membership || !roles.includes(membership.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}
