import { Suspense } from "react";
import { OrdersDashboard } from "@/components/orders/orders-dashboard";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">
          All lab orders across patients. Filter by patient or status, and
          sort any column.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Loading orders...
          </div>
        }
      >
        <OrdersDashboard />
      </Suspense>
    </div>
  );
}
