"use client";

import { useState } from "react";
import Link from "next/link";
import type { TodayLoadItem } from "@/lib/today";
import { QuickAssign } from "./QuickAssign";
import { EmptyState } from "./EmptyState";

export function TodayBoard({
  items,
  canWrite,
}: {
  items: TodayLoadItem[];
  canWrite: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <section className="card">
        <EmptyState
          title="You're covered"
          body={
            <>
              No open loads right now. Add one when freight comes in, or open{" "}
              <Link href="/help" className="font-semibold text-teal">
                Help
              </Link>
              .
            </>
          }
          action={
            canWrite ? (
              <Link href="/loads/new" className="btn-primary">
                New load
              </Link>
            ) : (
              <Link href="/help" className="btn-ghost">
                Help
              </Link>
            )
          }
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {items.map((item) => {
        const expanded = openId === item.id;
        return (
          <article key={item.id} className="card px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight text-ink">{item.lane}</h2>
                  {item.needCover ? (
                    <span className="chip bg-peach text-peach-text">Needs cover</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {item.appointment}
                  <span className="mx-1.5 text-ink-faint">·</span>
                  {item.relative}
                  <span className="mx-1.5 text-ink-faint">·</span>
                  {item.trailer}
                </p>
                {item.best ? (
                  <p className="mt-3 text-sm leading-relaxed text-ink">
                    <span className="font-semibold">
                      Truck {item.best.unitNumber} · {item.best.driverName}
                    </span>
                    <span className="text-ink-muted"> — {item.best.why}</span>
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-ink-muted">No truck ready for this yet.</p>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {item.best && canWrite ? (
                  <QuickAssign
                    loadId={item.id}
                    truckId={item.best.truckId}
                    isOverride={false}
                    canWrite={canWrite}
                    returnTo="board"
                    label="Assign"
                  />
                ) : null}
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setOpenId(expanded ? null : item.id)}
                >
                  {expanded ? "Hide options" : "Other trucks"}
                </button>
              </div>
            </div>

            {expanded ? (
              <ul className="mt-5 space-y-3 border-t border-line pt-5">
                {item.options.map((option) => (
                  <li
                    key={option.truckId}
                    className="flex flex-col gap-3 rounded-2xl bg-cream-soft/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-ink">
                        {option.isBest ? "Best · " : ""}
                        Truck {option.unitNumber} · {option.driverName}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {option.why}
                        {option.eligible ? "" : " · Not ready"}
                      </p>
                    </div>
                    {canWrite ? (
                      <QuickAssign
                        loadId={item.id}
                        truckId={option.truckId}
                        isOverride={!option.isBest || !option.eligible}
                        canWrite={canWrite}
                        returnTo="board"
                        label={option.isBest ? "Assign" : "Use this truck"}
                        className="sm:min-w-56"
                      />
                    ) : null}
                  </li>
                ))}
                <li>
                  <Link href={`/loads/${item.id}`} className="text-sm font-semibold text-teal">
                    Open load details
                  </Link>
                </li>
              </ul>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
