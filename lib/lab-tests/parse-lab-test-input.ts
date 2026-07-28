// Shared request-body validation for creating/updating a catalog entry.
// Both POST /api/lab-tests and PATCH /api/lab-tests/[id] send the full set
// of fields (no partial updates — see README for why), so they can share
// this one parser instead of duplicating the same checks in two routes.
export type LabTestInput = {
  code: string;
  name: string;
  price: string;
  turnaroundDays: number;
};

export type ParseLabTestInputResult =
  | { data: LabTestInput; error?: undefined }
  | { data?: undefined; error: string };

export function parseLabTestInput(body: unknown): ParseLabTestInputResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const { code, name, price, turnaroundDays } = body as Record<string, unknown>;

  if (typeof code !== "string" || code.trim() === "") {
    return { error: "code is required" };
  }

  if (typeof name !== "string" || name.trim() === "") {
    return { error: "name is required" };
  }

  if (
    (typeof price !== "string" && typeof price !== "number") ||
    !Number.isFinite(Number(price)) ||
    Number(price) <= 0
  ) {
    return { error: "price must be a positive number" };
  }

  if (
    typeof turnaroundDays !== "number" ||
    !Number.isInteger(turnaroundDays) ||
    turnaroundDays <= 0
  ) {
    return { error: "turnaroundDays must be a positive integer" };
  }

  return {
    data: {
      // Test codes are short mnemonic identifiers (e.g. "CBC") — normalizing
      // case/whitespace avoids "cbc" and "CBC" silently coexisting as
      // distinct catalog entries.
      code: code.trim().toUpperCase(),
      name: name.trim(),
      price: String(price),
      turnaroundDays,
    },
  };
}
