"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Home, PartyPopper, UsersRound, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const parentLinks = [
  { href: "/dashboard", label: "ראשי", icon: Home },
  { href: "/dashboard/children", label: "ילדים", icon: Users },
  { href: "/dashboard/lessons", label: "שיעורים", icon: Clock },
  { href: "/dashboard/playdates", label: "מפגשים", icon: PartyPopper },
];

const teacherLinks = [
  { href: "/dashboard", label: "ראשי", icon: Home },
  { href: "/dashboard/teacher", label: "ניהול", icon: UsersRound },
  { href: "/dashboard/lessons", label: "שיעורים", icon: Clock },
  { href: "/dashboard/children", label: "ילדים", icon: Users },
  { href: "/dashboard/playdates", label: "מפגשים", icon: PartyPopper },
];

const adminLinks = [
  { href: "/dashboard", label: "ראשי", icon: Home },
  { href: "/dashboard/admin", label: "ניהול", icon: Shield },
  { href: "/dashboard/teacher", label: "מורה", icon: UsersRound },
  { href: "/dashboard/children", label: "ילדים", icon: Users },
  { href: "/dashboard/playdates", label: "מפגשים", icon: PartyPopper },
];

export function BottomNav({ role }: { role?: string }) {
  const pathname = usePathname();

  const links =
    role === "SUPERADMIN"
      ? adminLinks
      : role === "TEACHER"
        ? teacherLinks
        : parentLinks;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border/50 bg-white/90 backdrop-blur-lg dark:bg-background/90 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === href
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 text-xs transition-all active:scale-95 min-w-[60px] py-1.5 rounded-xl",
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-xl transition-colors",
                active ? "bg-primary/10" : ""
              )}>
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              </div>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
