"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CreateOrderDialog } from "@/components/orders/create-order-dialog";
import { OrdersFilters } from "@/components/orders/orders-filters";
import { OrdersTable } from "@/components/orders/orders-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { OrderStatus } from "@/lib/generated/prisma/enums";
import {
  ORDER_SORT_FIELDS,
  type OrderListItemDto,
  type OrderSortField,
  type SortDirection,
} from "@/lib/orders/types";

const DEFAULT_SORT_BY: OrderSortField = "createdAt";
const DEFAULT_SORT_DIR: SortDirection = "desc";

function isOrderSortField(value: string | null): value is OrderSortField {
  return !!value && (ORDER_SORT_FIELDS as readonly string[]).includes(value);
}

function isOrderStatus(value: string | null): value is OrderStatus {
  return !!value && Object.values(OrderStatus).includes(value as OrderStatus);
}

export function OrdersDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const patientQueryParam = searchParams.get("patientQuery") ?? "";
  const status = isOrderStatus(searchParams.get("status"))
    ? (searchParams.get("status") as OrderStatus)
    : "ALL";
  const sortBy = isOrderSortField(searchParams.get("sortBy"))
    ? (searchParams.get("sortBy") as OrderSortField)
    : DEFAULT_SORT_BY;
  const sortDir: SortDirection =
    searchParams.get("sortDir") === "asc" ? "asc" : DEFAULT_SORT_DIR;

  // The search input needs its own local state so typing feels instant; the
  // value is debounced before it updates the URL (and triggers a re-fetch).
  const [patientQueryInput, setPatientQueryInput] = useState(patientQueryParam);
  const debouncedPatientQuery = useDebouncedValue(patientQueryInput, 300);

  const [orders, setOrders] = useState<OrderListItemDto[]>([]);
  const [resolvedQueryString, setResolvedQueryString] = useState<
    string | null
  >(null);
  // Bumped after a successful order creation to force a re-fetch without
  // touching the URL's filter/sort state.
  const [refreshToken, setRefreshToken] = useState(0);

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (debouncedPatientQuery !== patientQueryParam) {
      updateSearchParams({ patientQuery: debouncedPatientQuery || null });
    }
    // Only re-run when the debounced value settles, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPatientQuery]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (patientQueryParam) params.set("patientQuery", patientQueryParam);
    if (status !== "ALL") params.set("status", status);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    return params.toString();
  }, [patientQueryParam, status, sortBy, sortDir]);

  // isLoading is derived (not set synchronously in the effect below) to
  // avoid triggering React's "no setState directly in an effect" lint rule,
  // which flags synchronous setState calls at the top of an effect body as
  // a cascading-render risk.
  const isLoading = resolvedQueryString !== queryString;

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/orders?${queryString}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to load orders");
        }
        return res.json() as Promise<OrderListItemDto[]>;
      })
      .then((data) => setOrders(data))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error(
          error instanceof Error ? error.message : "Failed to load orders"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setResolvedQueryString(queryString);
      });

    return () => controller.abort();
  }, [queryString, refreshToken]);

  function handleSortChange(field: OrderSortField) {
    if (field === sortBy) {
      updateSearchParams({ sortDir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      updateSearchParams({ sortBy: field, sortDir: "asc" });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <OrdersFilters
          patientQuery={patientQueryInput}
          onPatientQueryChange={setPatientQueryInput}
          status={status}
          onStatusChange={(value) =>
            updateSearchParams({ status: value === "ALL" ? null : value })
          }
        />
        <CreateOrderDialog
          onOrderCreated={() => setRefreshToken((token) => token + 1)}
        />
      </div>
      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          Loading orders...
        </div>
      ) : (
        <OrdersTable
          orders={orders}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={handleSortChange}
        />
      )}
    </div>
  );
}
