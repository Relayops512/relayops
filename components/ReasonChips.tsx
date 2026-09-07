import type { ReasonChip } from "@/lib/matching";

const TONE: Record<ReasonChip["tone"], string> = {
  good: "bg-sage text-sage-text",
  warn: "bg-peach text-peach-text",
  bad: "bg-red-100 text-red-800",
  neutral: "bg-teal-soft text-teal",
};

export function ReasonChips({ reasons }: { reasons: ReasonChip[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {reasons.map((reason) => (
        <span key={reason.label} className={`chip ${TONE[reason.tone]}`}>
          {reason.label}
        </span>
      ))}
    </div>
  );
}
