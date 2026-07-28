import { beforeEach, describe, expect, it, vi } from "vitest";

// Real query/creation correctness is covered by the integration tests in
// lib/patients/*.test.ts; this suite is only about the route handlers' own
// job: request validation and delegation (mirrors app/api/lab-tests/route.test.ts).
const getPatientsMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/patients/get-patients", () => ({ getPatients: getPatientsMock }));

const createPatientMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/patients/create-patient", () => ({ createPatient: createPatientMock }));

import { GET, POST } from "./route";

function postRequest(body: unknown) {
  return new Request("http://localhost/api/patients", {
    method: "POST",
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

describe("GET /api/patients", () => {
  it("returns getPatients' result as JSON", async () => {
    getPatientsMock.mockResolvedValue([{ id: "patient_1" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "patient_1" }]);
  });
});

describe("POST /api/patients", () => {
  beforeEach(() => {
    createPatientMock.mockReset();
  });

  it("rejects a malformed JSON body with a 400", async () => {
    const response = await POST(postRequest("{not valid json"));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/valid JSON/);
    expect(createPatientMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid body with a 400 and doesn't call createPatient", async () => {
    const response = await POST(postRequest({ ...validBody, firstName: "" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/firstName is required/);
    expect(createPatientMock).not.toHaveBeenCalled();
  });

  it("forwards a normalized, valid body to createPatient and returns 201", async () => {
    createPatientMock.mockResolvedValue({ id: "patient_1", firstName: "Alice" });

    const response = await POST(postRequest(validBody));

    expect(createPatientMock).toHaveBeenCalledWith({
      firstName: "Alice",
      lastName: "Nguyen",
      dateOfBirth: new Date("1988-03-14T00:00:00.000Z"),
      email: "alice@example.com",
      phone: "555-0101",
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "patient_1", firstName: "Alice" });
  });

  it("maps an unexpected error to a 500", async () => {
    createPatientMock.mockRejectedValue(new Error("connection lost"));

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("Failed to create patient");
  });
});
