import { Prisma } from "@/lib/generated/prisma/client";

const { Decimal } = Prisma;
type Decimal = Prisma.Decimal;

export type OrderTestInput = {
  price: Decimal | number | string;
  turnaroundDays: number;
};

export type OrderTotals = {
  totalCost: Decimal;
  readyDate: Date;
};

/**
 * Computes an order's total cost and estimated ready date from the tests
 * selected on it.
 *
 * - totalCost is the sum of each test's price.
 * - readyDate is orderDate + the MAX turnaround across the selected tests,
 *   since tests are assumed to run in parallel: the order isn't ready until
 *   the slowest test finishes, not after all turnaround times stack up.
 *
 * Callers are expected to pass already-snapshotted price/turnaroundDays
 * values (see OrderTest in prisma/schema.prisma), not live catalog values.
 */
export function calculateOrderTotals(
  tests: OrderTestInput[],
  orderDate: Date
): OrderTotals {
  if (tests.length === 0) {
    throw new Error("An order must include at least one test");
  }

  const totalCost = tests.reduce(
    (sum, test) => sum.plus(test.price),
    new Decimal(0)
  );

  const maxTurnaroundDays = Math.max(...tests.map((t) => t.turnaroundDays));
  const readyDate = addDays(orderDate, maxTurnaroundDays);

  return { totalCost, readyDate };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
