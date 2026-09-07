export function KpiCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{note}</p>
    </article>
  );
}
