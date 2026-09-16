import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loginAction } from "@/lib/login-actions";

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
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold text-teal">RelayOps</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
            Cover loads with the best available truck
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">
            A calm dispatch board for today&apos;s freight.
          </p>
        </div>
        <form action={loginAction} className="card p-8">
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
            className="field mb-5"
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
            className="field mb-6"
            autoComplete="current-password"
          />
          {params.error ? (
            <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
              Sign-in failed. Check the demo credentials in the README.
            </p>
          ) : null}
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>
        <p className="mt-8 text-center text-sm leading-relaxed text-ink-muted">
          Dispatcher: dispatcher@relayops.demo / RelayOps2026!
          <br />
          Viewer: viewer@relayops.demo / Viewer2026!
        </p>
      </div>
    </div>
  );
}
