import { getSamsaraConfig } from "./config";
import type {
  SamsaraAssignment,
  SamsaraDriver,
  SamsaraGpsStat,
  SamsaraHosClock,
  SamsaraPull,
  SamsaraVehicle,
} from "./types";

type FetchLike = typeof fetch;

export class SamsaraHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "SamsaraHttpError";
  }
}

async function samsaraFetch(
  token: string,
  path: string,
  params: Record<string, string> | undefined,
  fetchImpl: FetchLike,
): Promise<{ data: unknown[]; pagination?: { hasNextPage?: boolean; endCursor?: string } }> {
  const { apiBase } = getSamsaraConfig();
  const url = new URL(path, `${apiBase}/`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  const response = await fetchImpl(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const json = (await response.json().catch(() => ({}))) as {
    data?: unknown[];
    pagination?: { hasNextPage?: boolean; endCursor?: string };
    message?: string;
  };
  if (!response.ok) {
    throw new SamsaraHttpError(response.status, json.message || `HTTP ${response.status}`);
  }
  return { data: Array.isArray(json.data) ? json.data : [], pagination: json.pagination };
}

async function paginate<T>(
  token: string,
  path: string,
  params: Record<string, string> | undefined,
  fetchImpl: FetchLike,
  optional = false,
): Promise<T[]> {
  const items: T[] = [];
  let after = "";
  for (let page = 0; page < 40; page++) {
    try {
      const result = await samsaraFetch(
        token,
        path,
        after ? { ...(params ?? {}), after } : params,
        fetchImpl,
      );
      items.push(...(result.data as T[]));
      if (!result.pagination?.hasNextPage || !result.pagination.endCursor) break;
      after = result.pagination.endCursor;
    } catch (error) {
      if (optional) return items;
      throw error;
    }
  }
  return items;
}

export async function pullSamsaraFleet(
  token: string,
  fetchImpl: FetchLike = fetch,
): Promise<SamsaraPull> {
  const vehicles = await paginate<SamsaraVehicle>(token, "/fleet/vehicles", undefined, fetchImpl);

  const [drivers, stats, clocks, assignments] = await Promise.all([
    paginate<SamsaraDriver>(token, "/fleet/drivers", undefined, fetchImpl, true),
    paginate<SamsaraGpsStat>(token, "/fleet/vehicles/stats", { types: "gps" }, fetchImpl, true),
    paginate<SamsaraHosClock>(token, "/fleet/hos/clocks", undefined, fetchImpl, true),
    pullAssignments(token, fetchImpl),
  ]);

  return { vehicles, drivers, stats, clocks, assignments };
}

async function pullAssignments(token: string, fetchImpl: FetchLike): Promise<SamsaraAssignment[]> {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
  try {
    return await paginate<SamsaraAssignment>(
      token,
      "/fleet/driver-vehicle-assignments",
      {
        filterBy: "vehicles",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      fetchImpl,
      true,
    );
  } catch {
    return [];
  }
}
