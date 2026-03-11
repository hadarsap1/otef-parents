"use client";

import { AddLessonDialog } from "@/components/add-lesson-dialog";
import { useRouter } from "next/navigation";

export function LessonsPageHeader() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold">שיעורים</h1>
      <AddLessonDialog onAdded={() => router.refresh()} />
    </div>
  );
}
