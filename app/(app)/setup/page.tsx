import { auth, isDispatcher } from "@/lib/auth";
import { store } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { saveSamsaraSettingsAction } from "@/lib/actions";
import { formatWhen } from "@/lib/format";

export default async function SetupPage() {
  const session = await auth();
  const canWrite = isDispatcher(session?.user.role);
  const setting = store.getIntegration();

  return (
    <div>
      <AppHeader
        title="Integrations"
        subtitle="Samsara is the first ELD/telematics connector. Motive and Geotab come next."
        canWrite={canWrite}
      />

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Samsara</h2>
            <p className="text-sm text-ink-muted">
              Primary future connector for truck location, HOS, and equipment. This pilot does not
              require live API keys.
            </p>
          </div>
          <span className="chip bg-teal-soft text-teal">Demo mode</span>
        </div>

        <form action={saveSamsaraSettingsAction} className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={setting?.enabled}
              disabled={!canWrite}
              className="accent-teal"
            />
            Enable live connector when keys are available
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="demoMode"
              defaultChecked={setting?.demoMode ?? true}
              disabled={!canWrite}
              className="accent-teal"
            />
            Use demo fleet data (recommended for company pilot)
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
              API token (optional — never required for this pilot)
            </label>
            <input
              id="apiToken"
              name="apiToken"
              type="password"
              className="field"
              placeholder={setting?.apiTokenHint || "Paste a token later — demo data still works"}
              disabled={!canWrite}
            />
          </div>
          <p className="text-xs text-ink-faint">
            Last demo sync: {setting?.lastSyncAt ? formatWhen(setting.lastSyncAt) : "not yet"}
          </p>
          {canWrite ? (
            <button type="submit" className="btn-primary">
              Save connector settings
            </button>
          ) : (
            <p className="text-sm text-ink-muted">Viewer accounts cannot change integrations.</p>
          )}
        </form>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <article className="card p-5 opacity-90">
          <h3 className="font-semibold">Motive</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Planned next. Same HOS + location contract as Samsara so matching does not change.
          </p>
          <span className="chip mt-3 bg-cream text-ink-muted">Later</span>
        </article>
        <article className="card p-5 opacity-90">
          <h3 className="font-semibold">Geotab</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Planned for mixed fleets. Fuel and engine data will feed the fuel-estimate score.
          </p>
          <span className="chip mt-3 bg-cream text-ink-muted">Later</span>
        </article>
      </section>
    </div>
    );
}
