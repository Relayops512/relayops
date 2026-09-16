export type SamsaraTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
};

export type SamsaraVehicle = {
  id: string;
  name?: string | null;
  licensePlate?: string | null;
  staticAssignedDriver?: { id?: string; name?: string | null } | null;
  attributes?: Array<{
    name?: string | null;
    stringValues?: string[] | null;
  }> | null;
};

export type SamsaraDriver = {
  id: string;
  name?: string | null;
};

export type SamsaraGpsStat = {
  id: string;
  name?: string | null;
  gps?: {
    time?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    reverseGeo?: { formattedLocation?: string | null } | null;
  } | null;
};

export type SamsaraHosClock = {
  driver?: { id?: string; name?: string | null } | null;
  currentVehicle?: { id?: string; name?: string | null } | null;
  currentDutyStatus?: { hosStatusType?: string | null } | null;
  clocks?: {
    drive?: { driveRemainingDurationMs?: number | null } | null;
    shift?: { shiftRemainingDurationMs?: number | null } | null;
  } | null;
};

export type SamsaraAssignment = {
  driver?: { id?: string; name?: string | null } | null;
  vehicle?: { id?: string; name?: string | null } | null;
  endTime?: string | null;
};

export type SamsaraPull = {
  vehicles: SamsaraVehicle[];
  drivers: SamsaraDriver[];
  stats: SamsaraGpsStat[];
  clocks: SamsaraHosClock[];
  assignments: SamsaraAssignment[];
};
