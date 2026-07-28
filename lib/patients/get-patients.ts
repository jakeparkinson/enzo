import { prisma } from "@/lib/prisma";

export async function getPatients() {
  return prisma.patient.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });
}
