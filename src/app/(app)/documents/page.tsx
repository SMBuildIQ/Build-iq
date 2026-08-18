import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

const ENTITY_LINK: Record<string, (id: string) => string> = {
  purchase_request: (id) => `/purchases/${id}`,
  rfq: (id) => `/rfqs/${id}`,
  purchase_order: (id) => `/orders/${id}`,
};

export default async function DocumentsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const documents = await prisma.document.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-xl font-semibold">Documents</h1>
      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No documents uploaded yet. Attach files from a purchase request, RFQ, or purchase order.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">File</th>
                <th className="px-4 py-2">Attached to</th>
                <th className="px-4 py-2">Size</th>
                <th className="px-4 py-2">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const link = ENTITY_LINK[doc.entityType]?.(doc.entityId);
                return (
                  <tr key={doc.id} className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      <a href={`/api/v1/documents/${doc.id}/file`} className="text-gray-900 underline" target="_blank" rel="noreferrer">
                        {doc.filename}
                      </a>
                    </td>
                    <td className="px-4 py-2">
                      {link ? (
                        <a href={link} className="text-gray-600 underline">
                          {doc.entityType.replace(/_/g, " ")}
                        </a>
                      ) : (
                        doc.entityType.replace(/_/g, " ")
                      )}
                    </td>
                    <td className="px-4 py-2">{(doc.sizeBytes / 1024).toFixed(0)} KB</td>
                    <td className="px-4 py-2">{new Date(doc.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
