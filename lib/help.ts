/** Dispatcher quick start — one source for the in-app Help page and shareable markdown. */

export const HELP_PATH = "/help";
export const HELP_MARKDOWN_PATH = "/help.md";

export const HELP_TITLE = "Quick start";
export const HELP_SUBTITLE = "Cover loads with the best available truck.";

export const HELP_DAY = {
  heading: "How to run a day",
  steps: [
    {
      label: "Sign in",
      detail: "Use the dispatcher account. Today opens first.",
    },
    {
      label: "Today",
      detail: "Open loads, the best available truck, and a one-line why.",
    },
    {
      label: "Assign",
      detail:
        "Puts that truck on the load. Assigned loads stay on Covering. Other trucks is there if you need someone else — add a short note.",
    },
    {
      label: "New load",
      detail: "When freight comes in: pickup, delivery, window, trailer.",
    },
    {
      label: "Fleet CSV",
      detail:
        "When the truck list changes, upload or paste a CSV on Fleet. Matching updates immediately.",
    },
  ],
} as const;

export const HELP_FIRST_TIME = {
  heading: "First-time setup (once)",
  paragraphs: [
    "The first visit offers a skippable walkthrough: add trucks, cover a load, then Assign. You can skip and keep the sample fleet.",
    "If you already have a spreadsheet, go to Fleet and use Upload fleet CSV (or paste). Replace swaps the list. Merge updates by truck number.",
  ],
} as const;

export const HELP_WHERE = {
  heading: "Where things live",
  rows: [
    { place: "Today", what: "Loads that need cover. Assign the recommended truck." },
    { place: "Covering", what: "Assigned loads — truck, driver, and status until complete." },
    { place: "New load", what: "Lane, appointment, trailer, and weight." },
    { place: "Fleet", what: "Who’s ready. Add a few trucks or upload a CSV." },
    {
      place: "Setup",
      what: "Samsara later. Fairness tools sit under Advanced, off by default.",
    },
  ],
} as const;

export const HELP_TIPS = {
  heading: "Tips",
  items: [
    "If the board looks stale, hard-refresh the page.",
    "On the demo host, an uploaded fleet can reset to sample trucks after a cold start. Paste the CSV again.",
    "Fairness tools live in Setup → Advanced and stay off unless you turn them on.",
    "Samsara (live GPS and HOS) is later. This pilot runs on the trucks you add in Fleet.",
  ],
} as const;

export function helpMarkdown(): string {
  const steps = HELP_DAY.steps
    .map((step, i) => `${i + 1}. **${step.label}** — ${step.detail}`)
    .join("\n");
  const rows = [
    "| Place | What it’s for |",
    "| --- | --- |",
    ...HELP_WHERE.rows.map((row) => `| ${row.place} | ${row.what} |`),
  ].join("\n");
  const tips = HELP_TIPS.items.map((item) => `- ${item}`).join("\n");

  return [
    `# RelayOps ${HELP_TITLE.toLowerCase()}`,
    "",
    HELP_SUBTITLE,
    "",
    `## ${HELP_DAY.heading}`,
    "",
    steps,
    "",
    `## ${HELP_FIRST_TIME.heading}`,
    "",
    HELP_FIRST_TIME.paragraphs.join("\n\n"),
    "",
    `## ${HELP_WHERE.heading}`,
    "",
    rows,
    "",
    `## ${HELP_TIPS.heading}`,
    "",
    tips,
    "",
  ].join("\n");
}
