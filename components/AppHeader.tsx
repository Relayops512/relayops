import { DemoBadge } from "./DemoBadge";

export function AppHeader({
  title,
  subtitle,
  demo = false,
}: {
  title: string;
  subtitle?: string;
  demo?: boolean;
}) {
  return (
    <header className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <p className="text-sm font-semibold text-teal">RelayOps</p>
        {demo ? <DemoBadge /> : null}
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      {subtitle ? <p className="mt-2 max-w-xl text-base leading-relaxed text-ink-muted">{subtitle}</p> : null}
    </header>
  );
}
