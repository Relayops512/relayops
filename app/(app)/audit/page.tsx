import Link from "next/link";
import { auth, isDispatcher } from "@/lib/auth";
import { getAuditData } from "@/lib/queries";
import { AppHeader } from "@/components/AppHeader";
import { formatWhen } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";

export default async function AuditPage() {
  const session = await auth();
  const canWrite = isDispatcher(session?.user.role);
  const { events, assignments, trucks, dispatchers, avgLoads, settings } = await getAuditData();
  const overrides = assignments.filter((a) => a.isOverride);
  const topDrivers = trucks.slice(0, 5);
  const flagged = dispatchers.filter((d) => d.total > 0 && d.overrides / d.total > 0.1);

  return (
    <div>
      <AppHeader
        title="Fairness tools"
        subtitle="Optional balance views. Turn these off anytime in Setup → Advanced."
        demo={settings.fleetIsDemo}
      />

      {!settings.fairnessToolsEnabled ? (
        <section className="card">
          <EmptyState
            title="Fairness tools are off"
            body="Today stays focused on covering loads. Turn this on in Setup if you want override rates and weekly balance."
            action={
              <Link href="/setup" className="btn-primary">
                Open Setup
              </Link>
            }
          />
        </section>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="card p-6">
              <h2 className="font-semibold">Weekly balance</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Fleet average is {avgLoads.toFixed(1)} loads. Highest this week:
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {topDrivers.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3">
                    <span>
                      {t.driverName}{" "}
                      <span className="text-ink-faint">· Truck {t.unitNumber}</span>
                    </span>
                    <span className="font-semibold">{t.weeklyLoadCount}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="card p-6">
              <h2 className="font-semibold">Override rate</h2>
              {flagged.length > 0 ? (
                <p className="mt-2 text-sm text-ink-muted">
                  {flagged.length} dispatcher{flagged.length === 1 ? "" : "s"} above 10%.
                </p>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">No dispatcher is above 10%.</p>
              )}
              <ul className="mt-4 space-y-1 text-sm">
                {dispatchers.map((d) => (
                  <li key={d.name} className="flex justify-between">
                    <span>{d.name}</span>
                    <span className="font-semibold">
                      {d.total ? Math.round((d.overrides / d.total) * 100) : 0}%
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <section className="card mt-4 p-6">
            <h2 className="font-semibold">Notes on other trucks</h2>
            <p className="mb-3 mt-1 text-sm text-ink-muted">
              Assignments that didn&apos;t use the top-ranked truck, with the short note.
            </p>
            <ul className="divide-y divide-line">
              {overrides.map((row) => (
                <li key={row.id} className="py-4 text-sm">
                  <p className="font-semibold">
                    {row.load.reference} → Truck {row.truck.unitNumber} ({row.truck.driverName})
                  </p>
                  <p className="text-ink-muted">
                    {row.assignedBy.name} · {formatWhen(row.createdAt)}
                  </p>
                  {row.overrideReason ? (
                    <p className="mt-1 text-ink">&ldquo;{row.overrideReason}&rdquo;</p>
                  ) : null}
                </li>
              ))}
              {overrides.length === 0 ? (
                <li className="py-8 text-sm text-ink-muted">No notes yet.</li>
              ) : null}
            </ul>
          </section>

          <section className="card mt-4 p-6">
            <h2 className="font-semibold">Activity</h2>
            <ul className="mt-3 divide-y divide-line">
              {events.map((event) => (
                <li key={event.id} className="py-4 text-sm">
                  <p className="text-xs text-ink-faint">{formatWhen(event.createdAt)}</p>
                  <p className="mt-1 text-ink">{event.message}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {canWrite ? null : <p className="mt-6 text-sm text-ink-muted">Viewer account.</p>}
    </div>
  );
}
