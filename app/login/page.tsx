import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loginAction } from "@/lib/login-actions";
import { DemoBadge } from "@/components/DemoBadge";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/board");
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal">RelayOps</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Dispatch without favorites</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Rules-based load assignment by HOS, deadhead, fuel, and pickup window.
          </p>
          <div className="mt-3 flex justify-center">
            <DemoBadge />
          </div>
        </div>
        <form action={loginAction} className="card p-6">
          <input type="hidden" name="callbackUrl" value={params.callbackUrl ?? "/board"} />
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue="dispatcher@relayops.demo"
            className="field mb-4"
            autoComplete="username"
          />
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            defaultValue="RelayOps2026!"
            className="field mb-4"
            autoComplete="current-password"
          />
          {params.error ? (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
              Sign-in failed. Check the demo credentials in the README.
            </p>
          ) : null}
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-white/60 p-4 text-sm text-ink-muted">
          <p className="font-semibold text-ink">Company pilot accounts</p>
          <p className="mt-1">
            Dispatcher: <code className="text-ink">dispatcher@relayops.demo</code> /{" "}
            <code className="text-ink">RelayOps2026!</code>
          </p>
          <p>
            Viewer: <code className="text-ink">viewer@relayops.demo</code> /{" "}
            <code className="text-ink">Viewer2026!</code>
          </p>
        </div>
      </div>
    </div>
  );
}
