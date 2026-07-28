import { prisma } from "@/lib/prisma";

export async function getLabTests() {
  return prisma.labTest.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, price: true, turnaroundDays: true },
  });
}
