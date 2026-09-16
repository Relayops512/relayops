"use client";

import { useState } from "react";
import { assignLoadAction } from "@/lib/actions";

export function QuickAssign({
  loadId,
  truckId,
  isOverride,
  canWrite,
  returnTo = "board",
  label = "Assign",
  className = "",
  onAssigned,
}: {
  loadId: string;
  truckId: string;
  isOverride: boolean;
  canWrite: boolean;
  returnTo?: "board" | "load";
  label?: string;
  className?: string;
  onAssigned?: () => void | Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!canWrite) return null;

  async function onSubmit(formData: FormData) {
    setError(null);
    await onAssigned?.();
    const result = await assignLoadAction(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <form action={onSubmit} className={`flex flex-col gap-2 ${className}`}>
      <input type="hidden" name="loadId" value={loadId} />
      <input type="hidden" name="truckId" value={truckId} />
      <input type="hidden" name="isOverride" value={isOverride ? "true" : "false"} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {isOverride ? (
        <input
          name="overrideReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="field"
          placeholder="Short note — customer request, driver home time…"
          required
          minLength={3}
        />
      ) : (
        <input type="hidden" name="overrideReason" value="" />
      )}
      <button type="submit" className="btn-primary">
        {label}
      </button>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </form>
  );
}
