import { auth, isDispatcher } from "@/lib/auth";
import { getAuditData } from "@/lib/queries";
import { AppHeader } from "@/components/AppHeader";
import { formatWhen } from "@/lib/format";

export default async function AuditPage() {
  const session = await auth();
  const canWrite = isDispatcher(session?.user.role);
  const { events, assignments, trucks, dispatchers, avgLoads } = await getAuditData();
  const overrides = assignments.filter((a) => a.isOverride);
  const topDrivers = trucks.slice(0, 5);
  const flagged = dispatchers.filter((d) => d.total > 0 && d.overrides / d.total > 0.1);

  return (
    <div>
      <AppHeader
        title="Fairness audit"
        subtitle="Expose patterns that look like dispatcher favorites or uneven work."
        canWrite={canWrite}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <article className="card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Driver load balance · Week to date</h2>
            <span className="chip bg-teal-soft text-teal">Visibility</span>
          </div>
          <p className="text-sm text-ink-muted">
            Fleet average is {avgLoads.toFixed(1)} loads. Highest volume this week:
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {topDrivers.map((t) => (
              <li key={t.id} className="flex justify-between gap-3">
                <span>
                  {t.driverName}{" "}
                  <span className="text-ink-faint">· Truck {t.unitNumber}</span>
                </span>
                <span className="font-semibold">{t.weeklyLoadCount} loads</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="card p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Policy flag</h2>
            <span className="chip bg-peach text-peach-text">Needs review</span>
          </div>
          {flagged.length > 0 ? (
            <p className="text-sm text-ink-muted">
              {flagged.length} dispatcher{flagged.length === 1 ? "" : "s"} {flagged.length === 1 ? "has" : "have"}{" "}
              override rates above 10%, which suggests favoritism or missing business rules.
            </p>
          ) : (
            <p className="text-sm text-ink-muted">No dispatcher is currently above the 10% override policy.</p>
          )}
          <ul className="mt-3 space-y-1 text-sm">
            {dispatchers.map((d) => (
              <li key={d.name} className="flex justify-between">
                <span>{d.name}</span>
                <span className="font-semibold">
                  {d.overrides}/{d.total} overrides ({d.total ? Math.round((d.overrides / d.total) * 100) : 0}%)
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <section className="card mt-4 p-5">
        <h2 className="font-semibold">Override log</h2>
        <p className="mb-3 text-sm text-ink-muted">
          Every assignment that skipped the top-ranked eligible truck requires a written reason.
        </p>
        <ul className="divide-y divide-line">
          {overrides.map((row) => (
            <li key={row.id} className="py-3 text-sm">
              <p className="font-semibold">
                {row.load.reference} → Truck {row.truck.unitNumber} ({row.truck.driverName})
              </p>
              <p className="text-ink-muted">
                {row.assignedBy.name} · {formatWhen(row.createdAt)} · score {row.score.toFixed(1)}
              </p>
              <p className="mt-1 italic text-ink">“{row.overrideReason}”</p>
            </li>
          ))}
          {overrides.length === 0 ? (
            <li className="py-6 text-sm text-ink-muted">No overrides yet.</li>
          ) : null}
        </ul>
      </section>

      <section className="card mt-4 p-5">
        <h2 className="font-semibold">Activity</h2>
        <ul className="mt-3 divide-y divide-line">
          {events.map((event) => (
            <li key={event.id} className="py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="chip bg-cream text-ink-muted">{event.kind.replace("_", " ")}</span>
                <span className="text-xs text-ink-faint">{formatWhen(event.createdAt)}</span>
              </div>
              <p className="mt-1 text-ink">{event.message}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
