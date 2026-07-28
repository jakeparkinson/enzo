import { prisma } from "@/lib/prisma";
import { LabTestError } from "@/lib/lab-tests/lab-test-error";
import type { LabTestInput } from "@/lib/lab-tests/parse-lab-test-input";

export async function createLabTest(input: LabTestInput) {
  const existing = await prisma.labTest.findUnique({
    where: { code: input.code },
  });
  if (existing) {
    throw new LabTestError(
      `A lab test with code "${input.code}" already exists`,
      409
    );
  }

  return prisma.labTest.create({ data: input });
}
