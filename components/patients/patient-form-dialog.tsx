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
import type { PatientDto } from "@/lib/patients/types";

type FormErrors = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  contact?: string;
};

type FormState = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  email: "",
  phone: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Today's date as "YYYY-MM-DD", for the date input's `max` attribute and
// the future-date check — sliced from an ISO string rather than built from
// local Date getters, so it lines up with how dateOfBirth is stored/parsed
// (see parse-patient-input.ts).
const TODAY = new Date().toISOString().slice(0, 10);

function toFormState(patient: PatientDto): FormState {
  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth.slice(0, 10),
    email: patient.email ?? "",
    phone: patient.phone ?? "",
  };
}

/**
 * Shared create/edit dialog for patients; pass `patient` to edit, omit it
 * to create. See LabTestFormDialog for why the caller should remount this
 * (via a changing `key`) rather than relying on an effect to re-seed state.
 */
export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: PatientDto | null;
  onSaved: () => void;
}) {
  const isEditing = !!patient;

  const [form, setForm] = useState<FormState>(() =>
    patient ? toFormState(patient) : EMPTY_FORM
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, contact: undefined }));
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!form.firstName.trim()) nextErrors.firstName = "First name is required";
    if (!form.lastName.trim()) nextErrors.lastName = "Last name is required";

    if (!form.dateOfBirth) {
      nextErrors.dateOfBirth = "Date of birth is required";
    } else if (form.dateOfBirth > TODAY) {
      nextErrors.dateOfBirth = "Date of birth cannot be in the future";
    }

    if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address";
    }

    if (!form.email.trim() && !form.phone.trim()) {
      nextErrors.contact = "Enter an email or phone number";
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
        isEditing ? `/api/patients/${patient.id}` : "/api/patients",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            dateOfBirth: form.dateOfBirth,
            email: form.email,
            phone: form.phone,
          }),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Failed to ${isEditing ? "update" : "add"} patient`);
      }

      toast.success(isEditing ? "Patient updated" : "Patient added");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? "update" : "add"} patient`
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit patient" : "New patient"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this patient's details."
              : "Add a new patient. An email or phone number is required."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.firstName}>
                <FieldLabel htmlFor="patient-first-name">First name</FieldLabel>
                <Input
                  id="patient-first-name"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  aria-invalid={!!errors.firstName}
                />
                <FieldError
                  errors={errors.firstName ? [{ message: errors.firstName }] : undefined}
                />
              </Field>

              <Field data-invalid={!!errors.lastName}>
                <FieldLabel htmlFor="patient-last-name">Last name</FieldLabel>
                <Input
                  id="patient-last-name"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  aria-invalid={!!errors.lastName}
                />
                <FieldError
                  errors={errors.lastName ? [{ message: errors.lastName }] : undefined}
                />
              </Field>
            </div>

            <Field data-invalid={!!errors.dateOfBirth}>
              <FieldLabel htmlFor="patient-dob">Date of birth</FieldLabel>
              <Input
                id="patient-dob"
                type="date"
                max={TODAY}
                value={form.dateOfBirth}
                onChange={(e) => updateField("dateOfBirth", e.target.value)}
                aria-invalid={!!errors.dateOfBirth}
              />
              <FieldError
                errors={errors.dateOfBirth ? [{ message: errors.dateOfBirth }] : undefined}
              />
            </Field>

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="patient-email">Email</FieldLabel>
              <Input
                id="patient-email"
                type="email"
                placeholder="e.g. alice@example.com"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                aria-invalid={!!errors.email}
              />
              <FieldError errors={errors.email ? [{ message: errors.email }] : undefined} />
            </Field>

            <Field data-invalid={!!errors.contact}>
              <FieldLabel htmlFor="patient-phone">Phone</FieldLabel>
              <Input
                id="patient-phone"
                type="tel"
                placeholder="e.g. 555-0101"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                aria-invalid={!!errors.contact}
              />
              <FieldError errors={errors.contact ? [{ message: errors.contact }] : undefined} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEditing ? "Save changes" : "Add patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
