"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useMe } from "@/hooks/useMe";

type Agent = {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  status: string;
  dependsOn?: string[];
  optional?: boolean;
};

type Workflow = {
  id: string;
  name: string;
  description: string;
  agentIds: string[];
};

type RunStepSummary = { agentId: string; agentName: string; status: string };

type RunRow = {
  id: string;
  workflowId: string;
  status: string;
  progress: number;
  projectId: string | null;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  steps: RunStepSummary[];
};

type RunDetailStep = {
  id: string;
  agentId: string;
  agentName: string;
  status: string;
  message: string | null;
  progress: number;
  error: string | null;
  sortOrder: number;
};

export default function AgentsOrchestrationClient() {
  const search = useSearchParams();
  const highlightRun = search.get("run");
  const { user } = useMe();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [selected, setSelected] = useState<string | null>(highlightRun);
  const [runDetail, setRunDetail] = useState<{
    run: {
      id: string;
      workflowId: string;
      status: string;
      progress: number;
      projectId: string | null;
      startedAt: string;
      finishedAt: string | null;
      error: string | null;
      steps: RunDetailStep[];
    };
  } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/orchestration");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load orchestration");
      return;
    }
    setAgents(data.agents || []);
    setWorkflows(data.workflows || []);
    setRuns(data.runs || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (highlightRun) setSelected(highlightRun);
  }, [highlightRun]);

  useEffect(() => {
    if (!selected) {
      setRunDetail(null);
      return;
    }
    fetch(`/api/orchestration/runs/${selected}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.run) setRunDetail(d);
        else setRunDetail(null);
      })
      .catch(() => setRunDetail(null));
  }, [selected]);

  return (
    <AppShell user={user || { name: "You" }}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--copper-deep)]">
          Platform
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-[var(--ink)]">
          AI Agent Orchestration
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sage)]">
          Multi-agent workflows with persisted runs and steps. Start from a project: upload plans →
          Run AI bots. Active agents execute; planned agents stay inactive until their module ships.
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}

      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold">Workflows</h2>
        <ul className="mt-3 space-y-3">
          {workflows.map((w) => (
            <li key={w.id} className="border border-[var(--line)] bg-white px-4 py-3">
              <p className="font-medium text-[var(--ink)]">{w.name}</p>
              <p className="text-sm text-[var(--sage)]">{w.description}</p>
              <p className="mt-2 text-xs text-[var(--sage)]">Agents: {w.agentIds.join(" → ")}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold">Agent registry</h2>
        <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {agents.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium text-[var(--ink)]">{a.name}</p>
                <p className="text-[var(--sage)]">{a.role}</p>
                <p className="mt-1 text-xs text-[var(--sage)]">
                  {a.capabilities.join(" · ")}
                  {a.dependsOn?.length ? ` · depends on ${a.dependsOn.join(", ")}` : ""}
                  {a.optional ? " · optional" : ""}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-semibold uppercase tracking-wide ${
                  a.status === "active" ? "text-[var(--copper-deep)]" : "text-[var(--sage)]"
                }`}
              >
                {a.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Recent runs</h2>
          <button
            type="button"
            onClick={load}
            className="text-sm text-[var(--copper-deep)] hover:underline"
          >
            Refresh
          </button>
        </div>
        {runs.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--sage)]">
            No runs yet. Open a{" "}
            <Link href="/dashboard" className="text-[var(--copper-deep)] underline">
              job
            </Link>
            , upload plans, and run AI bots — orchestration will record the run here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {runs.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelected(r.id)}
                  className={`flex w-full items-start justify-between gap-3 py-3 text-left text-sm ${
                    selected === r.id ? "bg-[var(--mist)]/40" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium text-[var(--ink)]">
                      {r.workflowId} · {r.id.slice(0, 8)}
                    </p>
                    <p className="text-[var(--sage)]">
                      {new Date(r.startedAt).toLocaleString()}
                      {r.projectId ? (
                        <>
                          {" · "}
                          <Link
                            href={`/projects/${r.projectId}`}
                            className="text-[var(--copper-deep)] underline-offset-2 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Project
                          </Link>
                        </>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-[var(--sage)]">
                      {r.steps.map((s) => `${s.agentName}:${s.status}`).join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
                    {r.status} {r.progress}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {runDetail?.run && (
          <div className="mt-6 border border-[var(--line)] bg-white p-4">
            <h3 className="font-display text-lg font-semibold">Run detail</h3>
            <p className="mt-1 text-sm text-[var(--sage)]">
              {runDetail.run.id} · {runDetail.run.status}
              {runDetail.run.error ? ` · ${runDetail.run.error}` : ""}
            </p>
            <ol className="mt-4 space-y-2 text-sm">
              {runDetail.run.steps.map((s) => (
                <li key={s.id} className="border-b border-[var(--line)] pb-2">
                  <p className="font-medium text-[var(--ink)]">
                    {s.sortOrder + 1}. {s.agentName}{" "}
                    <span className="font-normal text-[var(--sage)]">({s.status})</span>
                  </p>
                  {s.message && <p className="text-[var(--sage)]">{s.message}</p>}
                  {s.error && <p className="text-red-700">{s.error}</p>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </AppShell>
  );
}
