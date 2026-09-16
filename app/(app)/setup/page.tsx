import { auth, isDispatcher } from "@/lib/auth";
import { store } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { saveSamsaraSettingsAction } from "@/lib/actions";
import { formatWhen } from "@/lib/format";
import { FairnessToggle } from "@/components/FairnessToggle";
import Link from "next/link";

export default async function SetupPage() {
  const session = await auth();
  const canWrite = isDispatcher(session?.user.role);
  const setting = store.getIntegration();
  const settings = store.getSettings();

  return (
    <div>
      <AppHeader
        title="Setup"
        subtitle="Connect telematics later. Fairness tools stay out of the way unless you want them."
        demo={settings.fleetIsDemo}
      />

      <section className="card mb-4 p-6">
        <h2 className="text-lg font-semibold">Quick start</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          How to run a day, where things live, and a few tips.
        </p>
        <p className="mt-4">
          <Link href="/help" className="font-semibold text-teal">
            Open Help
          </Link>
        </p>
      </section>

      <section className="card p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Samsara</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Optional later for live GPS and HOS. This pilot runs on the trucks you add here.
            </p>
          </div>
          <span className="chip bg-teal-soft text-teal">Demo</span>
        </div>

        <form action={saveSamsaraSettingsAction} className="space-y-5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={setting?.enabled}
              disabled={!canWrite}
              className="accent-teal"
            />
            Enable when keys are available
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="demoMode"
              defaultChecked={setting?.demoMode ?? true}
              disabled={!canWrite}
              className="accent-teal"
            />
            Use sample fleet data
          </label>
          <div>
            <label className="label" htmlFor="orgId">
              Organization ID
            </label>
            <input
              id="orgId"
              name="orgId"
              className="field"
              defaultValue={setting?.orgId ?? "relayops-midwest-demo"}
              disabled={!canWrite}
            />
          </div>
          <div>
            <label className="label" htmlFor="apiToken">
              API token
            </label>
            <input
              id="apiToken"
              name="apiToken"
              type="password"
              className="field"
              placeholder={setting?.apiTokenHint || "Not needed for this pilot"}
              disabled={!canWrite}
            />
          </div>
          <p className="text-xs text-ink-faint">
            Last demo sync: {setting?.lastSyncAt ? formatWhen(setting.lastSyncAt) : "not yet"}
          </p>
          {canWrite ? (
            <button type="submit" className="btn-primary">
              Save
            </button>
          ) : (
            <p className="text-sm text-ink-muted">Viewer accounts cannot change setup.</p>
          )}
        </form>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="card p-6">
          <h3 className="font-semibold">Motive</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">Same location and HOS fields, later.</p>
        </article>
        <article className="card p-6">
          <h3 className="font-semibold">Geotab</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">For mixed fleets, later.</p>
        </article>
      </section>

      <details className="card mt-10 p-6">
        <summary className="cursor-pointer text-lg font-semibold tracking-tight">Advanced</summary>
        <div className="mt-5 space-y-5">
          <p className="text-sm leading-relaxed text-ink-muted">
            Extra tools for fleets that want them. Most dispatchers can ignore this.
          </p>
          {canWrite ? (
            <FairnessToggle enabled={settings.fairnessToolsEnabled} />
          ) : (
            <p className="text-sm text-ink-muted">
              Fairness tools are {settings.fairnessToolsEnabled ? "on" : "off"}.
            </p>
          )}
          {settings.fairnessToolsEnabled ? (
            <p className="text-sm">
              <Link href="/audit" className="font-semibold text-teal">
                Open fairness tools
              </Link>
            </p>
          ) : null}
        </div>
      </details>
    </div>
  );
}
