"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { LabTestDto } from "@/lib/lab-tests/types";

export function LabTestsTable({
  labTests,
  onEdit,
  onDelete,
}: {
  labTests: LabTestDto[];
  onEdit: (labTest: LabTestDto) => void;
  onDelete: (labTest: LabTestDto) => void;
}) {
  if (labTests.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No tests in the catalog yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Turnaround</TableHead>
            <TableHead className="w-0">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {labTests.map((labTest) => (
            <TableRow key={labTest.id}>
              <TableCell className="font-medium">{labTest.code}</TableCell>
              <TableCell>{labTest.name}</TableCell>
              <TableCell>{formatCurrency(labTest.price)}</TableCell>
              <TableCell>
                {labTest.turnaroundDays} {labTest.turnaroundDays === 1 ? "day" : "days"}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${labTest.code}`}
                    onClick={() => onEdit(labTest)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${labTest.code}`}
                    onClick={() => onDelete(labTest)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
