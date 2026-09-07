import { auth, isDispatcher } from "@/lib/auth";
import { store } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { formatMinutes } from "@/lib/geo";
import { trailerLabel } from "@/lib/matching";

const FILTERS = [
  { key: "available", label: "Available" },
  { key: "blocked", label: "Not available" },
  { key: "all", label: "All" },
] as const;

function readinessLabel(value: string) {
  switch (value) {
    case "LEGAL_NOW":
      return { text: "Legal now", className: "bg-sage text-sage-text" };
    case "HOS_BLOCKED":
      return { text: "HOS blocked", className: "bg-peach text-peach-text" };
    case "ON_LOAD":
      return { text: "On load", className: "bg-teal-soft text-teal" };
    default:
      return { text: "Maintenance", className: "bg-red-100 text-red-800" };
  }
}

export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  const canWrite = isDispatcher(session?.user.role);
  const { filter = "available" } = await searchParams;
  const trucks = store.listTrucks();
  const available = trucks.filter((t) => t.readiness === "LEGAL_NOW");
  const shown =
    filter === "blocked"
      ? trucks.filter((t) => t.readiness !== "LEGAL_NOW")
      : filter === "all"
        ? trucks
        : available;

  return (
    <div>
      <AppHeader
        title="Fleet availability"
        subtitle="See trucks by location, HOS, equipment, and current readiness."
        canWrite={canWrite}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <a
            key={f.key}
            href={`/fleet?filter=${f.key}`}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              filter === f.key ? "bg-teal text-white" : "bg-white text-ink-muted ring-1 ring-line"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <section className="card p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Fleet availability</h2>
            <p className="text-sm text-ink-muted">
              Live truck pool by location, HOS, equipment fit, and dispatch readiness.
            </p>
          </div>
          <span className="chip bg-teal-soft text-teal">{available.length} available</span>
        </div>
        <ul className="divide-y divide-line">
          {shown.map((truck) => {
            const badge = readinessLabel(truck.readiness);
            return (
              <li key={truck.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      Truck {truck.unitNumber} · {truck.driverName}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {truck.city}, {truck.state} · Drive left: {formatMinutes(truck.hosDriveMinutes)} ·
                      Duty left: {formatMinutes(truck.hosDutyMinutes)} · {trailerLabel(truck.trailerType)} ·{" "}
                      {truck.weeklyLoadCount} load{truck.weeklyLoadCount === 1 ? "" : "s"} this week
                    </p>
                  </div>
                  <span className={`chip shrink-0 ${badge.className}`}>{badge.text}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
