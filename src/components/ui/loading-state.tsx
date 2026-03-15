import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground" role="status" aria-busy="true">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>טוען...</span>
    </div>
  );
}
