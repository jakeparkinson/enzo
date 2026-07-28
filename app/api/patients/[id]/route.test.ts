import { beforeEach, describe, expect, it, vi } from "vitest";

// Real query/mutation correctness is covered by the integration tests in
// lib/patients/*.test.ts; this suite is only about the route handler's own
// job: request validation and delegation.
const updatePatientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/patients/update-patient", () => ({ updatePatient: updatePatientMock }));

import { PATCH } from "./route";
import { PatientError } from "@/lib/patients/patient-error";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/patients/patient_1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validBody = {
  firstName: "Alice",
  lastName: "Nguyen",
  dateOfBirth: "1988-03-14",
  email: "alice@example.com",
  phone: "555-0101",
};

describe("PATCH /api/patients/[id]", () => {
  beforeEach(() => {
    updatePatientMock.mockReset();
  });

  it("rejects a malformed JSON body with a 400", async () => {
    const response = await PATCH(patchRequest("{not valid json"), context("patient_1"));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/valid JSON/);
    expect(updatePatientMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid body with a 400 and doesn't call updatePatient", async () => {
    const response = await PATCH(
      patchRequest({ ...validBody, email: undefined, phone: undefined }),
      context("patient_1")
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/At least one of email or phone/);
    expect(updatePatientMock).not.toHaveBeenCalled();
  });

  it("forwards the id and normalized body to updatePatient", async () => {
    updatePatientMock.mockResolvedValue({ id: "patient_1", firstName: "Alice" });

    const response = await PATCH(patchRequest(validBody), context("patient_1"));

    expect(updatePatientMock).toHaveBeenCalledWith("patient_1", {
      firstName: "Alice",
      lastName: "Nguyen",
      dateOfBirth: new Date("1988-03-14T00:00:00.000Z"),
      email: "alice@example.com",
      phone: "555-0101",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "patient_1", firstName: "Alice" });
  });

  it("maps a PatientError to its own status code and message", async () => {
    updatePatientMock.mockRejectedValue(
      new PatientError('No patient found with id "patient_1"', 404)
    );

    const response = await PATCH(patchRequest(validBody), context("patient_1"));

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe('No patient found with id "patient_1"');
  });

  it("maps an unexpected error to a 500", async () => {
    updatePatientMock.mockRejectedValue(new Error("connection lost"));

    const response = await PATCH(patchRequest(validBody), context("patient_1"));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("Failed to update patient");
  });
});
