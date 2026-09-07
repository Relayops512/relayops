import { auth, isDispatcher } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { NewLoadForm } from "@/components/NewLoadForm";

export default async function NewLoadPage() {
  const session = await auth();
  const canWrite = isDispatcher(session?.user.role);

  return (
    <div>
      <AppHeader
        title="New load"
        subtitle="Pickup, delivery, windows, trailer, and weight. Matching runs from these fields."
        canWrite={canWrite}
      />
      {canWrite ? (
        <NewLoadForm />
      ) : (
        <div className="card p-6 text-sm text-ink-muted">
          Viewer accounts cannot create loads. Ask a dispatcher to intake this freight.
        </div>
      )}
    </div>
  );
}
