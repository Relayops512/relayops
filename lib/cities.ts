export const CITIES = [
  { city: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298 },
  { city: "Indianapolis", state: "IN", lat: 39.7684, lng: -86.1581 },
  { city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388 },
  { city: "Memphis", state: "TN", lat: 35.1495, lng: -90.049 },
  { city: "Dallas", state: "TX", lat: 32.7767, lng: -96.797 },
  { city: "Kansas City", state: "MO", lat: 39.0997, lng: -94.5786 },
  { city: "Nashville", state: "TN", lat: 36.1627, lng: -86.7816 },
  { city: "Louisville", state: "KY", lat: 38.2527, lng: -85.7585 },
  { city: "St. Louis", state: "MO", lat: 38.627, lng: -90.1994 },
  { city: "Cincinnati", state: "OH", lat: 39.1031, lng: -84.512 },
  { city: "Columbus", state: "OH", lat: 39.9612, lng: -82.9988 },
  { city: "Detroit", state: "MI", lat: 42.3314, lng: -83.0458 },
  { city: "Houston", state: "TX", lat: 29.7604, lng: -95.3698 },
  { city: "Jacksonville", state: "FL", lat: 30.3322, lng: -81.6557 },
  { city: "Charlotte", state: "NC", lat: 35.2271, lng: -80.8431 },
  { city: "Cleveland", state: "OH", lat: 41.4993, lng: -81.6944 },
  { city: "Tulsa", state: "OK", lat: 36.154, lng: -95.9928 },
  { city: "Little Rock", state: "AR", lat: 34.7465, lng: -92.2896 },
] as const;

export function findCity(city: string, state: string) {
  return CITIES.find(
    (c) => c.city.toLowerCase() === city.toLowerCase() && c.state.toLowerCase() === state.toLowerCase(),
  );
}
