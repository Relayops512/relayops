"use client";

import { useActionState } from "react";
import { importFleetCsvAction, type FleetImportState } from "@/lib/actions";

const INITIAL: FleetImportState = {
  ok: false,
  mode: "replace",
  imported: 0,
  created: 0,
  updated: 0,
  errors: [],
  message: "",
};

export function FleetCsvUpload({ canWrite }: { canWrite: boolean }) {
  const [state, action, pending] = useActionState(importFleetCsvAction, INITIAL);

  return (
    <section className="card mb-4 p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Upload fleet CSV</h2>
          <p className="text-sm text-ink-muted">
            Load your trucks and drivers without Samsara. Valid rows update the live matching pool
            immediately.
          </p>
        </div>
        <a href="/api/fleet/template" className="btn-ghost">
          Download template
        </a>
      </div>

      <dl className="mb-4 grid gap-2 text-xs text-ink-muted sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-ink">Required</dt>
          <dd>truckNumber, driverName</dd>
        </div>
        <div>
          <dt className="font-semibold text-ink">Optional</dt>
          <dd>trailerType, lat, lng, hosDriveMinutesRemaining, hosDutyMinutesRemaining, mpg, status, weeklyLoadCount</dd>
        </div>
      </dl>
      <p className="mb-4 text-xs text-ink-faint">
        Aliases work (unit, driver, latitude, available). Missing lat/lng marks location unknown and
        lowers match quality. On Vercel the uploaded fleet lasts for this serverless instance — a
        cold start resets to demo trucks. Samsara remains optional for live GPS/HOS later.
      </p>

      {canWrite ? (
        <form action={action} className="space-y-3">
          <div>
            <label className="label" htmlFor="fleet-file">
              CSV file
            </label>
            <input id="fleet-file" name="file" type="file" accept=".csv,text/csv" className="field bg-white" />
          </div>
          <div>
            <label className="label" htmlFor="csvText">
              Or paste CSV
            </label>
            <textarea
              id="csvText"
              name="csvText"
              className="field min-h-28 font-mono text-xs"
              placeholder="truckNumber,driverName,trailerType,lat,lng&#10;401,Jamie Cole,dry_van,39.77,-86.16"
            />
          </div>
          <fieldset className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" value="replace" defaultChecked className="accent-teal" />
              Replace fleet
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="mode" value="merge" className="accent-teal" />
              Merge / upsert by truck number
            </label>
          </fieldset>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Importing…" : "Import CSV"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-ink-muted">Viewer accounts cannot upload fleet files.</p>
      )}

      {state.message ? (
        <div
          className={`mt-4 rounded-xl px-3 py-2 text-sm ${
            state.ok ? "bg-sage text-sage-text" : "bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </div>
      ) : null}
      {state.errors.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-peach-text">
          {state.errors.map((err) => (
            <li key={`${err.row}-${err.message}`}>
              {err.row > 0 ? `Row ${err.row}: ` : ""}
              {err.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
