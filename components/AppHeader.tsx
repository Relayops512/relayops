import Link from "next/link";
import { DemoBadge } from "./DemoBadge";
import { syncSamsaraAction } from "@/lib/actions";

export function AppHeader({
  title,
  subtitle,
  canWrite,
}: {
  title: string;
  subtitle: string;
  canWrite: boolean;
}) {
  return (
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal">RelayOps</p>
          <DemoBadge />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canWrite ? (
          <form action={syncSamsaraAction}>
            <button type="submit" className="btn-ghost">
              Sync Samsara
            </button>
          </form>
        ) : (
          <span className="btn-ghost opacity-60">Sync Samsara</span>
        )}
        {canWrite ? (
          <Link href="/loads/new" className="btn-primary">
            Add load
          </Link>
        ) : (
          <span className="btn-primary opacity-50">Add load</span>
        )}
      </div>
    </header>
  );
}
