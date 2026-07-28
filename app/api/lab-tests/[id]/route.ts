import { NextResponse } from "next/server";
import { updateLabTest } from "@/lib/lab-tests/update-lab-test";
import { deleteLabTest } from "@/lib/lab-tests/delete-lab-test";
import { LabTestError } from "@/lib/lab-tests/lab-test-error";
import { parseLabTestInput } from "@/lib/lab-tests/parse-lab-test-input";

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/lab-tests/[id] — edit a catalog entry (full replace of code/name/price/turnaroundDays). */
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

  const parsed = parseLabTestInput(body);
  if (!parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const labTest = await updateLabTest(id, parsed.data);
    return NextResponse.json(labTest);
  } catch (error) {
    if (error instanceof LabTestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to update lab test:", error);
    return NextResponse.json(
      { error: "Failed to update lab test" },
      { status: 500 }
    );
  }
}

/** DELETE /api/lab-tests/[id] — remove a catalog entry (rejected if used by an existing order). */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    await deleteLabTest(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof LabTestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to delete lab test:", error);
    return NextResponse.json(
      { error: "Failed to delete lab test" },
      { status: 500 }
    );
  }
}
