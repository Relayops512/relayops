"use client";

import { useTransition } from "react";
import { disconnectSamsaraAction, syncSamsaraAction } from "@/lib/actions";

export function SamsaraActions({
  connected,
  canWrite,
}: {
  connected: boolean;
  canWrite: boolean;
}) {
  const [pending, start] = useTransition();

  if (!canWrite) {
    return <p className="text-sm text-ink-muted">Viewer accounts cannot change Samsara.</p>;
  }

  if (!connected) {
    return (
      <a href="/api/integrations/samsara/connect" className="btn-primary">
        Connect Samsara
      </a>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await syncSamsaraAction();
            })
          }
        >
          {pending ? "Syncing…" : "Sync now"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await disconnectSamsaraAction();
            })
          }
        >
          Disconnect
        </button>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-ink-muted">Replace fleet from Samsara</summary>
        <p className="mt-2 leading-relaxed text-ink-muted">
          Removes trucks that aren&apos;t in Samsara, including ones you added by CSV. Matching will
          use only the Samsara set.
        </p>
        <button
          type="button"
          className="btn-ghost mt-3"
          disabled={pending}
          onClick={() => {
            const data = new FormData();
            data.set("mode", "replace");
            start(async () => {
              await syncSamsaraAction(data);
            });
          }}
        >
          Replace from Samsara
        </button>
      </details>
    </div>
  );
}
