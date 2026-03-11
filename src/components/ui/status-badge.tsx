import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  variant: "success" | "warning";
  children: React.ReactNode;
}

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full",
        variant === "success" &&
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        variant === "warning" &&
          "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
      )}
    >
      {children}
    </span>
  );
}
