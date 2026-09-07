import { PrismaClient, TrailerType, TruckReadiness, LoadPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type City = { city: string; state: string; lat: number; lng: number };

const C: Record<string, City> = {
  CHI: { city: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298 },
  IND: { city: "Indianapolis", state: "IN", lat: 39.7684, lng: -86.1581 },
  ATL: { city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388 },
  MEM: { city: "Memphis", state: "TN", lat: 35.1495, lng: -90.049 },
  DAL: { city: "Dallas", state: "TX", lat: 32.7767, lng: -96.797 },
  KCY: { city: "Kansas City", state: "MO", lat: 39.0997, lng: -94.5786 },
  NSH: { city: "Nashville", state: "TN", lat: 36.1627, lng: -86.7816 },
  LOU: { city: "Louisville", state: "KY", lat: 38.2527, lng: -85.7585 },
  STL: { city: "St. Louis", state: "MO", lat: 38.627, lng: -90.1994 },
  CIN: { city: "Cincinnati", state: "OH", lat: 39.1031, lng: -84.512 },
  CMH: { city: "Columbus", state: "OH", lat: 39.9612, lng: -82.9988 },
  DET: { city: "Detroit", state: "MI", lat: 42.3314, lng: -83.0458 },
  HOU: { city: "Houston", state: "TX", lat: 29.7604, lng: -95.3698 },
  JAX: { city: "Jacksonville", state: "FL", lat: 30.3322, lng: -81.6557 },
  CLT: { city: "Charlotte", state: "NC", lat: 35.2271, lng: -80.8431 },
  CLE: { city: "Cleveland", state: "OH", lat: 41.4993, lng: -81.6944 },
  TUL: { city: "Tulsa", state: "OK", lat: 36.154, lng: -95.9928 },
  LIT: { city: "Little Rock", state: "AR", lat: 34.7465, lng: -92.2896 },
};

function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 3600 * 1000);
}

