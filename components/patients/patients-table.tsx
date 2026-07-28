"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateOfBirth } from "@/lib/format";
import type { PatientDto } from "@/lib/patients/types";

export function PatientsTable({
  patients,
  onEdit,
}: {
  patients: PatientDto[];
  onEdit: (patient: PatientDto) => void;
}) {
  if (patients.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No patients yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Date of Birth</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="w-0">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id}>
              <TableCell className="font-medium">
                {patient.lastName}, {patient.firstName}
              </TableCell>
              <TableCell>{formatDateOfBirth(patient.dateOfBirth)}</TableCell>
              <TableCell className="text-muted-foreground">{patient.email ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{patient.phone ?? "—"}</TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${patient.firstName} ${patient.lastName}`}
                    onClick={() => onEdit(patient)}
                  >
                    <Pencil />
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
