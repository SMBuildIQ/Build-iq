import { openApiSpec } from "@/lib/openapi";

const METHOD_COLORS: Record<string, string> = {
  get: "bg-blue-100 text-blue-800",
  post: "bg-green-100 text-green-800",
  patch: "bg-amber-100 text-amber-800",
  delete: "bg-red-100 text-red-800",
};

export default function ApiDocsPage() {
  const byTag = new Map<string, { method: string; path: string; summary: string; security: unknown }[]>();

  for (const [path, methods] of Object.entries(openApiSpec.paths)) {
    for (const [method, op] of Object.entries(methods as Record<string, { tags?: string[]; summary?: string; security?: unknown[] }>)) {
      for (const tag of op.tags ?? ["Other"]) {
        if (!byTag.has(tag)) byTag.set(tag, []);
        byTag.get(tag)!.push({ method, path, summary: op.summary ?? "", security: op.security });
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-xl font-semibold">{openApiSpec.info.title}</h1>
      <p className="mb-1 text-sm text-gray-500">{openApiSpec.info.description}</p>
      <a href="/api/v1/openapi.json" className="mb-8 inline-block text-sm text-gray-900 underline">
        Full OpenAPI 3.0 spec (JSON) — paste into Swagger Editor or Postman
      </a>

      {[...byTag.entries()].map(([tag, ops]) => (
        <div key={tag} className="mb-8">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">{tag}</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {ops.map((op, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-2 text-sm ${i > 0 ? "border-t border-gray-100" : ""}`}>
                <span className={`w-16 shrink-0 rounded px-2 py-0.5 text-center text-xs font-medium uppercase ${METHOD_COLORS[op.method] ?? "bg-gray-100"}`}>
                  {op.method}
                </span>
                <code className="shrink-0 text-xs text-gray-500">{op.path}</code>
                <span className="text-gray-700">{op.summary}</span>
                {Array.isArray(op.security) && op.security.length === 0 && (
                  <span className="ml-auto shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">public</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
