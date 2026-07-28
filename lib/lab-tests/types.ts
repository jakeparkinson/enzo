// Framework-agnostic type for the lab test picker on the create-order form.
export type LabTestOptionDto = {
  id: string;
  code: string;
  name: string;
  price: string;
  turnaroundDays: number;
};

// Shape of a catalog entry as returned by the lab test CRUD endpoints
// (GET/POST /api/lab-tests, PATCH /api/lab-tests/[id]). Identical fields to
// `LabTestOptionDto` today, but kept as its own type since the two DTOs
// serve different call sites (order-form picker vs. catalog management) and
// may reasonably diverge later.
export type LabTestDto = {
  id: string;
  code: string;
  name: string;
  price: string;
  turnaroundDays: number;
};
