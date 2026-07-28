import { prisma } from "@/lib/prisma";
import { PatientError } from "@/lib/patients/patient-error";
import type { PatientInput } from "@/lib/patients/parse-patient-input";

export async function updatePatient(id: string, input: PatientInput) {
  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing) {
    throw new PatientError(`No patient found with id "${id}"`, 404);
  }

  // Deliberately does NOT touch previously-placed orders: an order only
  // stores `patientId` (see prisma/schema.prisma), and the order list reads
  // the patient's *current* name via the relation — editing a patient here
  // is a correction to their one record, not a snapshot like LabTest price.
  return prisma.patient.update({ where: { id }, data: input });
}
