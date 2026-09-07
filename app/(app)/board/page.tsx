import Link from "next/link";
import { auth, isDispatcher } from "@/lib/auth";
import { getDashboard } from "@/lib/queries";
import { AppHeader } from "@/components/AppHeader";
import { KpiCard } from "@/components/KpiCard";
import { cityState, formatWindow, formatWeight } from "@/lib/format";
import { trailerLabel } from "@/lib/matching";

export default async function BoardPage() {
  const session = await auth();
  const canWrite = isDispatcher(session?.user.role);
  const { loads, kpis } = await getDashboard();

  return (
    <div>
      <AppHeader
        title="Dispatch board"
        subtitle="Objective assignment by HOS, deadhead, fuel, and pickup window."
        canWrite={canWrite}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Open loads"
          value={String(kpis.openLoads)}
          note={`${kpis.highPriority} high priority this morning.`}
        />
        <KpiCard
          label="Legal trucks now"
          value={String(kpis.legalNow)}
          note={`${kpis.hosBlocked} blocked by HOS`}
        />
        <KpiCard
          label="Avg deadhead"
          value={`${Math.round(kpis.avgDeadhead)} mi`}
          note="Nearest legal truck per open load."
        />
        <KpiCard
          label="Overrides"
          value={`${Math.round(kpis.overridePct)}%`}
          note={`${kpis.overPolicyCount} dispatchers above policy.`}
        />
      </section>

      <section className="card mt-5 p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Open loads</h2>
            <p className="text-sm text-ink-muted">Pick a load and review the ranked truck options.</p>
          </div>
          <span className="chip bg-teal-soft text-teal">Tomorrow planning</span>
        </div>
        <ul className="divide-y divide-line">
          {loads.map((load) => (
            <li key={load.id}>
              <Link
                href={`/loads/${load.id}`}
                className="flex flex-col gap-2 py-3 transition hover:bg-teal-mist sm:flex-row sm:items-center sm:justify-between -mx-2 px-2 rounded-xl"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">
                      {cityState(load.pickupCity, load.pickupState)} →{" "}
                      {cityState(load.deliveryCity, load.deliveryState)}
                    </p>
                    {load.priority === "HIGH" ? (
                      <span className="chip bg-peach text-peach-text">High priority</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {load.reference} · {load.customer} · {trailerLabel(load.trailerType)} ·{" "}
                    {formatWeight(load.weightLbs)}
                  </p>
                  <p className="text-xs text-ink-faint">Pickup {formatWindow(load.pickupWindowStart, load.pickupWindowEnd)}</p>
                </div>
                <span className="text-sm font-semibold text-teal">Rank trucks →</span>
              </Link>
            </li>
          ))}
          {loads.length === 0 ? (
            <li className="py-8 text-center text-sm text-ink-muted">
              No open loads. Add one to see ranked matches.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
