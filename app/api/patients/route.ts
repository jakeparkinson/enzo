import { NextResponse } from "next/server";
import { getPatients } from "@/lib/patients/get-patients";

/** GET /api/patients — lightweight list for pickers (e.g. the new-order form). */
export async function GET() {
  const patients = await getPatients();
  return NextResponse.json(patients);
}
