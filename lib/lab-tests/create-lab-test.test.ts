import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createLabTest } from "./create-lab-test";

/**
 * Integration tests for `createLabTest` against the real database, since its
 * job is enforcing a uniqueness rule via a real query plus a real insert.
 * Fixtures are tagged with a random run id and cleaned up in `afterAll`, so
 * this is safe to run repeatedly against a shared dev database.
 */

const RUN_ID = Math.random().toString(36).slice(2, 10);
const labTestIds: string[] = [];

afterAll(async () => {
  await prisma.labTest.deleteMany({ where: { id: { in: labTestIds } } });
});

describe("createLabTest (integration)", () => {
  it("creates and persists a new catalog entry", async () => {
    const labTest = await createLabTest({
      code: `CO-CREATE-${RUN_ID}`,
      name: "Create Test",
      price: "12.50",
      turnaroundDays: 2,
    });
    labTestIds.push(labTest.id);

    expect(labTest.code).toBe(`CO-CREATE-${RUN_ID}`);
    expect(labTest.price.toString()).toBe("12.5");
    expect(labTest.turnaroundDays).toBe(2);

    const persisted = await prisma.labTest.findUnique({ where: { id: labTest.id } });
    expect(persisted).not.toBeNull();
  });

  it("rejects a duplicate code with a 409", async () => {
    const code = `CO-DUP-${RUN_ID}`;
    const first = await createLabTest({
      code,
      name: "First",
      price: "10.00",
      turnaroundDays: 1,
    });
    labTestIds.push(first.id);

    await expect(
      createLabTest({ code, name: "Second", price: "20.00", turnaroundDays: 1 })
    ).rejects.toMatchObject({ status: 409 });
  });
});
