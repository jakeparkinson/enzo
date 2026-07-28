"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  OrderListItemDto,
  OrderSortField,
  SortDirection,
} from "@/lib/orders/types";

const COLUMNS: { field: OrderSortField; label: string }[] = [
  { field: "patient", label: "Patient" },
  { field: "status", label: "Status" },
  { field: "createdAt", label: "Date" },
  { field: "totalCost", label: "Total Cost" },
  { field: "readyDate", label: "Est. Ready Date" },
];

export function OrdersTable({
  orders,
  sortBy,
  sortDir,
  onSortChange,
}: {
  orders: OrderListItemDto[];
  sortBy: OrderSortField;
  sortDir: SortDirection;
  onSortChange: (field: OrderSortField) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No orders match the current filters.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column.field}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => onSortChange(column.field)}
                >
                  {column.label}
                  <SortIcon active={sortBy === column.field} dir={sortDir} />
                </Button>
              </TableHead>
            ))}
            <TableHead>Tests</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                {order.patient.lastName}, {order.patient.firstName}
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell>{formatDate(order.createdAt)}</TableCell>
              <TableCell>{formatCurrency(order.totalCost)}</TableCell>
              <TableCell>{formatDate(order.readyDate)}</TableCell>
              <TableCell className="text-muted-foreground">
                {order.tests.map((t) => t.labTest.code).join(", ")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDirection }) {
  if (!active) {
    return <ArrowUpDown className="text-muted-foreground/50" />;
  }
  return dir === "asc" ? <ArrowUp /> : <ArrowDown />;
}
