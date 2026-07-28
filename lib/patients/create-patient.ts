import { prisma } from "@/lib/prisma";
import type { PatientInput } from "@/lib/patients/parse-patient-input";

export async function createPatient(input: PatientInput) {
  return prisma.patient.create({ data: input });
}
