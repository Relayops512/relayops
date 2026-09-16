import type { Metadata } from "next";
import { HelpContent } from "@/components/HelpContent";
import { HELP_SUBTITLE, HELP_TITLE } from "@/lib/help";

export const metadata: Metadata = {
  title: `${HELP_TITLE} · RelayOps`,
  description: HELP_SUBTITLE,
};

export default function HelpPage() {
  return <HelpContent />;
}
