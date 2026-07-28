/**
 * Thrown for expected, user-facing failures in lab test catalog mutations
 * (duplicate code, unknown id, deleting a test still referenced by orders)
 * so the route handlers can map them to the right HTTP status instead of a
 * generic 500. Mirrors `OrderCreationError` in `lib/orders/create-order.ts`.
 */
export class LabTestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LabTestError";
    this.status = status;
  }
}
