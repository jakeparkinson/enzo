// Framework-agnostic type for the patient picker on the create-order form.
// Deliberately excludes contact info (email/phone/DOB) — the picker only
// needs enough to identify a patient in a list. `GET /api/patients` actually
// returns the fuller `PatientDto` shape below; this is just the subset the
// picker component reads, so it isn't coupled to the extra fields.
export type PatientOptionDto = {
  id: string;
  firstName: string;
  lastName: string;
};

// Shape of a patient as returned by the patient CRUD endpoints
// (GET/POST /api/patients, PATCH /api/patients/[id]) and rendered on the
// patient management page. `dateOfBirth` is an ISO date string at UTC
// midnight — see formatDateOfBirth in lib/format.ts for why it must be
// displayed (and re-parsed for the edit form) without a local-timezone
// conversion.
export type PatientDto = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string | null;
  phone: string | null;
};
