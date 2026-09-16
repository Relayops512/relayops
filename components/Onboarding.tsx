"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TodayLoadItem } from "@/lib/today";
import {
  completeOnboardingAction,
  createSampleLoadAction,
  skipOnboardingAction,
} from "@/lib/actions";
import { AddTruckForm } from "./AddTruckForm";
import { FleetCsvUpload } from "./FleetCsvUpload";
import { QuickAssign } from "./QuickAssign";

type Step = "welcome" | "fleet" | "load" | "match";

export function Onboarding({
  sample,
  isDemoFleet,
}: {
  sample: TodayLoadItem | null;
  isDemoFleet: boolean;
}) {
  const [step, setStep] = useState<Step>("welcome");
  const [pending, start] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);
  const router = useRouter();

  function skip() {
    start(async () => {
      await skipOnboardingAction();
    });
  }

  function finish() {
    start(async () => {
      await completeOnboardingAction();
    });
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-cream/95 px-4 py-10 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-sm font-semibold text-teal">RelayOps</p>
          <button type="button" onClick={skip} className="text-sm font-semibold text-ink-muted hover:text-ink">
            Skip
          </button>
        </div>

        {step === "welcome" ? (
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">Cover today&apos;s loads</h1>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">
              We&apos;ll help you put the best available truck on each load. A few minutes to add
              trucks — then assign.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" className="btn-primary" onClick={() => setStep("fleet")}>
                Get started
              </button>
              <button type="button" className="btn-ghost" onClick={skip}>
                Skip for now
              </button>
            </div>
          </div>
        ) : null}

        {step === "fleet" ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-ink">Add your fleet</h1>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                Upload a CSV or add a couple of trucks. You can keep the sample fleet if you just
                want to look around. Samsara is optional later in Setup — CSV is enough for the
                pilot.
              </p>
            </div>
            <div className="card p-5">
              <h2 className="mb-3 font-semibold">A few trucks</h2>
              <AddTruckForm compact />
            </div>
            <FleetCsvUpload canWrite compact />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  router.refresh();
                  setStep("load");
                }}
              >
                Continue
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  router.refresh();
                  setStep("load");
                }}
              >
                {isDemoFleet ? "Use sample fleet" : "Continue with this fleet"}
              </button>
            </div>
          </div>
        ) : null}

        {step === "load" ? (
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">Cover a load</h1>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">
              {sample
                ? "There's already freight that needs cover. Next we'll show the best truck."
                : "Add a sample Indianapolis → Chicago load to see a match."}
            </p>
            {loadError ? <p className="mt-3 text-sm text-red-800">{loadError}</p> : null}
            <div className="mt-8 flex flex-wrap gap-3">
              {sample ? (
                <button type="button" className="btn-primary" onClick={() => setStep("match")}>
                  See best truck
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={pending}
                  onClick={() => {
                    setLoadError(null);
                    start(async () => {
                      const result = await createSampleLoadAction();
                      if (!result.ok) {
                        setLoadError(result.error ?? "Could not add a sample load.");
                        return;
                      }
                      router.refresh();
                      setStep("match");
                    });
                  }}
                >
                  {pending ? "Adding…" : "Add sample load"}
                </button>
              )}
              <button type="button" className="btn-ghost" onClick={skip}>
                Skip to Today
              </button>
            </div>
          </div>
        ) : null}

        {step === "match" ? (
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">Best available truck</h1>
            {sample ? (
              <div className="card mt-6 p-6">
                <p className="text-lg font-semibold tracking-tight">{sample.lane}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {sample.appointment} · {sample.relative}
                </p>
                {sample.best ? (
                  <>
                    <p className="mt-5 text-ink">
                      <span className="font-semibold">
                        Truck {sample.best.unitNumber} · {sample.best.driverName}
                      </span>
                      <span className="text-ink-muted"> — {sample.best.why}</span>
                    </p>
                    <div className="mt-6">
                      <QuickAssign
                        loadId={sample.id}
                        truckId={sample.best.truckId}
                        isOverride={false}
                        canWrite
                        returnTo="board"
                        label="Assign"
                        onAssigned={() => completeOnboardingAction()}
                      />
                    </div>
                  </>
                ) : (
                  <p className="mt-5 text-sm text-ink-muted">
                    No truck is ready for this load yet. Add a dry van nearby, then come back to
                    Today.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">
                Sample load is ready on Today. Open it to assign.
              </p>
            )}
            <button type="button" className="btn-ghost mt-6" onClick={finish}>
              Go to Today
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
