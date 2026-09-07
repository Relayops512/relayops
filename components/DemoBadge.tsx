export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-teal/20 bg-teal-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-teal" />
      Demo data
    </span>
  );
}
