import { NextResponse } from "next/server";
import { OrderStatus } from "@/lib/generated/prisma/client";
import { getOrders } from "@/lib/orders/get-orders";
import { createOrder, OrderCreationError } from "@/lib/orders/create-order";
import {
  ORDER_SORT_FIELDS,
  type OrderSortField,
  type SortDirection,
} from "@/lib/orders/types";

const ORDER_STATUS_VALUES = Object.values(OrderStatus);

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;

  const patientQuery = searchParams.get("patientQuery")?.trim() || undefined;

  const statusParam = searchParams.get("status");
  if (statusParam && !isOrderStatus(statusParam)) {
    return NextResponse.json(
      {
        error: `Invalid status "${statusParam}". Must be one of: ${ORDER_STATUS_VALUES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const sortByParam = searchParams.get("sortBy");
  if (sortByParam && !isOrderSortField(sortByParam)) {
    return NextResponse.json(
      {
        error: `Invalid sortBy "${sortByParam}". Must be one of: ${ORDER_SORT_FIELDS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const sortDirParam = searchParams.get("sortDir");
  if (sortDirParam && !isSortDirection(sortDirParam)) {
    return NextResponse.json(
      { error: `Invalid sortDir "${sortDirParam}". Must be "asc" or "desc"` },
      { status: 400 }
    );
  }

  const orders = await getOrders({
    patientQuery,
    status: statusParam ? (statusParam as OrderStatus) : undefined,
    sortBy: sortByParam ? (sortByParam as OrderSortField) : undefined,
    sortDir: sortDirParam ? (sortDirParam as SortDirection) : undefined,
  });

  return NextResponse.json(orders);
}

/** POST /api/orders — create an order for a patient with one or more tests. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const { patientId, testIds } = body as Record<string, unknown>;

  if (typeof patientId !== "string" || patientId.trim() === "") {
    return NextResponse.json(
      { error: "patientId is required" },
      { status: 400 }
    );
  }

  if (
    !Array.isArray(testIds) ||
    testIds.length === 0 ||
    !testIds.every((id) => typeof id === "string" && id.trim() !== "")
  ) {
    return NextResponse.json(
      { error: "testIds must be a non-empty array of test ids" },
      { status: 400 }
    );
  }

  try {
    const order = await createOrder({ patientId, testIds });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof OrderCreationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to create order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUS_VALUES as string[]).includes(value);
}

function isOrderSortField(value: string): value is OrderSortField {
  return (ORDER_SORT_FIELDS as readonly string[]).includes(value);
}

function isSortDirection(value: string): value is SortDirection {
  return value === "asc" || value === "desc";
}
