"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PatientOptionDto } from "@/lib/patients/types";
import type { LabTestOptionDto } from "@/lib/lab-tests/types";

type FormErrors = {
  patientId?: string;
  testIds?: string;
};

export function CreateOrderDialog({
  onOrderCreated,
}: {
  onOrderCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState<PatientOptionDto[]>([]);
  const [labTests, setLabTests] = useState<LabTestOptionDto[]>([]);
  // Tracks whether the picker data has been fetched for the current time the
  // dialog is open; reset on close so re-opening shows a loading state again
  // instead of briefly showing stale data.
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const loadingOptions = open && !optionsLoaded;

  const [patientId, setPatientId] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    Promise.all([
      fetch("/api/patients", { signal: controller.signal }).then(
        (res) => res.json() as Promise<PatientOptionDto[]>
      ),
      fetch("/api/lab-tests", { signal: controller.signal }).then(
        (res) => res.json() as Promise<LabTestOptionDto[]>
      ),
    ])
      .then(([patientsData, labTestsData]) => {
        setPatients(patientsData);
        setLabTests(labTestsData);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error("Failed to load patients and lab tests");
      })
      .finally(() => {
        if (!controller.signal.aborted) setOptionsLoaded(true);
      });

    return () => controller.abort();
  }, [open]);

  function resetForm() {
    setPatientId("");
    setSelectedTestIds(new Set());
    setErrors({});
    setOptionsLoaded(false);
  }

  function toggleTest(testId: string, checked: boolean) {
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(testId);
      else next.delete(testId);
      return next;
    });
    setErrors((prev) => ({ ...prev, testIds: undefined }));
  }

  const selectedTests = useMemo(
    () => labTests.filter((test) => selectedTestIds.has(test.id)),
    [labTests, selectedTestIds]
  );

  // A quick client-side preview only — plain numbers are fine here since the
  // server recomputes the authoritative total/ready-date with Decimal math
  // from calculateOrderTotals when the order is actually created.
  const preview = useMemo(() => {
    if (selectedTests.length === 0) return null;

    const totalCost = selectedTests.reduce((sum, test) => sum + Number(test.price), 0);
    const maxTurnaroundDays = Math.max(...selectedTests.map((test) => test.turnaroundDays));
    const readyDate = new Date();
    readyDate.setDate(readyDate.getDate() + maxTurnaroundDays);

    return { totalCost, readyDate };
  }, [selectedTests]);

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!patientId) nextErrors.patientId = "Select a patient";
    if (selectedTestIds.size === 0) nextErrors.testIds = "Select at least one test";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          testIds: Array.from(selectedTestIds),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to create order");
      }

      toast.success("Order created");
      resetForm();
      setOpen(false);
      onOrderCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger render={<Button>New Order</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New order</DialogTitle>
          <DialogDescription>
            Select a patient and one or more tests to place a new order.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!errors.patientId}>
              <FieldLabel htmlFor="order-patient">Patient</FieldLabel>
              <Select
                value={patientId}
                onValueChange={(value) => {
                  setPatientId(value as string);
                  setErrors((prev) => ({ ...prev, patientId: undefined }));
                }}
                disabled={loadingOptions}
              >
                <SelectTrigger
                  id="order-patient"
                  className="w-full"
                  aria-invalid={!!errors.patientId}
                >
                  <SelectValue placeholder="Select a patient">
                  {(value: string) => {
                    const selected = patients.find((patient) => patient.id === value);
                    return selected ? `${selected.lastName}, ${selected.firstName}` : value;
                  }}
                </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.lastName}, {patient.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                errors={errors.patientId ? [{ message: errors.patientId }] : undefined}
              />
            </Field>

            <Field data-invalid={!!errors.testIds}>
              <FieldLabel>Lab tests</FieldLabel>
              <div
                className="flex max-h-52 flex-col gap-1 overflow-y-auto rounded-lg border p-2 data-invalid:border-destructive"
                data-invalid={!!errors.testIds}
              >
                {loadingOptions && (
                  <p className="p-2 text-sm text-muted-foreground">Loading tests...</p>
                )}
                {!loadingOptions && labTests.length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">
                    No lab tests in the catalog.
                  </p>
                )}
                {labTests.map((test) => (
                  <label
                    key={test.id}
                    htmlFor={`test-${test.id}`}
                    className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-accent"
                  >
                    <Checkbox
                      id={`test-${test.id}`}
                      checked={selectedTestIds.has(test.id)}
                      onCheckedChange={(checked) => toggleTest(test.id, checked === true)}
                      className="mt-0.5"
                    />
                    <span className="flex flex-1 flex-col text-sm">
                      <span className="font-medium">
                        {test.code} — {test.name}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(test.price)} · {test.turnaroundDays}-day turnaround
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <FieldError
                errors={errors.testIds ? [{ message: errors.testIds }] : undefined}
              />
            </Field>
          </FieldGroup>

          {preview && (
            <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated total</span>
                <span className="font-medium">{formatCurrency(preview.totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated ready date</span>
                <span className="font-medium">{formatDate(preview.readyDate)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
