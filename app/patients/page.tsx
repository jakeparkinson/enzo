import { PatientsDashboard } from "@/components/patients/patients-dashboard";

export default function PatientsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
        <p className="text-sm text-muted-foreground">
          Add new patients and keep their name, date of birth, and contact
          info up to date.
        </p>
      </div>
      <PatientsDashboard />
    </div>
  );
}
