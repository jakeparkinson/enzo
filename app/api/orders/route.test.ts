import { beforeEach, describe, expect, it, vi } from "vitest";

// `getOrders` and `createOrder` are covered by real-database integration
// tests in lib/orders/get-orders.test.ts and lib/orders/create-order.test.ts
// respectively. This suite is only about the route handlers' own job:
// validating the request and wiring it through, so both are mocked here to
// stay fast/DB-free. `OrderCreationError` is kept real (via importOriginal)
// so the route's `instanceof` check still behaves correctly.
const getOrdersMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/orders/get-orders", () => ({ getOrders: getOrdersMock }));

const createOrderMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/orders/create-order", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/orders/create-order")>();
  return { ...actual, createOrder: createOrderMock };
});

import { GET, POST } from "./route";
import { OrderCreationError } from "@/lib/orders/create-order";

function postRequest(body: unknown) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("GET /api/orders", () => {
  beforeEach(() => {
    getOrdersMock.mockReset();
    getOrdersMock.mockResolvedValue([]);
  });

  it("rejects an invalid status with a 400 and doesn't call getOrders", async () => {
    const response = await GET(new Request("http://localhost/api/orders?status=NOT_A_STATUS"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Invalid status/);
    expect(getOrdersMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid sortBy with a 400", async () => {
    const response = await GET(new Request("http://localhost/api/orders?sortBy=nonsense"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Invalid sortBy/);
    expect(getOrdersMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid sortDir with a 400", async () => {
    const response = await GET(new Request("http://localhost/api/orders?sortDir=sideways"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Invalid sortDir/);
    expect(getOrdersMock).not.toHaveBeenCalled();
  });

  it("forwards valid query params to getOrders", async () => {
    await GET(
      new Request(
        "http://localhost/api/orders?patientQuery=Alice&status=PENDING&sortBy=totalCost&sortDir=asc"
      )
    );

    expect(getOrdersMock).toHaveBeenCalledWith({
      patientQuery: "Alice",
      status: "PENDING",
      sortBy: "totalCost",
      sortDir: "asc",
    });
  });

  it("trims whitespace from patientQuery and omits it when blank", async () => {
    await GET(new Request("http://localhost/api/orders?patientQuery=%20%20"));

    expect(getOrdersMock).toHaveBeenCalledWith(
      expect.objectContaining({ patientQuery: undefined })
    );
  });

  it("passes undefined for every omitted param and returns getOrders' result as JSON", async () => {
    getOrdersMock.mockResolvedValue([{ id: "order_1" }]);

    const response = await GET(new Request("http://localhost/api/orders"));

    expect(getOrdersMock).toHaveBeenCalledWith({
      patientQuery: undefined,
      status: undefined,
      sortBy: undefined,
      sortDir: undefined,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "order_1" }]);
  });
});

describe("POST /api/orders", () => {
  beforeEach(() => {
    createOrderMock.mockReset();
  });

  it("rejects a malformed JSON body with a 400", async () => {
    const response = await POST(postRequest("{not valid json"));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/valid JSON/);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("rejects a non-object JSON body with a 400", async () => {
    const response = await POST(postRequest(["patientId", "testIds"]));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/JSON object/);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("rejects a missing patientId with a 400", async () => {
    const response = await POST(postRequest({ testIds: ["test_1"] }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/patientId is required/);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("rejects an empty testIds array with a 400", async () => {
    const response = await POST(postRequest({ patientId: "patient_1", testIds: [] }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/testIds must be a non-empty array/);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("rejects testIds containing non-string entries with a 400", async () => {
    const response = await POST(
      postRequest({ patientId: "patient_1", testIds: ["test_1", 42] })
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/testIds must be a non-empty array/);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("forwards a valid body to createOrder and returns the created order with a 201", async () => {
    createOrderMock.mockResolvedValue({ id: "order_1", totalCost: "10.00" });

    const response = await POST(
      postRequest({ patientId: "patient_1", testIds: ["test_1", "test_2"] })
    );

    expect(createOrderMock).toHaveBeenCalledWith({
      patientId: "patient_1",
      testIds: ["test_1", "test_2"],
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "order_1", totalCost: "10.00" });
  });

  it("maps an OrderCreationError to its own status code and message", async () => {
    createOrderMock.mockRejectedValue(
      new OrderCreationError('No patient found with id "patient_1"', 404)
    );

    const response = await POST(
      postRequest({ patientId: "patient_1", testIds: ["test_1"] })
    );

    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe('No patient found with id "patient_1"');
  });

  it("maps an unexpected error to a 500", async () => {
    createOrderMock.mockRejectedValue(new Error("connection lost"));

    const response = await POST(
      postRequest({ patientId: "patient_1", testIds: ["test_1"] })
    );

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("Failed to create order");
  });
});
