import { auth, isDispatcher } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { NewLoadForm } from "@/components/NewLoadForm";
import { store } from "@/lib/store";

export default async function NewLoadPage() {
  const session = await auth();
  const canWrite = isDispatcher(session?.user.role);
  const demo = store.isDemoFleet();

  return (
    <div>
      <AppHeader
        title="New load"
        subtitle="Lane, appointment, trailer, and hazmat if the freight needs it."
        demo={demo}
      />
      {canWrite ? (
        <NewLoadForm />
      ) : (
        <div className="card px-6 py-16 text-center text-sm text-ink-muted">
          Viewer accounts can&apos;t add loads.
        </div>
      )}
    </div>
  );
}
