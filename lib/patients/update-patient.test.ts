import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { updatePatient } from "./update-patient";

/**
 * Integration tests for `updatePatient` against the real database: the
 * existence check and the actual persisted update.
 */

const RUN_ID = Math.random().toString(36).slice(2, 10);

describe("updatePatient (integration)", () => {
  let patientId: string;
  const patientIds: string[] = [];

  beforeAll(async () => {
    const patient = await prisma.patient.create({
      data: {
        firstName: "Before",
        lastName: `Update-${RUN_ID}`,
        dateOfBirth: new Date("1985-06-15"),
        email: "before@example.com",
        phone: null,
      },
    });
    patientId = patient.id;
    patientIds.push(patient.id);
  });

  afterAll(async () => {
    await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
  });

  it("persists the updated fields", async () => {
    const updated = await updatePatient(patientId, {
      firstName: "After",
      lastName: `Update-${RUN_ID}`,
      dateOfBirth: new Date("1985-06-15"),
      email: null,
      phone: "555-0199",
    });

    expect(updated.firstName).toBe("After");
    expect(updated.email).toBeNull();
    expect(updated.phone).toBe("555-0199");
  });

  it("rejects an unknown id with a 404", async () => {
    await expect(
      updatePatient("does-not-exist", {
        firstName: "Nope",
        lastName: "Nope",
        dateOfBirth: new Date("2000-01-01"),
        email: "nope@example.com",
        phone: null,
      })
    ).rejects.toMatchObject({ status: 404 });
  });
});
