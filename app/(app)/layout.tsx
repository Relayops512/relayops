import { redirect } from "next/navigation";
import { auth, isDispatcher } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { logoutAction } from "@/lib/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const write = isDispatcher(session.user.role);

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-4 pt-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between text-xs text-ink-muted">
          <p>
            Signed in as <span className="font-semibold text-ink">{session.user.name}</span>
            <span className="mx-1.5">·</span>
            {write ? "Dispatcher" : "Viewer (read-only)"}
          </p>
          <form action={logoutAction}>
            <button type="submit" className="font-semibold text-teal hover:underline">
              Sign out
            </button>
          </form>
        </div>
        <div className="flex-1">{children}</div>
        <BottomNav />
      </div>
    </div>
  );
}
