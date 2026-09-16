import Link from "next/link";
import { auth, isDispatcher } from "@/lib/auth";
import { getDashboard } from "@/lib/queries";
import { AppHeader } from "@/components/AppHeader";
import { TodayBoard } from "@/components/TodayBoard";
import { Onboarding } from "@/components/Onboarding";
import { shouldShowOnboarding } from "@/lib/onboarding";

export default async function BoardPage() {
  const session = await auth();
  const canWrite = isDispatcher(session?.user.role);
  const { items, kpis, isDemoFleet } = await getDashboard();
  const showOnboarding = Boolean(
    canWrite && session?.user.id && (await shouldShowOnboarding(session.user.id)),
  );

  return (
    <div>
      {showOnboarding ? <Onboarding sample={items[0] ?? null} isDemoFleet={isDemoFleet} /> : null}

      <AppHeader
        title="Today"
        subtitle="Loads that need cover, with the best available truck."
        demo={isDemoFleet}
      />

      <p className="mb-6 text-sm text-ink-muted">
        {kpis.openLoads === 0
          ? "Nothing open."
          : `${kpis.openLoads} open · ${kpis.needCover} need cover soon · ${kpis.legalNow} trucks ready`}
      </p>

      <TodayBoard items={items} canWrite={canWrite} />

      {isDemoFleet && canWrite ? (
        <p className="mt-8 text-center text-sm text-ink-faint">
          Sample fleet.{" "}
          <Link href="/fleet" className="font-semibold text-teal">
            Add your trucks
          </Link>{" "}
          when you&apos;re ready.
        </p>
      ) : null}
    </div>
  );
}
