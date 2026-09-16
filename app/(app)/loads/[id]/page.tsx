import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, isDispatcher } from "@/lib/auth";
import { getLoadWithMatches } from "@/lib/queries";
import { AppHeader } from "@/components/AppHeader";
import { AssignPanel, type AssignMatch } from "@/components/AssignPanel";
import { EmptyState } from "@/components/EmptyState";
import { cityState, formatWeight, formatWindow, formatWhen } from "@/lib/format";
import { formatMiles } from "@/lib/geo";
import { matchWhyLine, formatEquipment } from "@/lib/matching";
import { COVERING_LABELS, coveringChipClass } from "@/lib/covering";
import { CoveringStatusControl } from "@/components/CoveringStatusControl";

export default async function LoadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const canWrite = isDispatcher(session?.user.role);
  const data = await getLoadWithMatches(id);
  if (!data) notFound();
  const { load, matches, assignment, settings } = data;
  const topEligible = matches.find((m) => m.eligible) ?? matches[0];
  const fairnessEnabled = settings.fairnessToolsEnabled;

  const panelMatches: AssignMatch[] = matches.slice(0, 8).map((m) => ({
    truckId: m.truck.id,
    unitNumber: m.truck.unitNumber,
    driverName: m.truck.driverName,
    city: m.truck.city,
    state: m.truck.state,
    score: m.score,
    eligible: m.eligible,
    reasons: m.reasons,
    breakdown: m.breakdown,
    why: matchWhyLine(m),
  }));

  return (
    <div>
      <AppHeader
        title={load.reference}
        subtitle={`${load.customer} · ${cityState(load.pickupCity, load.pickupState)} to ${cityState(load.deliveryCity, load.deliveryState)}`}
        demo={settings.fleetIsDemo}
      />

      <section className="card mb-6 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`chip ${
              load.status === "OPEN"
                ? "bg-teal-soft text-teal"
                : load.status === "COMPLETED"
                  ? "bg-sage text-sage-text"
                  : coveringChipClass(assignment?.coveringStatus ?? "ASSIGNED")
            }`}
          >
            {load.status === "OPEN"
              ? "Needs cover"
              : load.status === "COMPLETED"
                ? "Done"
                : COVERING_LABELS[assignment?.coveringStatus ?? "ASSIGNED"]}
          </span>
          {load.priority === "HIGH" ? <span className="chip bg-peach text-peach-text">Soon</span> : null}
          <span className="chip bg-cream text-ink-muted">{formatEquipment(load.trailerType, load.hazmat)}</span>
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Pickup</dt>
            <dd className="mt-1 font-medium">{formatWindow(load.pickupWindowStart, load.pickupWindowEnd)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Delivery</dt>
            <dd className="mt-1 font-medium">{formatWindow(load.deliveryWindowStart, load.deliveryWindowEnd)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Weight</dt>
            <dd className="mt-1 font-medium">{formatWeight(load.weightLbs)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Lane</dt>
            <dd className="mt-1 font-medium">{formatMiles(matches[0] ? matches[0].loadedMiles : 0)}</dd>
          </div>
        </dl>
        {load.notes ? <p className="mt-4 text-sm leading-relaxed text-ink-muted">{load.notes}</p> : null}
      </section>

      {assignment ? (
        <section className="card mb-6 p-6">
          <h2 className="font-semibold">Covered by</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Truck {assignment.truck.unitNumber} · {assignment.truck.driverName}
          </p>
          <p className="text-sm text-ink-muted">
            {assignment.assignedBy.name} · {formatWhen(assignment.createdAt)}
          </p>
          {assignment.overrideReason ? (
            <p className="mt-3 text-sm text-ink-muted">{assignment.overrideReason}</p>
          ) : null}
          {load.status === "COMPLETED" ? (
            <p className="mt-4 text-sm text-ink-muted">This load is complete.</p>
          ) : (
            <div className="mt-5">
              <CoveringStatusControl
                loadId={load.id}
                status={assignment.coveringStatus}
                canWrite={canWrite}
              />
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-4">
            <Link href="/covering" className="text-sm font-semibold text-teal">
              Back to Covering
            </Link>
            <Link href="/board" className="text-sm font-semibold text-ink-muted">
              Today
            </Link>
          </div>
        </section>
      ) : panelMatches.length === 0 ? (
        <section className="card">
          <EmptyState
            title="No trucks to rank"
            body="Add a truck on Fleet, then come back. We'll show the best available match."
            action={
              <Link href="/fleet" className="btn-primary">
                Fleet
              </Link>
            }
          />
        </section>
      ) : (
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight">Best truck</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              {topEligible
                ? `Truck ${topEligible.truck.unitNumber} · ${matchWhyLine(topEligible)}`
                : "We'll rank whoever can cover this."}
            </p>
          </div>
          <AssignPanel
            loadId={load.id}
            matches={panelMatches}
            canWrite={canWrite}
            topTruckId={topEligible?.truck.id}
            fairnessEnabled={fairnessEnabled}
          />
        </section>
      )}
    </div>
  );
}
