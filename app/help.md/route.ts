import { helpMarkdown } from "@/lib/help";

export function GET() {
  return new Response(helpMarkdown(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
