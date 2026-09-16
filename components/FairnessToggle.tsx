"use client";

import { saveFairnessSettingsAction } from "@/lib/actions";

export function FairnessToggle({ enabled }: { enabled: boolean }) {
  return (
    <form action={saveFairnessSettingsAction}>
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          name="fairnessToolsEnabled"
          defaultChecked={enabled}
          className="mt-1 accent-teal"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        />
        <span>
          <span className="font-semibold text-ink">Fairness tools</span>
          <span className="mt-1 block text-ink-muted">
            Off by default. When on, you get override rates and load-balance views. Assigning
            still works the same either way.
          </span>
        </span>
      </label>
    </form>
  );
}
