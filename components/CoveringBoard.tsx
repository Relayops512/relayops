"use client";

import { useState } from "react";
import Link from "next/link";
import type { CoveringItem } from "@/lib/covering";
import { COVERING_LABELS } from "@/lib/covering";
import { CoveringStatusControl } from "./CoveringStatusControl";
import { EmptyState } from "./EmptyState";

export function CoveringBoard({
  active,
  done,
  canWrite,
}: {
  active: CoveringItem[];
  done: CoveringItem[];
  canWrite: boolean;
}) {
  const [showDone, setShowDone] = useState(false);
  const items = showDone ? done : active;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`chip ${showDone ? "bg-cream text-ink-muted" : "bg-teal-soft text-teal"}`}
          onClick={() => setShowDone(false)}
        >
          Covering · {active.length}
        </button>
        <button
          type="button"
          className={`chip ${showDone ? "bg-sage text-sage-text" : "bg-cream text-ink-muted"}`}
          onClick={() => setShowDone(true)}
        >
          Done · {done.length}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            title={showDone ? "Nothing complete yet" : "Nothing covering"}
            body={
              showDone ? (
                "Mark Complete on an assigned load when it’s delivered."
              ) : (
                <>
                  Assign from{" "}
                  <Link href="/board" className="font-semibold text-teal">
                    Today
                  </Link>{" "}
                  and the load stays here with the truck and driver.
                </>
              )
            }
            action={
              showDone ? undefined : (
                <Link href="/board" className="btn-primary">
                  Today
                </Link>
              )
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.assignmentId} className="card px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-ink">{item.lane}</h2>
                    {showDone ? (
                      <span className="chip bg-sage text-sage-text">
                        {COVERING_LABELS[item.coveringStatus]}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {item.customer}
                    <span className="mx-1.5 text-ink-faint">·</span>
                    {item.reference}
                    <span className="mx-1.5 text-ink-faint">·</span>
                    {item.trailer}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-ink">
                    Truck {item.unitNumber} · {item.driverName}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Pickup {item.pickupWindow}
                    <span className="mx-1.5 text-ink-faint">·</span>
                    Delivery {item.deliveryWindow}
                  </p>
                </div>

                {showDone ? null : (
                  <CoveringStatusControl
                    loadId={item.loadId}
                    status={item.coveringStatus}
                    canWrite={canWrite}
                  />
                )}

                <Link href={`/loads/${item.loadId}`} className="text-sm font-semibold text-teal">
                  Open load details
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
