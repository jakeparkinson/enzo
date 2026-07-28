import { NextResponse } from "next/server";
import { getLabTests } from "@/lib/lab-tests/get-lab-tests";
import { createLabTest } from "@/lib/lab-tests/create-lab-test";
import { LabTestError } from "@/lib/lab-tests/lab-test-error";
import { parseLabTestInput } from "@/lib/lab-tests/parse-lab-test-input";

/** GET /api/lab-tests — the test catalog, for pickers (e.g. the new-order form) and the catalog management page. */
export async function GET() {
  const labTests = await getLabTests();
  return NextResponse.json(labTests);
}

/** POST /api/lab-tests — add a new test to the catalog. */
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

  const parsed = parseLabTestInput(body);
  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const labTest = await createLabTest(parsed.data);
    return NextResponse.json(labTest, { status: 201 });
  } catch (error) {
    if (error instanceof LabTestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to create lab test:", error);
    return NextResponse.json(
      { error: "Failed to create lab test" },
      { status: 500 }
    );
  }
}
