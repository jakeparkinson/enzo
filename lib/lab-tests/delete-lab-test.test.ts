import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { deleteLabTest } from "./delete-lab-test";

/**
 * Integration tests for `deleteLabTest`, in particular the guard that
 * rejects deleting a test still referenced by an order — the schema's
 * `onDelete: Restrict` (see prisma/schema.prisma) would reject the raw
 * delete anyway, but this proves the friendlier pre-check works too.
 */

const RUN_ID = Math.random().toString(36).slice(2, 10);
const patientIds: string[] = [];
const labTestIds: string[] = [];
const orderIds: string[] = [];

afterAll(async () => {
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
  await prisma.labTest.deleteMany({ where: { id: { in: labTestIds } } });
});

describe("deleteLabTest (integration)", () => {
  it("deletes a test that isn't used by any order", async () => {
    const test = await prisma.labTest.create({
      data: { code: `DEL-UNUSED-${RUN_ID}`, name: "Unused", price: "5.00", turnaroundDays: 1 },
    });
    labTestIds.push(test.id);

    await deleteLabTest(test.id);

    const persisted = await prisma.labTest.findUnique({ where: { id: test.id } });
    expect(persisted).toBeNull();
  });

  it("rejects an unknown id with a 404", async () => {
    await expect(deleteLabTest("does-not-exist")).rejects.toMatchObject({ status: 404 });
  });

  it("rejects deleting a test that's used by an existing order, with a 409", async () => {
    const test = await prisma.labTest.create({
      data: { code: `DEL-USED-${RUN_ID}`, name: "In Use", price: "5.00", turnaroundDays: 1 },
    });
    labTestIds.push(test.id);

    const patient = await prisma.patient.create({
      data: { firstName: "InUse", lastName: `Test-${RUN_ID}`, dateOfBirth: new Date("1990-01-01") },
    });
    patientIds.push(patient.id);

    const order = await prisma.order.create({
      data: {
        patientId: patient.id,
        totalCost: "5.00",
        readyDate: new Date(),
        tests: { create: [{ labTestId: test.id, priceAtOrder: "5.00", turnaroundDaysAtOrder: 1 }] },
      },
    });
    orderIds.push(order.id);

    await expect(deleteLabTest(test.id)).rejects.toMatchObject({ status: 409 });

    const persisted = await prisma.labTest.findUnique({ where: { id: test.id } });
    expect(persisted).not.toBeNull();
  });
});
