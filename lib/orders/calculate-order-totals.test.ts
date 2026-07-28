import { describe, expect, it } from "vitest";
import { calculateOrderTotals } from "./calculate-order-totals";

const orderDate = new Date("2026-01-01T00:00:00.000Z");

describe("calculateOrderTotals", () => {
  it("sums the price of a single test", () => {
    const { totalCost } = calculateOrderTotals(
      [{ price: 49.99, turnaroundDays: 1 }],
      orderDate
    );

    expect(totalCost.toString()).toBe("49.99");
  });

  it("sums prices across multiple tests", () => {
    const { totalCost } = calculateOrderTotals(
      [
        { price: 25, turnaroundDays: 1 },
        { price: 100.5, turnaroundDays: 3 },
        { price: 10.25, turnaroundDays: 2 },
      ],
      orderDate
    );

    expect(totalCost.toString()).toBe("135.75");
  });

  it("avoids floating point rounding errors when summing prices", () => {
    const { totalCost } = calculateOrderTotals(
      [
        { price: 0.1, turnaroundDays: 1 },
        { price: 0.2, turnaroundDays: 1 },
      ],
      orderDate
    );

    // 0.1 + 0.2 !== 0.3 with plain floating point math.
    expect(totalCost.toString()).toBe("0.3");
  });

  it("sets the ready date to the order date plus the single test's turnaround", () => {
    const { readyDate } = calculateOrderTotals(
      [{ price: 10, turnaroundDays: 5 }],
      orderDate
    );

    expect(readyDate.toISOString()).toBe("2026-01-06T00:00:00.000Z");
  });

  it("uses the MAX turnaround across tests, not the sum", () => {
    const { readyDate } = calculateOrderTotals(
      [
        { price: 10, turnaroundDays: 1 },
        { price: 20, turnaroundDays: 10 },
        { price: 30, turnaroundDays: 3 },
      ],
      orderDate
    );

    // Should be orderDate + 10 days (the slowest test), not +14 (the sum).
    expect(readyDate.toISOString()).toBe("2026-01-11T00:00:00.000Z");
  });

  it("handles a turnaround of zero days (same-day ready)", () => {
    const { readyDate } = calculateOrderTotals(
      [{ price: 10, turnaroundDays: 0 }],
      orderDate
    );

    expect(readyDate.toISOString()).toBe(orderDate.toISOString());
  });

  it("throws when given no tests", () => {
    expect(() => calculateOrderTotals([], orderDate)).toThrow(
      "An order must include at least one test"
    );
  });
});
