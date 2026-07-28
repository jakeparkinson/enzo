import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { updateLabTest } from "./update-lab-test";

/**
 * Integration tests for `updateLabTest` against the real database: the
 * existence check, the code-conflict check, and the actual persisted
 * update all involve real queries worth exercising against Postgres rather
 * than a mocked client.
 */

const RUN_ID = Math.random().toString(36).slice(2, 10);

describe("updateLabTest (integration)", () => {
  let testId: string;
  let otherTestId: string;
  const labTestIds: string[] = [];

  beforeAll(async () => {
    const [test, other] = await Promise.all([
      prisma.labTest.create({
        data: { code: `UP-A-${RUN_ID}`, name: "Test A", price: "10.00", turnaroundDays: 1 },
      }),
      prisma.labTest.create({
        data: { code: `UP-B-${RUN_ID}`, name: "Test B", price: "20.00", turnaroundDays: 2 },
      }),
    ]);
    testId = test.id;
    otherTestId = other.id;
    labTestIds.push(test.id, other.id);
  });

  afterAll(async () => {
    await prisma.labTest.deleteMany({ where: { id: { in: labTestIds } } });
  });

  it("persists the updated fields", async () => {
    const updated = await updateLabTest(testId, {
      code: `UP-A-${RUN_ID}`,
      name: "Test A Renamed",
      price: "15.00",
      turnaroundDays: 3,
    });

    expect(updated.name).toBe("Test A Renamed");
    expect(updated.price.toString()).toBe("15");
    expect(updated.turnaroundDays).toBe(3);
  });

  it("allows re-saving with its own unchanged code", async () => {
    await expect(
      updateLabTest(testId, {
        code: `UP-A-${RUN_ID}`,
        name: "Test A Again",
        price: "11.00",
        turnaroundDays: 1,
      })
    ).resolves.toMatchObject({ name: "Test A Again" });
  });

  it("rejects renaming the code to one already used by another test, with a 409", async () => {
    await expect(
      updateLabTest(testId, {
        code: `UP-B-${RUN_ID}`,
        name: "Test A",
        price: "10.00",
        turnaroundDays: 1,
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects an unknown id with a 404", async () => {
    await expect(
      updateLabTest("does-not-exist", {
        code: `UP-X-${RUN_ID}`,
        name: "Nope",
        price: "1.00",
        turnaroundDays: 1,
      })
    ).rejects.toMatchObject({ status: 404 });
  });

  it("does not rewrite an already-placed order's snapshotted price/turnaround", async () => {
    const patient = await prisma.patient.create({
      data: { firstName: "Snap", lastName: `Shot-${RUN_ID}`, dateOfBirth: new Date("1990-01-01") },
    });

    const order = await prisma.order.create({
      data: {
        patientId: patient.id,
        totalCost: "20.00",
        readyDate: new Date(),
        tests: { create: [{ labTestId: otherTestId, priceAtOrder: "20.00", turnaroundDaysAtOrder: 2 }] },
      },
    });

    await updateLabTest(otherTestId, {
      code: `UP-B-${RUN_ID}`,
      name: "Test B",
      price: "999.00",
      turnaroundDays: 30,
    });

    const persistedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { tests: true },
    });
    expect(persistedOrder.tests[0].priceAtOrder.toString()).toBe("20");
    expect(persistedOrder.tests[0].turnaroundDaysAtOrder).toBe(2);

    await prisma.order.delete({ where: { id: order.id } });
    await prisma.patient.delete({ where: { id: patient.id } });
  });
});
