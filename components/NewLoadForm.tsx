"use client";

import { useMemo, useState } from "react";
import { CITIES } from "@/lib/cities";
import { createLoadAction } from "@/lib/actions";

function localInputValue(hoursFromNow: number): string {
  const d = new Date(Date.now() + hoursFromNow * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewLoadForm() {
  const [pickupKey, setPickupKey] = useState("Indianapolis|IN");
  const [dropKey, setDropKey] = useState("Chicago|IL");
  const [tmsNote, setTmsNote] = useState(false);

  const pickup = useMemo(
    () => CITIES.find((c) => `${c.city}|${c.state}` === pickupKey) ?? CITIES[1],
    [pickupKey],
  );
  const drop = useMemo(
    () => CITIES.find((c) => `${c.city}|${c.state}` === dropKey) ?? CITIES[0],
    [dropKey],
  );

  return (
    <form action={createLoadAction} className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">Manual intake for the pilot. TMS import is stubbed.</p>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setTmsNote(true)}
        >
          Import from TMS
        </button>
      </div>
      {tmsNote ? (
        <p className="rounded-xl bg-teal-mist px-3 py-2 text-sm text-teal">
          McLeod / TMW import is not connected in this pilot. Enter the load manually — it persists in
          the database.
        </p>
      ) : null}

      <div>
        <label className="label" htmlFor="customer">
          Customer
        </label>
        <input id="customer" name="customer" required className="field" defaultValue="Midwest Paper Co" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pickupCity">
            Pickup
          </label>
          <select
            id="pickupCity"
            className="field"
            value={pickupKey}
            onChange={(e) => setPickupKey(e.target.value)}
          >
            {CITIES.map((c) => (
              <option key={`${c.city}-${c.state}`} value={`${c.city}|${c.state}`}>
                {c.city}, {c.state}
              </option>
            ))}
          </select>
          <input type="hidden" name="pickupCity" value={pickup.city} />
          <input type="hidden" name="pickupState" value={pickup.state} />
          <input type="hidden" name="pickupLat" value={pickup.lat} />
          <input type="hidden" name="pickupLng" value={pickup.lng} />
        </div>
        <div>
          <label className="label" htmlFor="deliveryCity">
            Delivery
          </label>
          <select
            id="deliveryCity"
            className="field"
            value={dropKey}
            onChange={(e) => setDropKey(e.target.value)}
          >
            {CITIES.map((c) => (
              <option key={`${c.city}-${c.state}-d`} value={`${c.city}|${c.state}`}>
                {c.city}, {c.state}
              </option>
            ))}
          </select>
          <input type="hidden" name="deliveryCity" value={drop.city} />
          <input type="hidden" name="deliveryState" value={drop.state} />
          <input type="hidden" name="deliveryLat" value={drop.lat} />
          <input type="hidden" name="deliveryLng" value={drop.lng} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pickupWindowStart">
            Pickup window start
          </label>
          <input
            id="pickupWindowStart"
            name="pickupWindowStart"
            type="datetime-local"
            className="field"
            required
            defaultValue={localInputValue(6)}
          />
        </div>
        <div>
          <label className="label" htmlFor="pickupWindowEnd">
            Pickup window end
          </label>
          <input
            id="pickupWindowEnd"
            name="pickupWindowEnd"
            type="datetime-local"
            className="field"
            required
            defaultValue={localInputValue(14)}
          />
        </div>
        <div>
          <label className="label" htmlFor="deliveryWindowStart">
            Delivery window start
          </label>
          <input
            id="deliveryWindowStart"
            name="deliveryWindowStart"
            type="datetime-local"
            className="field"
            required
            defaultValue={localInputValue(22)}
          />
        </div>
        <div>
          <label className="label" htmlFor="deliveryWindowEnd">
            Delivery window end
          </label>
          <input
            id="deliveryWindowEnd"
            name="deliveryWindowEnd"
            type="datetime-local"
            className="field"
            required
            defaultValue={localInputValue(34)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="trailerType">
            Trailer
          </label>
          <select id="trailerType" name="trailerType" className="field" defaultValue="DRY_VAN">
            <option value="DRY_VAN">Dry van</option>
            <option value="REEFER">Reefer</option>
            <option value="FLATBED">Flatbed</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="weightLbs">
            Weight (lbs)
          </label>
          <input id="weightLbs" name="weightLbs" type="number" min={1000} className="field" defaultValue={36500} />
        </div>
        <div>
          <label className="label" htmlFor="priority">
            Priority
          </label>
          <select id="priority" name="priority" className="field" defaultValue="STANDARD">
            <option value="STANDARD">Standard</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea id="notes" name="notes" className="field min-h-24" defaultValue="Drop and hook if available." />
      </div>

      <button type="submit" className="btn-primary">
        Save load and rank trucks
      </button>
    </form>
  );
}
