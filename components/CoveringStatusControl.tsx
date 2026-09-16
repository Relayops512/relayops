"use client";

import { useState } from "react";
import { updateCoveringStatusAction } from "@/lib/actions";
import { COVERING_LABELS, coveringChipClass, nextCoveringStatus } from "@/lib/covering";
import type { CoveringStatus } from "@/lib/types";

export function CoveringStatusControl({
  loadId,
  status,
  canWrite,
}: {
  loadId: string;
  status: CoveringStatus;
  canWrite: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const next = nextCoveringStatus(status);

  async function onSubmit(formData: FormData) {
    setError(null);
    const result = await updateCoveringStatusAction(formData);
    if (result?.error) setError(result.error);
  }

  if (!canWrite || status === "DELIVERED") {
    return <span className={`chip ${coveringChipClass(status)}`}>{COVERING_LABELS[status]}</span>;
  }

  return (
    <div className="flex flex-col gap-3">
      <span className={`chip w-fit ${coveringChipClass(status)}`}>{COVERING_LABELS[status]}</span>
      <div className="flex flex-wrap items-center gap-2">
        {next && next !== "DELIVERED" ? (
          <form action={onSubmit}>
            <input type="hidden" name="loadId" value={loadId} />
            <input type="hidden" name="status" value={next} />
            <button type="submit" className="btn-primary">
              {COVERING_LABELS[next]}
            </button>
          </form>
        ) : null}
        <form action={onSubmit}>
          <input type="hidden" name="loadId" value={loadId} />
          <input type="hidden" name="status" value="DELIVERED" />
          <button type="submit" className="btn-ghost">
            Complete
          </button>
        </form>
      </div>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </div>
  );
}
