export function formatWindow(start: Date | string, end: Date | string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(s);
  const t = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);
  return sameDay ? `${day} ${t(s)}–${t(e)}` : `${day} ${t(s)} → ${t(e)}`;
}

export function formatWhen(value: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatWeight(lbs: number): string {
  return `${lbs.toLocaleString()} lbs`;
}

export function cityState(city: string, state: string): string {
  return `${city}, ${state}`;
}
