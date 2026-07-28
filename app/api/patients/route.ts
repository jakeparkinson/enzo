import { NextResponse } from "next/server";
import { getPatients } from "@/lib/patients/get-patients";
import { createPatient } from "@/lib/patients/create-patient";
import { parsePatientInput } from "@/lib/patients/parse-patient-input";

/** GET /api/patients — the patient list, for pickers (e.g. the new-order form) and the patient management page. */
export async function GET() {
  const patients = await getPatients();
  return NextResponse.json(patients);
}

/** POST /api/patients — register a new patient. */
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

  const parsed = parsePatientInput(body);
  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const patient = await createPatient(parsed.data);
    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error("Failed to create patient:", error);
    return NextResponse.json(
      { error: "Failed to create patient" },
      { status: 500 }
    );
  }
}
