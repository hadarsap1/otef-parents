"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "", label: "ראשי" },
  { href: "/groups", label: "כיתות" },
  { href: "/members", label: "מורים" },
  { href: "/import", label: "ייבוא" },
  { href: "/settings", label: "הגדרות" },
];

export function SchoolNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/school/${slug}`;

  return (
    <nav className="flex gap-1 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide" role="navigation" aria-label="ניווט בית הספר">
      {tabs.map((tab) => {
        const href = `${base}${tab.href}`;
        const active =
          tab.href === ""
            ? pathname === base
            : pathname.startsWith(href);
        return (
          <Link
            key={tab.href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "px-3 py-2.5 min-h-[44px] flex items-center rounded-full text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
