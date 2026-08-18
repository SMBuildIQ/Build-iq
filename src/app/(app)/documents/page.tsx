import { PlannedModule } from "@/components/PlannedModule";

export default function DocumentsPage() {
  return (
    <PlannedModule
      title="Document library"
      description="Central library of specs, quote PDFs, POs, and receiving documentation with per-field extraction traceability per brief §13."
      schemaNote="Backed by Document and QuoteExtractionField — see DATABASE_SCHEMA.md."
    />
  );
}
