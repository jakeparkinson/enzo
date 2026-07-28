import { LabTestsDashboard } from "@/components/lab-tests/lab-tests-dashboard";

export default function LabTestsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lab Test Catalog</h1>
        <p className="text-sm text-muted-foreground">
          Manage the tests patients can be ordered. Editing a test only
          affects future orders — past orders keep the price and turnaround
          they were placed with.
        </p>
      </div>
      <LabTestsDashboard />
    </div>
  );
}
