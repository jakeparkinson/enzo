"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import type { LabTestDto } from "@/lib/lab-tests/types";

type FormErrors = {
  code?: string;
  name?: string;
  price?: string;
  turnaroundDays?: string;
};

type FormState = {
  code: string;
  name: string;
  price: string;
  turnaroundDays: string;
};

const EMPTY_FORM: FormState = { code: "", name: "", price: "", turnaroundDays: "" };

function toFormState(labTest: LabTestDto): FormState {
  return {
    code: labTest.code,
    name: labTest.name,
    price: labTest.price,
    turnaroundDays: String(labTest.turnaroundDays),
  };
}

/**
 * Shared create/edit dialog for the lab test catalog; pass `labTest` to
 * edit, omit it to create.
 *
 * The caller is expected to remount this component (via a changing `key`,
 * e.g. `labTest?.id ?? "create"` plus a counter for repeat "New Test"
 * opens) whenever it opens the dialog for a different target. That lets
 * the form seed its initial state directly from props with no effect
 * needed to "re-sync" state after the fact.
 */
export function LabTestFormDialog({
  open,
  onOpenChange,
  labTest,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labTest?: LabTestDto | null;
  onSaved: () => void;
}) {
  const isEditing = !!labTest;

  const [form, setForm] = useState<FormState>(() =>
    labTest ? toFormState(labTest) : EMPTY_FORM
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!form.code.trim()) nextErrors.code = "Code is required";
    if (!form.name.trim()) nextErrors.name = "Name is required";

    const price = Number(form.price);
    if (form.price.trim() === "" || !Number.isFinite(price) || price <= 0) {
      nextErrors.price = "Enter a price greater than 0";
    }

    const turnaroundDays = Number(form.turnaroundDays);
    if (
      form.turnaroundDays.trim() === "" ||
      !Number.isInteger(turnaroundDays) ||
      turnaroundDays <= 0
    ) {
      nextErrors.turnaroundDays = "Enter a whole number of days greater than 0";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        isEditing ? `/api/lab-tests/${labTest.id}` : "/api/lab-tests",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: form.code,
            name: form.name,
            price: form.price,
            turnaroundDays: Number(form.turnaroundDays),
          }),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Failed to ${isEditing ? "update" : "create"} test`);
      }

      toast.success(isEditing ? "Test updated" : "Test added to catalog");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? "update" : "create"} test`
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit test" : "New test"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this catalog entry. Existing orders keep the price and turnaround they were placed with."
              : "Add a new test to the lab catalog."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!errors.code}>
              <FieldLabel htmlFor="test-code">Code</FieldLabel>
              <Input
                id="test-code"
                placeholder="e.g. CBC"
                value={form.code}
                onChange={(e) => updateField("code", e.target.value)}
                aria-invalid={!!errors.code}
              />
              <FieldError errors={errors.code ? [{ message: errors.code }] : undefined} />
            </Field>

            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="test-name">Name</FieldLabel>
              <Input
                id="test-name"
                placeholder="e.g. Complete Blood Count"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                aria-invalid={!!errors.name}
              />
              <FieldError errors={errors.name ? [{ message: errors.name }] : undefined} />
            </Field>

            <Field data-invalid={!!errors.price}>
              <FieldLabel htmlFor="test-price">Price (USD)</FieldLabel>
              <Input
                id="test-price"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g. 24.99"
                value={form.price}
                onChange={(e) => updateField("price", e.target.value)}
                aria-invalid={!!errors.price}
              />
              <FieldError errors={errors.price ? [{ message: errors.price }] : undefined} />
            </Field>

            <Field data-invalid={!!errors.turnaroundDays}>
              <FieldLabel htmlFor="test-turnaround">Turnaround (days)</FieldLabel>
              <Input
                id="test-turnaround"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 2"
                value={form.turnaroundDays}
                onChange={(e) => updateField("turnaroundDays", e.target.value)}
                aria-invalid={!!errors.turnaroundDays}
              />
              <FieldError
                errors={errors.turnaroundDays ? [{ message: errors.turnaroundDays }] : undefined}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEditing ? "Save changes" : "Add test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
