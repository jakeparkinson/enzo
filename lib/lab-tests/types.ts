// Framework-agnostic type for the lab test picker on the create-order form.
export type LabTestOptionDto = {
  id: string;
  code: string;
  name: string;
  price: string;
  turnaroundDays: number;
};
