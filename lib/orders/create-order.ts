import { prisma } from "@/lib/prisma";
import { calculateOrderTotals } from "@/lib/orders/calculate-order-totals";

/**
 * Thrown for expected, user-facing failures (unknown patient/test ids) so
 * the route handler can map them to the right HTTP status instead of a
 * generic 500.
 */
export class OrderCreationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OrderCreationError";
    this.status = status;
  }
}

export type CreateOrderInput = {
  patientId: string;
  /** One or more lab test catalog ids. Duplicates are ignored. */
  testIds: string[];
};

export async function createOrder(input: CreateOrderInput) {
  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
  });
  if (!patient) {
    throw new OrderCreationError(
      `No patient found with id "${input.patientId}"`,
      404
    );
  }

  const uniqueTestIds = Array.from(new Set(input.testIds));
  const labTests = await prisma.labTest.findMany({
    where: { id: { in: uniqueTestIds } },
  });

  if (labTests.length !== uniqueTestIds.length) {
    const foundIds = new Set(labTests.map((t) => t.id));
    const missingIds = uniqueTestIds.filter((id) => !foundIds.has(id));
    throw new OrderCreationError(
      `No lab test found with id(s): ${missingIds.join(", ")}`,
      404
    );
  }

  // Prices/turnaround are snapshotted onto each line item at creation time
  // (see prisma/schema.prisma) so later catalog edits never rewrite the
  // cost or ready date of an order that's already been placed.
  const { totalCost, readyDate } = calculateOrderTotals(
    labTests.map((t) => ({ price: t.price, turnaroundDays: t.turnaroundDays })),
    new Date()
  );

  return prisma.order.create({
    data: {
      patientId: patient.id,
      totalCost,
      readyDate,
      tests: {
        create: labTests.map((t) => ({
          labTestId: t.id,
          priceAtOrder: t.price,
          turnaroundDaysAtOrder: t.turnaroundDays,
        })),
      },
    },
    include: {
      patient: true,
      tests: { include: { labTest: true } },
    },
  });
}
