import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, isDispatcher } from "@/lib/auth";
import { getLoadWithMatches } from "@/lib/queries";
import { AppHeader } from "@/components/AppHeader";
import { AssignPanel, type AssignMatch } from "@/components/AssignPanel";
import { cityState, formatWeight, formatWindow, formatWhen } from "@/lib/format";
import { formatMiles } from "@/lib/geo";
import { trailerLabel } from "@/lib/matching";

export default async function LoadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const canWrite = isDispatcher(session?.user.role);
  const data = await getLoadWithMatches(id);
  if (!data) notFound();
  const { load, matches, assignment } = data;
  const topEligible = matches.find((m) => m.eligible) ?? matches[0];

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
  }));

  return (
    <div>
      <AppHeader
        title={load.reference}
        subtitle={`${load.customer} · ${cityState(load.pickupCity, load.pickupState)} to ${cityState(load.deliveryCity, load.deliveryState)}`}
        canWrite={canWrite}
      />

      <section className="card mb-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${load.status === "OPEN" ? "bg-teal-soft text-teal" : "bg-sage text-sage-text"}`}>
            {load.status === "OPEN" ? "Open" : "Assigned"}
          </span>
          {load.priority === "HIGH" ? <span className="chip bg-peach text-peach-text">High priority</span> : null}
          <span className="chip bg-cream text-ink-muted">{trailerLabel(load.trailerType)}</span>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Pickup window</dt>
            <dd className="font-medium">{formatWindow(load.pickupWindowStart, load.pickupWindowEnd)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Delivery window</dt>
            <dd className="font-medium">{formatWindow(load.deliveryWindowStart, load.deliveryWindowEnd)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Weight</dt>
            <dd className="font-medium">{formatWeight(load.weightLbs)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Lane miles</dt>
            <dd className="font-medium">
              {formatMiles(
                matches[0]
                  ? matches[0].loadedMiles
                  : 0,
              )}
            </dd>
          </div>
        </dl>
        {load.notes ? <p className="mt-3 text-sm text-ink-muted">{load.notes}</p> : null}
      </section>

      {assignment ? (
        <section className="card mb-4 p-5">
          <h2 className="font-semibold">Assignment</h2>
          <p className="mt-1 text-sm">
            Truck {assignment.truck.unitNumber} · {assignment.truck.driverName} · score{" "}
            {assignment.score.toFixed(1)}
            {assignment.isOverride ? " · override" : ""}
          </p>
          <p className="text-xs text-ink-faint">
            {assignment.assignedBy.name} · {formatWhen(assignment.createdAt)}
          </p>
          {assignment.overrideReason ? (
            <p className="mt-2 text-sm italic">“{assignment.overrideReason}”</p>
          ) : null}
          <Link href="/board" className="mt-3 inline-block text-sm font-semibold text-teal">
            Back to board
          </Link>
        </section>
      ) : (
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Ranked trucks</h2>
            <p className="text-sm text-ink-muted">
              Scored from seed fields: HOS remaining, deadhead, fuel, ETA, trailer fit, and weekly load
              balance. Recommended: Truck {topEligible?.truck.unitNumber}.
            </p>
          </div>
          <AssignPanel
            loadId={load.id}
            matches={panelMatches}
            canWrite={canWrite}
            topTruckId={topEligible?.truck.id}
          />
        </section>
      )}
    </div>
  );
}
