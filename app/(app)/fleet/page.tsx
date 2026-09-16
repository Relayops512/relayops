import { auth, isDispatcher } from "@/lib/auth";
import { store } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { formatMinutes } from "@/lib/geo";
import { trailerLabel } from "@/lib/matching";
import { FleetCsvUpload } from "@/components/FleetCsvUpload";
import { AddTruckForm } from "@/components/AddTruckForm";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";

const FILTERS = [
  { key: "available", label: "Ready" },
  { key: "blocked", label: "Not ready" },
  { key: "all", label: "All" },
] as const;

function readinessLabel(value: string) {
  switch (value) {
    case "LEGAL_NOW":
      return { text: "Ready", className: "bg-sage text-sage-text" };
    case "HOS_BLOCKED":
      return { text: "Hours short", className: "bg-peach text-peach-text" };
    case "ON_LOAD":
      return { text: "On a load", className: "bg-teal-soft text-teal" };
    default:
      return { text: "In shop", className: "bg-red-100 text-red-800" };
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
  const settings = store.getSettings();
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
        title="Fleet"
        subtitle="Who's ready, where they are, and what they're pulling."
        demo={settings.fleetIsDemo}
      />

      {canWrite ? (
        <section className="card mb-4 p-6">
          <h2 className="mb-3 text-lg font-semibold">Add a truck</h2>
          <AddTruckForm />
        </section>
      ) : null}

      <FleetCsvUpload canWrite={canWrite} />

      <div className="mb-5 mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <a
            key={f.key}
            href={`/fleet?filter=${f.key}`}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              filter === f.key ? "bg-teal text-white" : "bg-white text-ink-muted"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <section className="card p-2 sm:p-4">
        {shown.length === 0 ? (
          <EmptyState
            title={trucks.length === 0 ? "No trucks yet" : "Nobody in this list"}
            body={
              trucks.length === 0
                ? "Add a few trucks or upload a CSV. Then Today can recommend cover."
                : "Try Ready or All."
            }
            action={
              trucks.length === 0 && canWrite ? (
                <Link href="/setup" className="btn-ghost">
                  Setup
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((truck) => {
              const badge = readinessLabel(truck.readiness);
              return (
                <li key={truck.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        Truck {truck.unitNumber} · {truck.driverName}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                        {truck.locationKnown ? `${truck.city}, ${truck.state}` : "Location unknown"}
                        {" · "}
                        {formatMinutes(truck.hosDriveMinutes)} drive left
                        {" · "}
                        {trailerLabel(truck.trailerType)}
                        {truck.source === "samsara" ? " · Samsara" : truck.source === "csv" ? " · CSV" : ""}
                        {settings.fairnessToolsEnabled
                          ? ` · ${truck.weeklyLoadCount} load${truck.weeklyLoadCount === 1 ? "" : "s"} this week`
                          : ""}
                      </p>
                    </div>
                    <span className={`chip shrink-0 ${badge.className}`}>{badge.text}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
