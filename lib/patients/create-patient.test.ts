import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createPatient } from "./create-patient";

/**
 * Integration test for `createPatient` against the real database — thin by
 * design (no uniqueness/business rules live here, unlike lab tests), so
 * this just proves the record round-trips correctly, including the
 * date-of-birth UTC-midnight handling documented in parse-patient-input.ts.
 */

const RUN_ID = Math.random().toString(36).slice(2, 10);
const patientIds: string[] = [];

afterAll(async () => {
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
});

describe("createPatient (integration)", () => {
  it("creates and persists a new patient", async () => {
    const patient = await createPatient({
      firstName: "Create",
      lastName: `Test-${RUN_ID}`,
      dateOfBirth: new Date("1990-05-20T00:00:00.000Z"),
      email: "create-test@example.com",
      phone: null,
    });
    patientIds.push(patient.id);

    expect(patient.firstName).toBe("Create");
    expect(patient.dateOfBirth.toISOString()).toBe("1990-05-20T00:00:00.000Z");
    expect(patient.email).toBe("create-test@example.com");
    expect(patient.phone).toBeNull();

    const persisted = await prisma.patient.findUnique({ where: { id: patient.id } });
    expect(persisted).not.toBeNull();
  });
});
