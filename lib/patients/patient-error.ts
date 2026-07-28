/**
 * Thrown for expected, user-facing failures in patient mutations (currently
 * just "unknown id" on update) so the route handler can map them to the
 * right HTTP status instead of a generic 500. Mirrors `LabTestError` in
 * lib/lab-tests/lab-test-error.ts.
 */
export class PatientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PatientError";
    this.status = status;
  }
}
