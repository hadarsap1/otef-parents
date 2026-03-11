import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        <Icon className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>{title}</p>
        {description && <p className="text-sm">{description}</p>}
      </CardContent>
    </Card>
  );
}
