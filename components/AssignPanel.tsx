"use client";

import { useState } from "react";
import { assignLoadAction } from "@/lib/actions";
import { ReasonChips } from "./ReasonChips";
import { BREAKDOWN_LABELS, displayBreakdown, displayReasons, type ReasonChip, type ScoreBreakdown } from "@/lib/matching";

export type AssignMatch = {
  truckId: string;
  unitNumber: string;
  driverName: string;
  city: string;
  state: string;
  score: number;
  eligible: boolean;
  reasons: ReasonChip[];
  breakdown: ScoreBreakdown;
  why: string;
};

export function AssignPanel({
  loadId,
  matches,
  canWrite,
  topTruckId,
  fairnessEnabled,
}: {
  loadId: string;
  matches: AssignMatch[];
  canWrite: boolean;
  topTruckId?: string;
  fairnessEnabled: boolean;
}) {
  const [selected, setSelected] = useState(matches[0]?.truckId ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const chosen = matches.find((m) => m.truckId === selected);
  const isOverride = Boolean(chosen && (chosen.truckId !== topTruckId || !chosen.eligible));

  async function onSubmit(formData: FormData) {
    setError(null);
    const result = await assignLoadAction(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <input type="hidden" name="loadId" value={loadId} />
      <input type="hidden" name="truckId" value={selected} />
      <input type="hidden" name="isOverride" value={isOverride ? "true" : "false"} />
      <ul className="space-y-3">
        {matches.map((match, index) => {
          const reasons = displayReasons(match.reasons, fairnessEnabled);
          const breakdown = displayBreakdown(match.breakdown, fairnessEnabled);
          return (
            <li key={match.truckId}>
              <label
                className={`card block cursor-pointer p-5 transition ${
                  selected === match.truckId ? "ring-2 ring-teal" : "hover:bg-teal-mist"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="selectedTruck"
                    value={match.truckId}
                    checked={selected === match.truckId}
                    onChange={() => setSelected(match.truckId)}
                    className="mt-1 accent-teal"
                    disabled={!canWrite}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {index === 0 ? "Best · " : ""}
                      Truck {match.unitNumber} · {match.driverName}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {match.why}
                      {match.eligible ? "" : " · Not ready — a note is required"}
                    </p>
                    <div className="mt-3">
                      <ReasonChips reasons={reasons} />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-ink-muted sm:grid-cols-3">
                      {Object.entries(breakdown).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-xs text-ink-faint">
                            {BREAKDOWN_LABELS[key as keyof typeof BREAKDOWN_LABELS] ?? key}
                          </dt>
                          <dd className="font-medium text-ink">{Math.round(value as number)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      {isOverride ? (
        <div className="rounded-3xl bg-cream-soft p-4">
          <label className="label" htmlFor="overrideReason">
            {fairnessEnabled ? "Why this truck?" : "Short note"}
          </label>
          <textarea
            id="overrideReason"
            name="overrideReason"
            required
            minLength={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="field min-h-20"
            placeholder="Customer request, driver home time, equipment…"
          />
        </div>
      ) : (
        <input type="hidden" name="overrideReason" value="" />
      )}

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      {canWrite ? (
        <button type="submit" className="btn-primary">
          Assign
        </button>
      ) : (
        <p className="text-sm text-ink-muted">Viewer accounts are read-only.</p>
      )}
    </form>
  );
}
