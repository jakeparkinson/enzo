"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LabTestsTable } from "@/components/lab-tests/lab-tests-table";
import { LabTestFormDialog } from "@/components/lab-tests/lab-test-form-dialog";
import { DeleteLabTestDialog } from "@/components/lab-tests/delete-lab-test-dialog";
import type { LabTestDto } from "@/lib/lab-tests/types";

export function LabTestsDashboard() {
  const [labTests, setLabTests] = useState<LabTestDto[]>([]);
  // Bumped after a successful create/edit/delete to trigger a re-fetch.
  const [refreshToken, setRefreshToken] = useState(0);
  // isLoading is derived (not set synchronously in the effect below) to
  // avoid triggering React's "no setState directly in an effect" lint rule
  // — mirrors the same pattern in OrdersDashboard.
  const [loadedToken, setLoadedToken] = useState<number | null>(null);
  const isLoading = loadedToken !== refreshToken;

  const [formOpen, setFormOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTestDto | null>(null);
  // Forces LabTestFormDialog to remount (and re-seed its form state) each
  // time it's opened for a new target, instead of syncing that in an effect.
  const [formInstanceKey, setFormInstanceKey] = useState(0);
  const [deletingTest, setDeletingTest] = useState<LabTestDto | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/lab-tests", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to load lab tests");
        }
        return res.json() as Promise<LabTestDto[]>;
      })
      .then((data) => setLabTests(data))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error(error instanceof Error ? error.message : "Failed to load lab tests");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedToken(refreshToken);
      });

    return () => controller.abort();
  }, [refreshToken]);

  function refresh() {
    setRefreshToken((token) => token + 1);
  }

  function openCreateDialog() {
    setEditingTest(null);
    setFormInstanceKey((key) => key + 1);
    setFormOpen(true);
  }

  function openEditDialog(labTest: LabTestDto) {
    setEditingTest(labTest);
    setFormInstanceKey((key) => key + 1);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>New Test</Button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Loading catalog...
        </div>
      ) : (
        <LabTestsTable labTests={labTests} onEdit={openEditDialog} onDelete={setDeletingTest} />
      )}

      <LabTestFormDialog
        key={formInstanceKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        labTest={editingTest}
        onSaved={refresh}
      />
      <DeleteLabTestDialog
        labTest={deletingTest}
        onOpenChange={(open) => {
          if (!open) setDeletingTest(null);
        }}
        onDeleted={refresh}
      />
    </div>
  );
}
