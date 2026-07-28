import { beforeEach, describe, expect, it, vi } from "vitest";

// Real query/creation correctness is covered by the integration tests in
// lib/lab-tests/*.test.ts; this suite is only about the route handlers'
// own job: request validation and delegation, so both are mocked to stay
// fast/DB-free (mirrors app/api/orders/route.test.ts).
const getLabTestsMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/lab-tests/get-lab-tests", () => ({ getLabTests: getLabTestsMock }));

const createLabTestMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/lab-tests/create-lab-test", () => ({ createLabTest: createLabTestMock }));

import { GET, POST } from "./route";
import { LabTestError } from "@/lib/lab-tests/lab-test-error";

function postRequest(body: unknown) {
  return new Request("http://localhost/api/lab-tests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validBody = {
  code: "cbc",
  name: "Complete Blood Count",
  price: "24.99",
  turnaroundDays: 1,
};

describe("GET /api/lab-tests", () => {
  it("returns getLabTests' result as JSON", async () => {
    getLabTestsMock.mockResolvedValue([{ id: "test_1" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "test_1" }]);
  });
});

describe("POST /api/lab-tests", () => {
  beforeEach(() => {
    createLabTestMock.mockReset();
  });

  it("rejects a malformed JSON body with a 400", async () => {
    const response = await POST(postRequest("{not valid json"));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/valid JSON/);
    expect(createLabTestMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid body with a 400 and doesn't call createLabTest", async () => {
    const response = await POST(postRequest({ ...validBody, code: "" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/code is required/);
    expect(createLabTestMock).not.toHaveBeenCalled();
  });

  it("forwards a normalized, valid body to createLabTest and returns 201", async () => {
    createLabTestMock.mockResolvedValue({ id: "test_1", code: "CBC" });

    const response = await POST(postRequest(validBody));

    expect(createLabTestMock).toHaveBeenCalledWith({
      code: "CBC",
      name: "Complete Blood Count",
      price: "24.99",
      turnaroundDays: 1,
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "test_1", code: "CBC" });
  });

  it("maps a LabTestError to its own status code and message", async () => {
    createLabTestMock.mockRejectedValue(
      new LabTestError('A lab test with code "CBC" already exists', 409)
    );

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe('A lab test with code "CBC" already exists');
  });

  it("maps an unexpected error to a 500", async () => {
    createLabTestMock.mockRejectedValue(new Error("connection lost"));

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("Failed to create lab test");
  });
});
