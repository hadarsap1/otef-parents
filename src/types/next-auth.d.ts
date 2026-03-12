import "next-auth";
import { Role, SchoolRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      schools: {
        schoolId: string;
        slug: string;
        name: string;
        role: SchoolRole;
      }[];
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
