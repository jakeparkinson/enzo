"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PatientsTable } from "@/components/patients/patients-table";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import type { PatientDto } from "@/lib/patients/types";

export function PatientsDashboard() {
  const [patients, setPatients] = useState<PatientDto[]>([]);
  // Bumped after a successful create/edit to trigger a re-fetch.
  const [refreshToken, setRefreshToken] = useState(0);
  // isLoading is derived (not set synchronously in the effect below) to
  // avoid triggering React's "no setState directly in an effect" lint rule
  // — mirrors the same pattern in LabTestsDashboard/OrdersDashboard.
  const [loadedToken, setLoadedToken] = useState<number | null>(null);
  const isLoading = loadedToken !== refreshToken;

  const [formOpen, setFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientDto | null>(null);
  // Forces PatientFormDialog to remount (and re-seed its form state) each
  // time it's opened for a new target, instead of syncing that in an effect.
  const [formInstanceKey, setFormInstanceKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/patients", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to load patients");
        }
        return res.json() as Promise<PatientDto[]>;
      })
      .then((data) => setPatients(data))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error(error instanceof Error ? error.message : "Failed to load patients");
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
    setEditingPatient(null);
    setFormInstanceKey((key) => key + 1);
    setFormOpen(true);
  }

  function openEditDialog(patient: PatientDto) {
    setEditingPatient(patient);
    setFormInstanceKey((key) => key + 1);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>New Patient</Button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Loading patients...
        </div>
      ) : (
        <PatientsTable patients={patients} onEdit={openEditDialog} />
      )}

      <PatientFormDialog
        key={formInstanceKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        patient={editingPatient}
        onSaved={refresh}
      />
    </div>
  );
}
