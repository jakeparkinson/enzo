// Shared, framework-agnostic types for the orders list. Deliberately has no
// Prisma/server imports so it can be safely imported from Client Components
// (e.g. filter/sort controls) without pulling the database layer into the
// browser bundle. `OrderStatus` is imported from the generated `enums.ts`
// file specifically (not `client.ts`) because it's the one part of the
// generated client with no Node-only dependencies.
import type { OrderStatus } from "@/lib/generated/prisma/enums";

/** Shape of an order as returned (as JSON) by GET /api/orders. */
export type OrderListItemDto = {
  id: string;
  status: OrderStatus;
  totalCost: string;
  readyDate: string;
  createdAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  tests: {
    id: string;
    labTest: { code: string; name: string };
  }[];
};

export const ORDER_SORT_FIELDS = [
  "patient",
  "status",
  "createdAt",
  "totalCost",
  "readyDate",
] as const;

export type OrderSortField = (typeof ORDER_SORT_FIELDS)[number];

export type SortDirection = "asc" | "desc";
