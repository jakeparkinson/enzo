import { prisma } from "@/lib/prisma";
import { LabTestError } from "@/lib/lab-tests/lab-test-error";
import type { LabTestInput } from "@/lib/lab-tests/parse-lab-test-input";

export async function updateLabTest(id: string, input: LabTestInput) {
  const existing = await prisma.labTest.findUnique({ where: { id } });
  if (!existing) {
    throw new LabTestError(`No lab test found with id "${id}"`, 404);
  }

  if (input.code !== existing.code) {
    const codeConflict = await prisma.labTest.findUnique({
      where: { code: input.code },
    });
    if (codeConflict) {
      throw new LabTestError(
        `A lab test with code "${input.code}" already exists`,
        409
      );
    }
  }

  // Deliberately does NOT touch previously-placed orders: `OrderTest` rows
  // snapshot `priceAtOrder`/`turnaroundDaysAtOrder` at order-creation time
  // (see prisma/schema.prisma), so editing the catalog here never rewrites
  // the cost/ready-date of an order that's already been placed.
  return prisma.labTest.update({ where: { id }, data: input });
}
