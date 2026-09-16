import { auth, isDispatcher } from "@/lib/auth";
import { store } from "@/lib/store";
import { AppHeader } from "@/components/AppHeader";
import { formatWhen } from "@/lib/format";
import { FairnessToggle } from "@/components/FairnessToggle";
import { SamsaraActions } from "@/components/SamsaraConnect";
import { getSamsaraConfig } from "@/lib/samsara/config";
import { maybeRefreshSamsara } from "@/lib/samsara/sync";
import { samsaraPersistKind } from "@/lib/samsara/persist";
import Link from "next/link";

function noticeCopy(code?: string): { title: string; body: string; tone: "good" | "warn" | "bad" } | null {
  switch (code) {
    case "connected":
      return {
        title: "Samsara is connected",
        body: "Trucks, drivers, GPS, and hours landed in the same fleet list matching uses. Loads stay in RelayOps.",
        tone: "good",
      };
    case "denied":
      return {
        title: "Samsara access wasn’t granted",
        body: "You can try again, or keep covering loads with CSV.",
        tone: "warn",
      };
    case "expired":
      return {
        title: "That connect link expired",
        body: "Tap Connect Samsara to start over.",
        tone: "warn",
      };
    case "signed_out":
      return {
        title: "Sign in, then connect again",
        body: "Samsara came back while you were signed out. Sign in as a dispatcher and tap Connect Samsara.",
        tone: "warn",
      };
    case "viewer":
      return {
        title: "Dispatchers connect Samsara",
        body: "Viewer accounts can see status but can’t connect or sync.",
        tone: "warn",
      };
    case "not_configured":
      return {
        title: "Samsara isn’t set up on this app yet",
        body: "CSV upload still works. An admin needs to add the Samsara app keys first.",
        tone: "warn",
      };
    case "error":
      return {
        title: "Couldn’t finish connecting",
        body: "Try again in a moment. The fleet you already have is unchanged.",
        tone: "bad",
      };
    default:
      return null;
  }
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ samsara?: string }>;
}) {
  const session = await auth();
  const canWrite = isDispatcher(session?.user.role);
  const { samsara } = await searchParams;
  const config = getSamsaraConfig();
  if (config.configured && store.isSamsaraConnected()) {
    await maybeRefreshSamsara();
  }
  const setting = store.getIntegration();
  const settings = store.getSettings();
  const notice = noticeCopy(samsara);
  const persistKind = samsaraPersistKind();

  return (
    <div>
      <AppHeader
        title="Setup"
        subtitle="Samsara is optional. CSV still works. Fairness tools stay out of the way."
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
            <h2 className="text-lg font-semibold">Integrations</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Connect Samsara to pull live trucks, drivers, GPS, and hours into the same fleet list.
              Read-only — nothing writes back. Loads stay CSV or manual.
            </p>
          </div>
          {setting.connected ? (
            <span className="chip bg-sage text-sage-text">Connected</span>
          ) : config.configured ? (
            <span className="chip bg-teal-soft text-teal">Not connected</span>
          ) : (
            <span className="chip bg-peach text-peach-text">Not configured</span>
          )}
        </div>

        {notice ? (
          <div
            className={`mb-5 rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              notice.tone === "good"
                ? "bg-sage text-sage-text"
                : notice.tone === "bad"
                  ? "bg-red-50 text-red-800"
                  : "bg-peach text-peach-text"
            }`}
          >
            <p className="font-semibold">{notice.title}</p>
            <p className="mt-1">{notice.body}</p>
          </div>
        ) : null}

        {!config.configured ? (
          <div className="space-y-3">
            <p className="text-base font-semibold text-ink">Samsara not configured</p>
            <p className="text-sm leading-relaxed text-ink-muted">
              For Luke: create an OAuth app in Samsara (Settings → OAuth 2.0 Apps), then add these
              on Vercel and redeploy. Demo login and CSV keep working without them.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
              <li>
                <code className="text-ink">SAMSARA_CLIENT_ID</code>
              </li>
              <li>
                <code className="text-ink">SAMSARA_CLIENT_SECRET</code>
              </li>
              <li>
                <code className="text-ink">SAMSARA_REDIRECT_URI</code> —{" "}
                <span className="break-all">{config.redirectUri}</span>
              </li>
            </ul>
            <p className="text-sm text-ink-muted">
              Full steps are in the README. Until then, add trucks on{" "}
              <Link href="/fleet" className="font-semibold text-teal">
                Fleet
              </Link>
              .
            </p>
          </div>
        ) : setting.connected ? (
          <div className="space-y-5">
            <div>
              <p className="text-base font-semibold text-ink">
                Connected
                {setting.lastSyncAt ? ` · last sync ${formatWhen(setting.lastSyncAt)}` : " · not synced yet"}
              </p>
              {setting.lastSyncSummary ? (
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{setting.lastSyncSummary}</p>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  Live GPS and hours feed the same truck list Today uses.
                </p>
              )}
            </div>
            {setting.lastSyncError ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{setting.lastSyncError}</p>
            ) : null}
            <SamsaraActions connected canWrite={canWrite} />
            <p className="text-xs leading-relaxed text-ink-faint">
              {persistKind === "local-file"
                ? "This computer keeps the connection after a restart (encrypted). The truck list is still in memory — tap Sync now if the fleet looks like sample data again."
                : "On this demo host a cold start can drop the connection. Connect again if that happens. Production should store encrypted tokens in a database."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-ink-muted">
              Nothing is connected yet. CSV and the sample fleet still work offline.
            </p>
            {setting.lastSyncError ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{setting.lastSyncError}</p>
            ) : null}
            <SamsaraActions connected={false} canWrite={canWrite} />
          </div>
        )}
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
