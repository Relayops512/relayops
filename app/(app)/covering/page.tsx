import { auth, isDispatcher } from "@/lib/auth";
import { getCoveringBoard } from "@/lib/queries";
import { AppHeader } from "@/components/AppHeader";
import { CoveringBoard } from "@/components/CoveringBoard";

export default async function CoveringPage() {
  const session = await auth();
  const canWrite = isDispatcher(session?.user.role);
  const { active, done, isDemoFleet } = await getCoveringBoard();

  return (
    <div>
      <AppHeader
        title="Covering"
        subtitle="Assigned loads stay here with the truck and driver until they’re complete."
        demo={isDemoFleet}
      />

      <p className="mb-6 text-sm text-ink-muted">
        {active.length === 0
          ? done.length === 0
            ? "Nothing assigned yet."
            : `${done.length} complete.`
          : `${active.length} covering${done.length ? ` · ${done.length} complete` : ""}`}
      </p>

      <CoveringBoard active={active} done={done} canWrite={canWrite} />
    </div>
  );
}
