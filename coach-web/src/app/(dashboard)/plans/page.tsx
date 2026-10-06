"use client";

import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Modal } from "@/components/feedback";
import { NewPlanForm } from "@/components/NewPlanForm";
import { Avatar, EmptyState, ErrorBox, Loading, PageHeader, Progress, StatusBadge, Tabs } from "@/components/ui";
import { formatDate, timeAgo, TRACK } from "@/lib/format";
import type { ClientRow } from "@/lib/types";
import { useApi } from "@/lib/useApi";

interface PlanRow {
  id: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  specialization: string;
  startDate: string;
  updatedAt: string;
  totalWeeks: number;
  client: { id: string; fullName: string };
  progress: { completed: number; total: number };
}

type Filter = "" | "ACTIVE" | "DRAFT" | "ARCHIVED";

function PlansContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<Filter>("");
  const plans = useApi<{ plans: PlanRow[] }>(`/coach/plans${status ? `?status=${status}` : ""}`);
  const clients = useApi<{ clients: ClientRow[] }>("/coach/clients");
  // The Dashboard's "Build plan" links here with ?new=<clientId>.
  const [creating, setCreating] = useState<string | null>(params.get("new"));
  const activeClients = (clients.data?.clients ?? []).filter((c) => c.subscription.status === "ACTIVE");
  const withoutPlan = activeClients.filter((c) => !c.activePlan);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <PageHeader
        title="Training plans"
        subtitle="Personal week-by-week plans for your 1-on-1 clients."
        actions={
          <button className="btn primary" onClick={() => setCreating("")}>
            <Plus size={16} /> New plan
          </button>
        }
      />

      {withoutPlan.length > 0 && (
        <div className="alert warn">
          <ClipboardList size={16} />
          <span style={{ flex: 1 }}>
            <strong>{withoutPlan.map((c) => c.client.fullName).join(", ")}</strong> {withoutPlan.length === 1 ? "is" : "are"} waiting for a plan.
          </span>
          <button className="btn sm" onClick={() => setCreating(withoutPlan[0]!.client.id)}>
            Build one now
          </button>
        </div>
      )}

      <Tabs<Filter>
        value={status}
        onChange={setStatus}
        options={[
          { value: "", label: "All" },
          { value: "ACTIVE", label: "Active" },
          { value: "DRAFT", label: "Drafts" },
          { value: "ARCHIVED", label: "Archived" },
        ]}
      />

      {plans.loading ? (
        <Loading />
      ) : plans.error ? (
        <ErrorBox message={plans.error} />
      ) : !plans.data?.plans.length ? (
        <div className="card">
          <EmptyState
            icon={ClipboardList}
            title={status ? "No plans with this status" : "No plans yet"}
            body="A plan is a set of weeks; each day lists the exercises, runs or swims you prescribe."
            action={
              <button className="btn primary sm" onClick={() => setCreating("")}>
                Create the first plan
              </button>
            }
          />
        </div>
      ) : (
        <div className="card flush" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Client</th>
                <th>Status</th>
                <th>Length</th>
                <th style={{ minWidth: 170 }}>Client progress</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {plans.data.plans.map((p) => {
                const pct = p.progress.total ? p.progress.completed / p.progress.total : 0;
                return (
                  <tr key={p.id} className="clickable" onClick={() => router.push(`/plans/${p.id}`)}>
                    <td>
                      <div className="strong">{p.title}</div>
                      <div className="muted small">
                        {TRACK[p.specialization]} · starts {formatDate(p.startDate)}
                      </div>
                    </td>
                    <td>
                      <Link href={`/clients/${p.client.id}`} onClick={(e) => e.stopPropagation()} className="row" style={{ flexWrap: "nowrap" }}>
                        <Avatar name={p.client.fullName} size={30} />
                        {p.client.fullName}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>
                      {p.totalWeeks} week{p.totalWeeks === 1 ? "" : "s"}
                      <div className="muted small">{p.progress.total} items</div>
                    </td>
                    <td>
                      <Progress value={pct} />
                      <div className="muted small" style={{ marginTop: 4 }}>
                        {p.progress.completed}/{p.progress.total} done · {Math.round(pct * 100)}%
                      </div>
                    </td>
                    <td className="muted small">{timeAgo(p.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={creating !== null} onClose={() => setCreating(null)} title="New training plan">
        {!clients.data ? (
          <Loading />
        ) : !activeClients.length ? (
          <EmptyState icon={ClipboardList} title="No active clients yet" body="Claim a new client on the Dashboard first, then build their plan here." />
        ) : (
          <NewPlanForm
            clients={activeClients.map((c) => ({ id: c.client.id, fullName: c.client.fullName, specialization: c.subscription.specialization, goals: c.client.goals }))}
            initialClientId={creating || withoutPlan[0]?.client.id}
            onCancel={() => setCreating(null)}
          />
        )}
      </Modal>
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PlansContent />
    </Suspense>
  );
}
