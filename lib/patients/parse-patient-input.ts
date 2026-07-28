// Shared request-body validation for creating/updating a patient. Both
// POST /api/patients and PATCH /api/patients/[id] send the full set of
// fields (no partial updates — same reasoning as
// lib/lab-tests/parse-lab-test-input.ts), so they share this one parser.
export type PatientInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  email: string | null;
  phone: string | null;
};

export type ParsePatientInputResult =
  | { data: PatientInput; error?: undefined }
  | { data?: undefined; error: string };

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parsePatientInput(body: unknown): ParsePatientInputResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const { firstName, lastName, dateOfBirth, email, phone } = body as Record<string, unknown>;

  if (typeof firstName !== "string" || firstName.trim() === "") {
    return { error: "firstName is required" };
  }

  if (typeof lastName !== "string" || lastName.trim() === "") {
    return { error: "lastName is required" };
  }

  if (typeof dateOfBirth !== "string" || !DATE_ONLY_PATTERN.test(dateOfBirth)) {
    return { error: "dateOfBirth is required and must be in YYYY-MM-DD format" };
  }
  // Parsing a plain "YYYY-MM-DD" string always yields UTC midnight, which
  // matches how `@db.Date` columns are stored/read — never routed through a
  // local-timezone Date constructor, so there's no off-by-one-day risk (see
  // formatDateOfBirth in lib/format.ts for the display-side half of this).
  const parsedDateOfBirth = new Date(dateOfBirth);
  if (Number.isNaN(parsedDateOfBirth.getTime())) {
    return { error: "dateOfBirth must be a valid date" };
  }
  if (parsedDateOfBirth.getTime() > Date.now()) {
    return { error: "dateOfBirth cannot be in the future" };
  }

  if (email !== undefined && email !== null && typeof email !== "string") {
    return { error: "email must be a string" };
  }
  const trimmedEmail = typeof email === "string" ? email.trim() : "";
  if (trimmedEmail !== "" && !EMAIL_PATTERN.test(trimmedEmail)) {
    return { error: "email must be a valid email address" };
  }

  if (phone !== undefined && phone !== null && typeof phone !== "string") {
    return { error: "phone must be a string" };
  }
  const trimmedPhone = typeof phone === "string" ? phone.trim() : "";

  // Not enforced at the database level (see prisma/schema.prisma) since a
  // check like this belongs at the application boundary, not the schema —
  // but a patient a clinic can't reach by either channel isn't useful data.
  if (trimmedEmail === "" && trimmedPhone === "") {
    return { error: "At least one of email or phone is required" };
  }

  return {
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: parsedDateOfBirth,
      email: trimmedEmail || null,
      phone: trimmedPhone || null,
    },
  };
}
