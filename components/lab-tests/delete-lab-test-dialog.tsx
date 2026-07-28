"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { LabTestDto } from "@/lib/lab-tests/types";

export function DeleteLabTestDialog({
  labTest,
  onOpenChange,
  onDeleted,
}: {
  labTest: LabTestDto | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!labTest) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/lab-tests/${labTest.id}`, { method: "DELETE" });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete test");
      }

      toast.success(`${labTest.code} removed from catalog`);
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete test");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={!!labTest} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {labTest?.code}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes &ldquo;{labTest?.name}&rdquo; from the catalog. This can&apos;t be undone.
            Tests already used by an order can&apos;t be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