async function main() {
  const force = process.argv.includes("--force");
  const existing = await prisma.user.count();
  if (existing > 0 && !force) {
    console.log("RelayOps already seeded — skip (use --force to reset).");
    return;
  }

  if (force) {
    await prisma.auditEvent.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.load.deleteMany();
    await prisma.truck.deleteMany();
    await prisma.integrationSetting.deleteMany();
    await prisma.user.deleteMany();
  }

  const dispatcherHash = await bcrypt.hash("RelayOps2026!", 10);
  const viewerHash = await bcrypt.hash("Viewer2026!", 10);

  const dispatcher = await prisma.user.create({
    data: {
      email: "dispatcher@relayops.demo",
      passwordHash: dispatcherHash,
      name: "Dana Ortiz",
      role: "DISPATCHER",
    },
  });
  const dispatcher2 = await prisma.user.create({
    data: {
      email: "jordan@relayops.demo",
      passwordHash: dispatcherHash,
      name: "Jordan Hale",
      role: "DISPATCHER",
    },
  });
  await prisma.user.create({
    data: {
      email: "viewer@relayops.demo",
      passwordHash: viewerHash,
      name: "Sam Keene",
      role: "VIEWER",
    },
  });

  const trucks: {
    unitNumber: string;
    driverName: string;
    loc: City;
    hosDriveMinutes: number;
    hosDutyMinutes: number;
    trailerType: TrailerType;
    mpg: number;
    readiness: TruckReadiness;
    weeklyLoadCount: number;
    fuelGallons: number;
  }[] = [
    { unitNumber: "184", driverName: "Marcus Hill", loc: C.IND, hosDriveMinutes: 525, hosDutyMinutes: 605, trailerType: "DRY_VAN", mpg: 7.6, readiness: "LEGAL_NOW", weeklyLoadCount: 6, fuelGallons: 88 },
    { unitNumber: "191", driverName: "Elena Ruiz", loc: C.LOU, hosDriveMinutes: 480, hosDutyMinutes: 590, trailerType: "DRY_VAN", mpg: 7.2, readiness: "LEGAL_NOW", weeklyLoadCount: 3, fuelGallons: 74 },
    { unitNumber: "176", driverName: "Theo Jackson", loc: C.CIN, hosDriveMinutes: 610, hosDutyMinutes: 680, trailerType: "DRY_VAN", mpg: 7.8, readiness: "LEGAL_NOW", weeklyLoadCount: 2, fuelGallons: 96 },
    { unitNumber: "203", driverName: "Priya Shah", loc: C.CHI, hosDriveMinutes: 390, hosDutyMinutes: 510, trailerType: "REEFER", mpg: 6.9, readiness: "LEGAL_NOW", weeklyLoadCount: 4, fuelGallons: 70 },
    { unitNumber: "158", driverName: "Owen Blake", loc: C.STL, hosDriveMinutes: 540, hosDutyMinutes: 640, trailerType: "FLATBED", mpg: 6.4, readiness: "LEGAL_NOW", weeklyLoadCount: 3, fuelGallons: 102 },
    { unitNumber: "210", driverName: "Maya Chen", loc: C.NSH, hosDriveMinutes: 455, hosDutyMinutes: 560, trailerType: "DRY_VAN", mpg: 7.5, readiness: "LEGAL_NOW", weeklyLoadCount: 2, fuelGallons: 81 },
    { unitNumber: "147", driverName: "Chris Nolan", loc: C.MEM, hosDriveMinutes: 70, hosDutyMinutes: 140, trailerType: "DRY_VAN", mpg: 7.1, readiness: "HOS_BLOCKED", weeklyLoadCount: 5, fuelGallons: 40 },
    { unitNumber: "221", driverName: "Ava Brooks", loc: C.ATL, hosDriveMinutes: 500, hosDutyMinutes: 620, trailerType: "REEFER", mpg: 6.8, readiness: "LEGAL_NOW", weeklyLoadCount: 3, fuelGallons: 77 },
    { unitNumber: "165", driverName: "Luis Ortega", loc: C.DAL, hosDriveMinutes: 430, hosDutyMinutes: 540, trailerType: "DRY_VAN", mpg: 7.3, readiness: "LEGAL_NOW", weeklyLoadCount: 4, fuelGallons: 85 },
    { unitNumber: "198", driverName: "Hannah Cole", loc: C.KCY, hosDriveMinutes: 560, hosDutyMinutes: 670, trailerType: "FLATBED", mpg: 6.5, readiness: "LEGAL_NOW", weeklyLoadCount: 1, fuelGallons: 110 },
    { unitNumber: "132", driverName: "Ben Carter", loc: C.DET, hosDriveMinutes: 410, hosDutyMinutes: 500, trailerType: "DRY_VAN", mpg: 7.4, readiness: "LEGAL_NOW", weeklyLoadCount: 3, fuelGallons: 69 },
    { unitNumber: "244", driverName: "Sofia Grant", loc: C.CMH, hosDriveMinutes: 495, hosDutyMinutes: 600, trailerType: "DRY_VAN", mpg: 7.7, readiness: "LEGAL_NOW", weeklyLoadCount: 2, fuelGallons: 92 },
    { unitNumber: "109", driverName: "Derek Walsh", loc: C.CLE, hosDriveMinutes: 360, hosDutyMinutes: 450, trailerType: "REEFER", mpg: 6.7, readiness: "LEGAL_NOW", weeklyLoadCount: 5, fuelGallons: 61 },
    { unitNumber: "255", driverName: "Nina Patel", loc: C.CLT, hosDriveMinutes: 520, hosDutyMinutes: 630, trailerType: "DRY_VAN", mpg: 7.5, readiness: "LEGAL_NOW", weeklyLoadCount: 2, fuelGallons: 84 },
    { unitNumber: "118", driverName: "Ty Robinson", loc: C.HOU, hosDriveMinutes: 440, hosDutyMinutes: 530, trailerType: "FLATBED", mpg: 6.3, readiness: "ON_LOAD", weeklyLoadCount: 4, fuelGallons: 55 },
    { unitNumber: "273", driverName: "Grace Kim", loc: C.JAX, hosDriveMinutes: 575, hosDutyMinutes: 690, trailerType: "REEFER", mpg: 6.9, readiness: "LEGAL_NOW", weeklyLoadCount: 1, fuelGallons: 99 },
    { unitNumber: "140", driverName: "Andre Wells", loc: C.TUL, hosDriveMinutes: 400, hosDutyMinutes: 490, trailerType: "DRY_VAN", mpg: 7.2, readiness: "LEGAL_NOW", weeklyLoadCount: 3, fuelGallons: 73 },
    { unitNumber: "186", driverName: "Riley Fox", loc: C.LIT, hosDriveMinutes: 50, hosDutyMinutes: 90, trailerType: "DRY_VAN", mpg: 7.0, readiness: "HOS_BLOCKED", weeklyLoadCount: 6, fuelGallons: 33 },
    { unitNumber: "229", driverName: "Camila Ortiz", loc: C.IND, hosDriveMinutes: 610, hosDutyMinutes: 700, trailerType: "REEFER", mpg: 7.0, readiness: "LEGAL_NOW", weeklyLoadCount: 2, fuelGallons: 95 },
    { unitNumber: "151", driverName: "Jonah Reed", loc: C.STL, hosDriveMinutes: 470, hosDutyMinutes: 580, trailerType: "DRY_VAN", mpg: 7.6, readiness: "LEGAL_NOW", weeklyLoadCount: 3, fuelGallons: 80 },
    { unitNumber: "262", driverName: "Lena Brooks", loc: C.NSH, hosDriveMinutes: 0, hosDutyMinutes: 0, trailerType: "FLATBED", mpg: 6.4, readiness: "MAINTENANCE", weeklyLoadCount: 1, fuelGallons: 20 },
    { unitNumber: "174", driverName: "Micah Stone", loc: C.CHI, hosDriveMinutes: 530, hosDutyMinutes: 640, trailerType: "DRY_VAN", mpg: 7.9, readiness: "LEGAL_NOW", weeklyLoadCount: 4, fuelGallons: 87 },
  ];

  await prisma.truck.createMany({
    data: trucks.map((t) => ({
      unitNumber: t.unitNumber,
      driverName: t.driverName,
      lat: t.loc.lat + (Math.random() - 0.5) * 0.12,
      lng: t.loc.lng + (Math.random() - 0.5) * 0.12,
      city: t.loc.city,
      state: t.loc.state,
      hosDriveMinutes: t.hosDriveMinutes,
      hosDutyMinutes: t.hosDutyMinutes,
      trailerType: t.trailerType,
      mpg: t.mpg,
      readiness: t.readiness,
      weeklyLoadCount: t.weeklyLoadCount,
      fuelGallons: t.fuelGallons,
      lastPingAt: new Date(),
    })),
  });

  const loads: {
    reference: string;
    customer: string;
    pickup: City;
    drop: City;
    pickupIn: [number, number];
    dropIn: [number, number];
    trailerType: TrailerType;
    weightLbs: number;
    notes: string;
    priority: LoadPriority;
    status: "OPEN" | "ASSIGNED";
  }[] = [
    { reference: "RO-4412", customer: "Cargill Ingredients", pickup: C.IND, drop: C.CHI, pickupIn: [4, 12], dropIn: [20, 30], trailerType: "DRY_VAN", weightLbs: 41200, notes: "Appointment at Addison DC, door 14.", priority: "HIGH", status: "OPEN" },
    { reference: "RO-4418", customer: "Nucor Steel", pickup: C.STL, drop: C.DET, pickupIn: [6, 14], dropIn: [28, 38], trailerType: "FLATBED", weightLbs: 45500, notes: "Tarps required. Mill closes at 21:00.", priority: "HIGH", status: "OPEN" },
    { reference: "RO-4420", customer: "Kroger Fresh", pickup: C.NSH, drop: C.ATL, pickupIn: [3, 9], dropIn: [16, 24], trailerType: "REEFER", weightLbs: 38900, notes: "Keep 34°F. Backhaul produce.", priority: "HIGH", status: "OPEN" },
    { reference: "RO-4425", customer: "Home Depot Supply", pickup: C.LOU, drop: C.CMH, pickupIn: [8, 18], dropIn: [26, 36], trailerType: "DRY_VAN", weightLbs: 36100, notes: "Live unload, 90 min.", priority: "STANDARD", status: "OPEN" },
    { reference: "RO-4431", customer: "Pepsi Midwest", pickup: C.CIN, drop: C.CLE, pickupIn: [5, 13], dropIn: [18, 28], trailerType: "DRY_VAN", weightLbs: 42800, notes: "No touch freight.", priority: "STANDARD", status: "OPEN" },
    { reference: "RO-4436", customer: "Tyson Foods", pickup: C.MEM, drop: C.DAL, pickupIn: [10, 20], dropIn: [30, 42], trailerType: "REEFER", weightLbs: 40100, notes: "USDA seal. Pre-cool 30 min.", priority: "HIGH", status: "OPEN" },
    { reference: "RO-4440", customer: "Grainger", pickup: C.CHI, drop: C.KCY, pickupIn: [7, 16], dropIn: [24, 34], trailerType: "DRY_VAN", weightLbs: 29400, notes: "Drop trailer preferred.", priority: "STANDARD", status: "OPEN" },
    { reference: "RO-4444", customer: "Caterpillar", pickup: C.TUL, drop: C.STL, pickupIn: [9, 20], dropIn: [28, 40], trailerType: "FLATBED", weightLbs: 47200, notes: "Over-dimensional width 8'6. Pilot not required.", priority: "STANDARD", status: "OPEN" },
    { reference: "RO-4451", customer: "Amazon XL", pickup: C.ATL, drop: C.CLT, pickupIn: [2, 8], dropIn: [12, 20], trailerType: "DRY_VAN", weightLbs: 31800, notes: "Relay sort center. FCFS.", priority: "STANDARD", status: "OPEN" },
    { reference: "RO-4457", customer: "Sysco", pickup: C.HOU, drop: C.DAL, pickupIn: [11, 22], dropIn: [26, 36], trailerType: "REEFER", weightLbs: 37600, notes: "Multi-temp. Rear 0°F.", priority: "STANDARD", status: "OPEN" },
    { reference: "RO-4462", customer: "John Deere", pickup: C.LIT, drop: C.MEM, pickupIn: [6, 15], dropIn: [16, 26], trailerType: "FLATBED", weightLbs: 44100, notes: "Farm equipment crates.", priority: "STANDARD", status: "OPEN" },
    { reference: "RO-4468", customer: "Procter & Gamble", pickup: C.CIN, drop: C.IND, pickupIn: [4, 11], dropIn: [10, 18], trailerType: "DRY_VAN", weightLbs: 35200, notes: "Short haul, good reset load.", priority: "STANDARD", status: "OPEN" },
    { reference: "RO-4475", customer: "Walmart DC", pickup: C.ATL, drop: C.JAX, pickupIn: [14, 26], dropIn: [30, 42], trailerType: "DRY_VAN", weightLbs: 39900, notes: "Tomorrow planning — flexible window.", priority: "STANDARD", status: "OPEN" },
    { reference: "RO-4401", customer: "Ford Parts", pickup: C.DET, drop: C.CLE, pickupIn: [-18, -10], dropIn: [2, 10], trailerType: "DRY_VAN", weightLbs: 28700, notes: "Already rolling.", priority: "STANDARD", status: "ASSIGNED" },
    { reference: "RO-4394", customer: "Lowes Regional", pickup: C.CLT, drop: C.ATL, pickupIn: [-30, -20], dropIn: [-8, 2], trailerType: "DRY_VAN", weightLbs: 33400, notes: "Assigned yesterday.", priority: "STANDARD", status: "ASSIGNED" },
  ];

  for (const l of loads) {
    await prisma.load.create({
      data: {
        reference: l.reference,
        customer: l.customer,
        pickupCity: l.pickup.city,
        pickupState: l.pickup.state,
        pickupLat: l.pickup.lat,
        pickupLng: l.pickup.lng,
        pickupWindowStart: hoursFromNow(l.pickupIn[0]),
        pickupWindowEnd: hoursFromNow(l.pickupIn[1]),
        deliveryCity: l.drop.city,
        deliveryState: l.drop.state,
        deliveryLat: l.drop.lat,
        deliveryLng: l.drop.lng,
        deliveryWindowStart: hoursFromNow(l.dropIn[0]),
        deliveryWindowEnd: hoursFromNow(l.dropIn[1]),
        trailerType: l.trailerType,
        weightLbs: l.weightLbs,
        notes: l.notes,
        priority: l.priority,
        status: l.status,
        source: "demo",
      },
    });
  }

  const assignedLoads = await prisma.load.findMany({ where: { status: "ASSIGNED" } });
  const ty = await prisma.truck.findUniqueOrThrow({ where: { unitNumber: "118" } });
  const marcus = await prisma.truck.findUniqueOrThrow({ where: { unitNumber: "184" } });

  if (assignedLoads[0]) {
    await prisma.assignment.create({
      data: {
        loadId: assignedLoads[0].id,
        truckId: ty.id,
        assignedById: dispatcher.id,
        score: 81.4,
        reasonsJson: JSON.stringify([
          { label: "Legal now", tone: "good" },
          { label: "42 mi deadhead", tone: "good" },
        ]),
        isOverride: false,
      },
    });
  }
  if (assignedLoads[1]) {
    await prisma.assignment.create({
      data: {
        loadId: assignedLoads[1].id,
        truckId: marcus.id,
        assignedById: dispatcher2.id,
        score: 64.2,
        reasonsJson: JSON.stringify([
          { label: "Heavy week — fairness", tone: "warn" },
          { label: "118 mi deadhead", tone: "warn" },
        ]),
        isOverride: true,
        overrideReason: "Shipper requested Marcus after last week's on-time delivery.",
        topTruckId: (await prisma.truck.findUniqueOrThrow({ where: { unitNumber: "255" } })).id,
      },
    });
  }

  await prisma.auditEvent.createMany({
    data: [
      {
        kind: "ASSIGNMENT",
        actorId: dispatcher.id,
        message: "Dana Ortiz assigned RO-4401 to Truck 118 (Ty Robinson) at score 81.4.",
      },
      {
        kind: "OVERRIDE",
        actorId: dispatcher2.id,
        message:
          "Jordan Hale overrode the recommended truck for RO-4394 → Truck 184 (Marcus Hill). Reason: Shipper requested Marcus after last week's on-time delivery.",
      },
      {
        kind: "POLICY_FLAG",
        actorId: null,
        message:
          "Two dispatchers have override rates above 10%, which suggests favoritism or missing business rules.",
        metaJson: JSON.stringify({ threshold: 0.1, flagged: ["Jordan Hale", "Dana Ortiz"] }),
      },
      {
        kind: "POLICY_FLAG",
        actorId: null,
        message:
          "Marcus Hill: 6 loads, Elena Ruiz: 3 loads, Theo Jackson: 2 loads. Deadhead imbalance exceeded threshold.",
        metaJson: JSON.stringify({ type: "load_balance" }),
      },
      {
        kind: "SAMSARA_SYNC",
        actorId: dispatcher.id,
        message: "Dana Ortiz ran a demo Samsara sync. Live API keys are not required for this pilot.",
      },
    ],
  });

  await prisma.integrationSetting.create({
    data: {
      id: "samsara",
      provider: "samsara",
      enabled: false,
      demoMode: true,
      orgId: "relayops-midwest-demo",
      apiTokenHint: "",
      lastSyncAt: new Date(),
      notes: "Pilot uses seeded demo fleet. Live Samsara pull is stubbed. Motive and Geotab connectors are planned next.",
    },
  });

  console.log("Seeded RelayOps demo fleet, loads, and accounts.");
  console.log("  Dispatcher: dispatcher@relayops.demo / RelayOps2026!");
  console.log("  Viewer:     viewer@relayops.demo / Viewer2026!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
