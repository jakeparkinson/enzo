// Framework-agnostic type for the patient picker on the create-order form.
// Deliberately excludes contact info (email/phone/DOB) — the picker only
// needs enough to identify a patient in a list.
export type PatientOptionDto = {
  id: string;
  firstName: string;
  lastName: string;
};
