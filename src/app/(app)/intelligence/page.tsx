import { PlannedModule } from "@/components/PlannedModule";

export default function IntelligencePage() {
  return (
    <PlannedModule
      title="Purchasing intelligence"
      description="Historical price benchmarking and natural-language queries over structured purchasing data ('What did we pay for Lenovo laptops last year?') per brief §25 & §30."
      schemaNote="Backed by PriceBenchmark and the full purchase history graph — see DATABASE_SCHEMA.md."
    />
  );
}
