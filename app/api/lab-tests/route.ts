import { NextResponse } from "next/server";
import { getLabTests } from "@/lib/lab-tests/get-lab-tests";

/** GET /api/lab-tests — the test catalog, for pickers (e.g. the new-order form). */
export async function GET() {
  const labTests = await getLabTests();
  return NextResponse.json(labTests);
}
