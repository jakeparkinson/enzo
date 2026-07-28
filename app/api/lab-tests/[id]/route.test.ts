import { beforeEach, describe, expect, it, vi } from "vitest";

// Real query/mutation correctness is covered by the integration tests in
// lib/lab-tests/*.test.ts; this suite is only about the route handlers'
// own job: request validation and delegation.
const updateLabTestMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/lab-tests/update-lab-test", () => ({ updateLabTest: updateLabTestMock }));

const deleteLabTestMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/lab-tests/delete-lab-test", () => ({ deleteLabTest: deleteLabTestMock }));

import { PATCH, DELETE } from "./route";
import { LabTestError } from "@/lib/lab-tests/lab-test-error";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/lab-tests/test_1", {
    method: "PATCH",
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

describe("PATCH /api/lab-tests/[id]", () => {
  beforeEach(() => {
    updateLabTestMock.mockReset();
  });

  it("rejects a malformed JSON body with a 400", async () => {
    const response = await PATCH(patchRequest("{not valid json"), context("test_1"));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/valid JSON/);
    expect(updateLabTestMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid body with a 400 and doesn't call updateLabTest", async () => {
    const response = await PATCH(
      patchRequest({ ...validBody, turnaroundDays: 0 }),
      context("test_1")
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/turnaroundDays must be a positive integer/);
    expect(updateLabTestMock).not.toHaveBeenCalled();
  });

  it("forwards the id and normalized body to updateLabTest", async () => {
    updateLabTestMock.mockResolvedValue({ id: "test_1", code: "CBC" });

    const response = await PATCH(patchRequest(validBody), context("test_1"));

    expect(updateLabTestMock).toHaveBeenCalledWith("test_1", {
      code: "CBC",
      name: "Complete Blood Count",
      price: "24.99",
      turnaroundDays: 1,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "test_1", code: "CBC" });
  });

  it("maps a LabTestError to its own status code and message", async () => {
    updateLabTestMock.mockRejectedValue(
      new LabTestError('No lab test found with id "test_1"', 404)
    );

    const response = await PATCH(patchRequest(validBody), context("test_1"));

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe('No lab test found with id "test_1"');
  });

  it("maps an unexpected error to a 500", async () => {
    updateLabTestMock.mockRejectedValue(new Error("connection lost"));

    const response = await PATCH(patchRequest(validBody), context("test_1"));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("Failed to update lab test");
  });
});

describe("DELETE /api/lab-tests/[id]", () => {
  beforeEach(() => {
    deleteLabTestMock.mockReset();
  });

  it("calls deleteLabTest with the id and returns a 204", async () => {
    deleteLabTestMock.mockResolvedValue(undefined);

    const response = await DELETE(new Request("http://localhost/api/lab-tests/test_1"), context("test_1"));

    expect(deleteLabTestMock).toHaveBeenCalledWith("test_1");
    expect(response.status).toBe(204);
  });

  it("maps a LabTestError to its own status code and message", async () => {
    deleteLabTestMock.mockRejectedValue(
      new LabTestError("This test cannot be deleted because it is used by one or more existing orders", 409)
    );

    const response = await DELETE(new Request("http://localhost/api/lab-tests/test_1"), context("test_1"));

    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe(
      "This test cannot be deleted because it is used by one or more existing orders"
    );
  });

  it("maps an unexpected error to a 500", async () => {
    deleteLabTestMock.mockRejectedValue(new Error("connection lost"));

    const response = await DELETE(new Request("http://localhost/api/lab-tests/test_1"), context("test_1"));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("Failed to delete lab test");
  });
});
