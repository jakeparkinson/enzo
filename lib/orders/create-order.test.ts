import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createOrder } from "./create-order";

/**
 * Integration tests for `createOrder` — the core business logic per
 * AGENTS.md (total cost + estimated ready-date calculation), plus the
 * price/turnaround snapshotting guarantee. These run against the real
 * database so we're verifying what's actually persisted, not just the pure
 * `calculateOrderTotals` math (already unit-tested separately).
 *
 * Fixtures are tagged with a random run id and cleaned up in `afterAll`, so
 * this is safe to run repeatedly against a shared dev database.
 */

const RUN_ID = Math.random().toString(36).slice(2, 10);

describe("createOrder (integration)", () => {
  let patientId: string;
  let fastTestId: string;
  let slowTestId: string;
  const patientIds: string[] = [];
  const labTestIds: string[] = [];
  const orderIds: string[] = [];

  beforeAll(async () => {
    const patient = await prisma.patient.create({
      data: {
        firstName: "Test",
        lastName: `CreateOrder-${RUN_ID}`,
        dateOfBirth: new Date("1990-01-01"),
      },
    });
    patientId = patient.id;
    patientIds.push(patient.id);

    const [fastTest, slowTest] = await Promise.all([
      prisma.labTest.create({
        data: { code: `CO-FAST-${RUN_ID}`, name: "Fast Test", price: "10.00", turnaroundDays: 1 },
      }),
      prisma.labTest.create({
        data: { code: `CO-SLOW-${RUN_ID}`, name: "Slow Test", price: "100.00", turnaroundDays: 7 },
      }),
    ]);
    fastTestId = fastTest.id;
    slowTestId = slowTest.id;
    labTestIds.push(fastTest.id, slowTest.id);
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
    await prisma.labTest.deleteMany({ where: { id: { in: labTestIds } } });
  });

  it("persists totalCost and a readyDate of createdAt + turnaround for a single test", async () => {
    const order = await createOrder({ patientId, testIds: [fastTestId] });
    orderIds.push(order.id);

    // decimal.js normalizes away trailing zeros, so "10.00" round-trips as
    // "10" — formatCurrency() (Intl.NumberFormat) handles that fine for
    // display, this is just how Decimal#toString() behaves.
    expect(order.totalCost.toString()).toBe("10");

    // Compared at day granularity: readyDate and createdAt come from two
    // separate `new Date()` reads (one in createOrder, one from Postgres'
    // `now()` default), so they can differ by a few milliseconds.
    const expectedReadyDate = new Date(order.createdAt);
    expectedReadyDate.setDate(expectedReadyDate.getDate() + 1);
    expect(order.readyDate.toISOString().slice(0, 10)).toBe(
      expectedReadyDate.toISOString().slice(0, 10)
    );
  });

  it("sums totalCost but uses the MAX turnaround (not the sum) across multiple tests", async () => {
    const order = await createOrder({ patientId, testIds: [fastTestId, slowTestId] });
    orderIds.push(order.id);

    expect(order.totalCost.toString()).toBe("110");

    const expectedReadyDate = new Date(order.createdAt);
    expectedReadyDate.setDate(expectedReadyDate.getDate() + 7); // slow test's turnaround, not 1 + 7
    expect(order.readyDate.toISOString().slice(0, 10)).toBe(
      expectedReadyDate.toISOString().slice(0, 10)
    );
  });

  it("snapshots price/turnaround onto each line item, unaffected by later catalog edits", async () => {
    const snapshotTest = await prisma.labTest.create({
      data: { code: `CO-SNAP-${RUN_ID}`, name: "Snapshot Test", price: "10.00", turnaroundDays: 1 },
    });
    labTestIds.push(snapshotTest.id);

    const order = await createOrder({ patientId, testIds: [snapshotTest.id] });
    orderIds.push(order.id);

    await prisma.labTest.update({
      where: { id: snapshotTest.id },
      data: { price: "999.00", turnaroundDays: 30 },
    });

    const persisted = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { tests: true },
    });

    expect(persisted.totalCost.toString()).toBe("10");
    expect(persisted.tests[0].priceAtOrder.toString()).toBe("10");
    expect(persisted.tests[0].turnaroundDaysAtOrder).toBe(1);
  });

  it("deduplicates a repeated test id into a single line item", async () => {
    const order = await createOrder({ patientId, testIds: [fastTestId, fastTestId] });
    orderIds.push(order.id);

    expect(order.tests).toHaveLength(1);
    expect(order.totalCost.toString()).toBe("10");
  });

  it("rejects an unknown patient id with a 404", async () => {
    await expect(
      createOrder({ patientId: "does-not-exist", testIds: [fastTestId] })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("rejects an unknown test id, naming it in the error", async () => {
    await expect(
      createOrder({ patientId, testIds: [fastTestId, "does-not-exist"] })
    ).rejects.toThrow(/does-not-exist/);
  });
});
