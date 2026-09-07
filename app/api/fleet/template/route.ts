import { FLEET_CSV_TEMPLATE } from "@/lib/fleet-csv";

export function GET() {
  return new Response(FLEET_CSV_TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="relayops-fleet-template.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
