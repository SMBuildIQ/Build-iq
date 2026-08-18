import { NewPurchaseForm } from "./new-purchase-form";

export default function NewPurchasePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold">Describe what you need</h1>
      <p className="mb-6 text-sm text-gray-500">
        Write it like you&apos;d tell a colleague. BuildIQ extracts quantity, specs, budget, delivery date and
        location, then asks about anything critical it can&apos;t find.
      </p>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <NewPurchaseForm />
      </div>
    </div>
  );
}
