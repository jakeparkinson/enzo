import { prisma } from "@/lib/prisma";
import { OrderStatus, Prisma } from "@/lib/generated/prisma/client";
import type { OrderSortField, SortDirection } from "@/lib/orders/types";

export type GetOrdersParams = {
  /** Case-insensitive search against the patient's first/last name. */
  patientQuery?: string;
  status?: OrderStatus;
  sortBy?: OrderSortField;
  sortDir?: SortDirection;
};

const DEFAULT_SORT_FIELD: OrderSortField = "createdAt";
const DEFAULT_SORT_DIR: SortDirection = "desc";

export async function getOrders(params: GetOrdersParams = {}) {
  const {
    patientQuery,
    status,
    sortBy = DEFAULT_SORT_FIELD,
    sortDir = DEFAULT_SORT_DIR,
  } = params;

  const where: Prisma.OrderWhereInput = {
    status,
    patient: patientQuery
      ? {
          OR: [
            { firstName: { contains: patientQuery, mode: "insensitive" } },
            { lastName: { contains: patientQuery, mode: "insensitive" } },
          ],
        }
      : undefined,
  };

  const orderBy = buildOrderBy(sortBy, sortDir);

  return prisma.order.findMany({
    where,
    orderBy,
    include: {
      patient: true,
      tests: { include: { labTest: true } },
    },
  });
}

function buildOrderBy(
  sortBy: OrderSortField,
  sortDir: SortDirection
): Prisma.OrderOrderByWithRelationInput | Prisma.OrderOrderByWithRelationInput[] {
  switch (sortBy) {
    case "patient":
      // Sort by last name first, first name as a tiebreaker — matches the
      // patient list's own `@@index([lastName, firstName])` and the "Last,
      // First" display format, so what's on screen visibly reads as sorted.
      return [
        { patient: { lastName: sortDir } },
        { patient: { firstName: sortDir } },
      ];
    case "status":
      return { status: sortDir };
    case "totalCost":
      return { totalCost: sortDir };
    case "readyDate":
      return { readyDate: sortDir };
    case "createdAt":
      return { createdAt: sortDir };
  }
}

export type OrderListItem = Awaited<ReturnType<typeof getOrders>>[number];
