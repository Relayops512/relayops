"use client";

import { useState } from "react";
import { assignLoadAction } from "@/lib/actions";
import { ReasonChips } from "./ReasonChips";
import type { ReasonChip } from "@/lib/matching";

export type AssignMatch = {
  truckId: string;
  unitNumber: string;
  driverName: string;
  city: string;
  state: string;
  score: number;
  eligible: boolean;
  reasons: ReasonChip[];
  breakdown: {
    hos: number;
    deadhead: number;
    fuel: number;
    eta: number;
    trailer: number;
    fairness: number;
  };
};

export function AssignPanel({
  loadId,
  matches,
  canWrite,
  topTruckId,
}: {
  loadId: string;
  matches: AssignMatch[];
  canWrite: boolean;
  topTruckId?: string;
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
    <form action={onSubmit} className="space-y-3">
      <input type="hidden" name="loadId" value={loadId} />
      <input type="hidden" name="truckId" value={selected} />
      <input type="hidden" name="isOverride" value={isOverride ? "true" : "false"} />
      <ul className="space-y-3">
        {matches.map((match, index) => (
          <li key={match.truckId}>
            <label
              className={`card block cursor-pointer p-4 transition ${
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {index === 0 ? "Recommended · " : ""}
                      Truck {match.unitNumber} · {match.driverName}
                    </p>
                    <span className="text-lg font-semibold text-teal">{match.score.toFixed(1)}</span>
                  </div>
                  <p className="text-sm text-ink-muted">
                    {match.city}, {match.state}
                    {match.eligible ? "" : " · Not eligible — override required"}
                  </p>
                  <div className="mt-2">
                    <ReasonChips reasons={match.reasons} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px] uppercase tracking-wide text-ink-faint sm:grid-cols-6">
                    {Object.entries(match.breakdown).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd className="text-sm font-semibold capitalize text-ink">{Math.round(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </label>
          </li>
        ))}
      </ul>

      {isOverride ? (
        <div className="rounded-2xl border border-peach bg-peach/30 p-4">
          <label className="label" htmlFor="overrideReason">
            Override reason (required)
          </label>
          <textarea
            id="overrideReason"
            name="overrideReason"
            required
            minLength={8}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="field min-h-24"
            placeholder="Why skip the recommended truck? This is logged to the fairness audit."
          />
        </div>
      ) : (
        <input type="hidden" name="overrideReason" value="" />
      )}

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      {canWrite ? (
        <button type="submit" className="btn-primary">
          {isOverride ? "Override and assign" : "Assign recommended truck"}
        </button>
      ) : (
        <p className="text-sm text-ink-muted">Viewer accounts are read-only.</p>
      )}
    </form>
  );
}
