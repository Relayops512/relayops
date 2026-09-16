import Link from "next/link";
import {
  HELP_DAY,
  HELP_FIRST_TIME,
  HELP_MARKDOWN_PATH,
  HELP_SUBTITLE,
  HELP_TIPS,
  HELP_TITLE,
  HELP_WHERE,
} from "@/lib/help";
import { PrintButton } from "./PrintButton";

export function HelpContent() {
  return (
    <article className="help-print">
      <header className="mb-10">
        <p className="text-sm font-semibold text-teal">Help</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{HELP_TITLE}</h1>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-ink-muted">{HELP_SUBTITLE}</p>
        <div className="mt-5 flex flex-wrap gap-2 print:hidden">
          <PrintButton />
          <a href={HELP_MARKDOWN_PATH} className="btn-ghost">
            Markdown
          </a>
        </div>
      </header>

      <section className="card p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">{HELP_DAY.heading}</h2>
        <ol className="mt-5 space-y-4">
          {HELP_DAY.steps.map((step, index) => (
            <li key={step.label} className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-soft text-sm font-semibold text-teal">
                {index + 1}
              </span>
              <div>
                <p className="font-semibold text-ink">{step.label}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card mt-4 p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">{HELP_FIRST_TIME.heading}</h2>
        {HELP_FIRST_TIME.paragraphs.map((paragraph) => (
          <p key={paragraph} className="mt-3 text-sm leading-relaxed text-ink-muted">
            {paragraph}
          </p>
        ))}
      </section>

      <section className="card mt-4 overflow-hidden p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">{HELP_WHERE.heading}</h2>
        <table className="mt-5 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-ink-muted">
              <th className="pb-2 pr-4 font-medium">Place</th>
              <th className="pb-2 font-medium">What it’s for</th>
            </tr>
          </thead>
          <tbody>
            {HELP_WHERE.rows.map((row) => (
              <tr key={row.place} className="border-b border-line/70 last:border-0">
                <th className="w-28 py-3 pr-4 align-top font-semibold text-ink">{row.place}</th>
                <td className="py-3 leading-relaxed text-ink-muted">{row.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card mt-4 p-6 sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight">{HELP_TIPS.heading}</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-muted">
          {HELP_TIPS.items.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-center text-sm text-ink-faint print:hidden">
        Back to{" "}
        <Link href="/board" className="font-semibold text-teal">
          Today
        </Link>
        .
      </p>
    </article>
  );
}
