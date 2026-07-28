import { NextResponse } from "next/server";
import { updatePatient } from "@/lib/patients/update-patient";
import { PatientError } from "@/lib/patients/patient-error";
import { parsePatientInput } from "@/lib/patients/parse-patient-input";

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/patients/[id] — edit a patient (full replace of name/DOB/contact info). */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const parsed = parsePatientInput(body);
  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const patient = await updatePatient(id, parsed.data);
    return NextResponse.json(patient);
  } catch (error) {
    if (error instanceof PatientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to update patient:", error);
    return NextResponse.json(
      { error: "Failed to update patient" },
      { status: 500 }
    );
  }
}
