import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HELP_DAY,
  HELP_FIRST_TIME,
  HELP_SUBTITLE,
  HELP_TIPS,
  HELP_WHERE,
  helpMarkdown,
} from "./help";

const FORBIDDEN = "Dispatch without favorites";

describe("dispatcher quick start", () => {
  it("covers the five daily steps with current UI labels", () => {
    assert.deepEqual(
      HELP_DAY.steps.map((step) => step.label),
      ["Sign in", "Today", "Assign", "New load", "Fleet CSV"],
    );
    assert.match(HELP_DAY.heading, /how to run a day/i);
    assert.match(HELP_DAY.steps[2].detail, /Covering/);
  });

  it("maps Today, Covering, New load, Fleet, and Setup", () => {
    assert.deepEqual(
      HELP_WHERE.rows.map((row) => row.place),
      ["Today", "Covering", "New load", "Fleet", "Setup"],
    );
    assert.match(HELP_WHERE.rows[1].what, /Assigned loads/i);
    assert.match(HELP_WHERE.rows[4].what, /Advanced/i);
    assert.match(HELP_WHERE.rows[4].what, /off by default/i);
  });

  it("includes first-time setup and the short tips", () => {
    assert.match(HELP_FIRST_TIME.heading, /once/i);
    assert.match(HELP_FIRST_TIME.paragraphs.join(" "), /skippable/i);
    assert.match(HELP_FIRST_TIME.paragraphs.join(" "), /Upload fleet CSV/);
    const tips = HELP_TIPS.items.join(" ");
    assert.match(tips, /hard-refresh/i);
    assert.match(tips, /demo host/i);
    assert.match(tips, /cold start/i);
    assert.match(tips, /Setup → Advanced/);
    assert.match(tips, /Samsara/);
  });

  it("keeps the quiet cover-loads pitch and skips the old slogan", () => {
    const markdown = helpMarkdown();
    assert.equal(HELP_SUBTITLE, "Cover loads with the best available truck.");
    assert.doesNotMatch(markdown, new RegExp(FORBIDDEN));
    assert.doesNotMatch(JSON.stringify({ HELP_DAY, HELP_FIRST_TIME, HELP_WHERE, HELP_TIPS }), new RegExp(FORBIDDEN));
  });

  it("mirrors the shareable markdown doc", () => {
    const fromDisk = readFileSync(join(process.cwd(), "docs/dispatcher-quick-start.md"), "utf8");
    assert.equal(helpMarkdown(), fromDisk);
  });
});
