// Honest "not built yet" state. Per this project's own rule: never present a
// mocked workflow or a fake "Save" button as completed functionality. The
// data model for every module below already exists in prisma/schema.prisma —
// see DATABASE_SCHEMA.md — only the UI/API surface is pending.
export function PlannedModule({ title, description, schemaNote }: { title: string; description: string; schemaNote: string }) {
  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
      <div className="mb-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Planned
      </div>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <p className="mb-3 text-sm text-gray-600">{description}</p>
      <p className="text-xs text-gray-400">{schemaNote}</p>
    </div>
  );
}
