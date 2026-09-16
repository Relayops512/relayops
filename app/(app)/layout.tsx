import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, isDispatcher } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { logoutAction } from "@/lib/login-actions";
import { HELP_PATH } from "@/lib/help";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const write = isDispatcher(session.user.role);

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 pb-6 pt-8 sm:px-8">
        <div className="mb-8 flex items-center justify-between text-sm text-ink-muted print:hidden">
          <p>
            {session.user.name}
            <span className="mx-1.5 text-ink-faint">·</span>
            {write ? "Dispatcher" : "Viewer"}
          </p>
          <div className="flex items-center gap-4">
            <Link href={HELP_PATH} className="font-medium text-ink-muted hover:text-ink">
              Help
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="font-medium text-ink-muted hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="flex-1">{children}</div>
        <BottomNav />
      </div>
    </div>
  );
}
