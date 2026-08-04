"use client";

import { Suspense } from "react";
import AgentsOrchestrationClient from "./AgentsOrchestrationClient";

export default function AgentsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-[var(--sage)]">
          Loading agent orchestration…
        </div>
      }
    >
      <AgentsOrchestrationClient />
    </Suspense>
  );
}
