import { prisma } from "@/lib/prisma";

// Returns full patient records (not just the picker's minimal fields) since
// this now backs both the new-order patient picker and the patient
// management page — see PatientOptionDto vs. PatientDto in types.ts.
export async function getPatients() {
  return prisma.patient.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      email: true,
      phone: true,
    },
  });
}
