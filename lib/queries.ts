import { prisma } from "@/lib/prisma";
import { estimateDeadhead, rankTrucks } from "@/lib/matching";

export async function getDashboard() {
  const [loads, trucks, assignments] = await Promise.all([
    prisma.load.findMany({
      where: { status: "OPEN" },
      orderBy: [{ priority: "desc" }, { pickupWindowStart: "asc" }],
    }),
    prisma.truck.findMany({ orderBy: { unitNumber: "asc" } }),
    prisma.assignment.findMany({
      include: { assignedBy: true },
    }),
  ]);

  const legalNow = trucks.filter((t) => t.readiness === "LEGAL_NOW").length;
  const hosBlocked = trucks.filter((t) => t.readiness === "HOS_BLOCKED").length;
  const highPriority = loads.filter((l) => l.priority === "HIGH").length;

  const deadheads: number[] = [];
  for (const load of loads) {
    const eligible = trucks.filter((t) => t.readiness === "LEGAL_NOW" && t.trailerType === load.trailerType);
    if (eligible.length === 0) continue;
    const nearest = eligible
      .map((t) => estimateDeadhead(t, load))
      .sort((a, b) => a - b)[0];
    if (nearest != null) deadheads.push(nearest);
  }
  const avgDeadhead =
    deadheads.length === 0 ? 0 : deadheads.reduce((a, b) => a + b, 0) / deadheads.length;

  const overrideCount = assignments.filter((a) => a.isOverride).length;
  const overridePct = assignments.length === 0 ? 0 : (overrideCount / assignments.length) * 100;

  const byDispatcher = new Map<string, { name: string; total: number; overrides: number }>();
  for (const a of assignments) {
    const name = a.assignedBy.name;
    const row = byDispatcher.get(name) ?? { name, total: 0, overrides: 0 };
    row.total += 1;
    if (a.isOverride) row.overrides += 1;
    byDispatcher.set(name, row);
  }
  const overPolicy = [...byDispatcher.values()].filter((d) => d.total > 0 && d.overrides / d.total > 0.1);

  return {
    loads,
    trucks,
    kpis: {
      openLoads: loads.length,
      highPriority,
      legalNow,
      hosBlocked,
      avgDeadhead,
      overridePct,
      overPolicyCount: overPolicy.length,
    },
  };
}

export async function getLoadWithMatches(id: string) {
  const [load, trucks, assignment] = await Promise.all([
    prisma.load.findUnique({ where: { id } }),
    prisma.truck.findMany(),
    prisma.assignment.findFirst({
      where: { loadId: id },
      include: { truck: true, assignedBy: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!load) return null;
  const matches = rankTrucks(load, trucks);
  return { load, matches, assignment };
}

export async function getAuditData() {
  const [events, assignments, trucks] = await Promise.all([
    prisma.auditEvent.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.assignment.findMany({
      include: { load: true, truck: true, assignedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.truck.findMany({ orderBy: { weeklyLoadCount: "desc" } }),
  ]);

  const byDispatcher = new Map<string, { name: string; total: number; overrides: number }>();
  for (const a of assignments) {
    const name = a.assignedBy.name;
    const row = byDispatcher.get(name) ?? { name, total: 0, overrides: 0 };
    row.total += 1;
    if (a.isOverride) row.overrides += 1;
    byDispatcher.set(name, row);
  }

  const avgLoads =
    trucks.length === 0 ? 0 : trucks.reduce((s, t) => s + t.weeklyLoadCount, 0) / trucks.length;

  return {
    events,
    assignments,
    trucks,
    dispatchers: [...byDispatcher.values()],
    avgLoads,
  };
}
