"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OrderStatus } from "@/lib/generated/prisma/enums";

const STATUS_OPTIONS: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function OrdersFilters({
  patientQuery,
  onPatientQueryChange,
  status,
  onStatusChange,
}: {
  patientQuery: string;
  onPatientQueryChange: (value: string) => void;
  status: OrderStatus | "ALL";
  onStatusChange: (value: OrderStatus | "ALL") => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Input
        placeholder="Search by patient name..."
        value={patientQuery}
        onChange={(e) => onPatientQueryChange(e.target.value)}
        className="sm:max-w-xs"
        aria-label="Search orders by patient name"
      />
      <Select
        value={status}
        onValueChange={(value) => onStatusChange(value as OrderStatus | "ALL")}
      >
        <SelectTrigger className="sm:w-48" aria-label="Filter by status">
          <SelectValue>
            {(value: OrderStatus | "ALL") =>
              STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
