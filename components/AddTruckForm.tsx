"use client";

import { useActionState } from "react";
import { CITIES } from "@/lib/cities";
import { addTruckAction, type AddTruckState } from "@/lib/actions";
import { HazmatSelect, TrailerTypeSelect } from "./EquipmentFields";

const INITIAL: AddTruckState = { ok: false, message: "" };

export function AddTruckForm({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState(addTruckAction, INITIAL);
  const prefix = compact ? "onboard-" : "";

  return (
    <form action={action} className="space-y-3">
      {!compact ? (
        <p className="text-sm text-ink-muted">Add a truck by number, driver, and city. Matching uses it right away.</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`${prefix}unitNumber`}>
            Truck number
          </label>
          <input id={`${prefix}unitNumber`} name="unitNumber" required className="field" placeholder="401" />
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}driverName`}>
            Driver
          </label>
          <input id={`${prefix}driverName`} name="driverName" required className="field" placeholder="Jamie Cole" />
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}cityKey`}>
            Near
          </label>
          <select id={`${prefix}cityKey`} name="cityKey" className="field" defaultValue="Indianapolis|IN">
            {CITIES.map((c) => (
              <option key={`${c.city}-${c.state}`} value={`${c.city}|${c.state}`}>
                {c.city}, {c.state}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}trailerType`}>
            Trailer
          </label>
          <TrailerTypeSelect id={`${prefix}trailerType`} name="trailerType" />
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}hazmat`}>
            Hazmat / product
          </label>
          <HazmatSelect id={`${prefix}hazmat`} name="hazmat" />
        </div>
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Adding…" : "Add truck"}
      </button>
      {state.message ? (
        <p className={`text-sm ${state.ok ? "text-sage-text" : "text-red-800"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}
