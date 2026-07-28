import { prisma } from "@/lib/prisma";
import { LabTestError } from "@/lib/lab-tests/lab-test-error";

export async function deleteLabTest(id: string) {
  const existing = await prisma.labTest.findUnique({ where: { id } });
  if (!existing) {
    throw new LabTestError(`No lab test found with id "${id}"`, 404);
  }

  // The schema's `onDelete: Restrict` on OrderTest.labTest (see
  // prisma/schema.prisma) would reject this delete at the database level
  // anyway once an order references the test, but checking here first lets
  // us return a clear, user-facing 409 instead of a raw FK-violation error.
  const orderCount = await prisma.orderTest.count({ where: { labTestId: id } });
  if (orderCount > 0) {
    throw new LabTestError(
      "This test cannot be deleted because it is used by one or more existing orders",
      409
    );
  }

  await prisma.labTest.delete({ where: { id } });
}
