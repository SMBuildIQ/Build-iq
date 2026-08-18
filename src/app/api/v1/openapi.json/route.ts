import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/openapi";

// Public — an API contract document, not tenant data. Paste this URL into
// Swagger Editor / Postman / any OpenAPI-compatible tool, or view the
// rendered version at /api-docs.
export async function GET() {
  return NextResponse.json(openApiSpec);
}
