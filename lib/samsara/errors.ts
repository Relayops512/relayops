export function friendlySamsaraError(input: {
  status?: number;
  code?: string;
  message?: string;
}): string {
  const code = (input.code ?? "").toLowerCase();
  const raw = (input.message ?? "").toLowerCase();
  const status = input.status ?? 0;

  if (code === "access_denied" || code === "scope_not_granted" || raw.includes("denied")) {
    return "Samsara access wasn't granted. You can try again or keep using CSV.";
  }
  if (code === "invalid_state" || raw.includes("state")) {
    return "That connect link expired. Try connecting again.";
  }
  if (code === "not_configured") {
    return "Samsara isn't set up on this app yet. CSV upload still works.";
  }
  if (code === "not_connected") {
    return "Samsara isn't connected. Connect it from Setup, or use CSV.";
  }
  if (code === "decrypt") {
    return "Saved Samsara keys couldn't be read. Disconnect and connect again.";
  }
  if (status === 401 || raw.includes("unauthorized") || raw.includes("invalid_token")) {
    return "Samsara signed us out. Connect again from Setup.";
  }
  if (status === 403 || raw.includes("forbidden") || raw.includes("scope")) {
    return "Samsara didn't allow this read. Check the app's read permissions and try again.";
  }
  if (status === 429) {
    return "Samsara is busy. Wait a moment and tap Sync now.";
  }
  if (status >= 500) {
    return "Samsara is having trouble right now. Try Sync now in a minute.";
  }
  if (raw.includes("fetch") || raw.includes("network") || raw.includes("enotfound")) {
    return "Couldn't reach Samsara. Check the connection and try again.";
  }
  return "Couldn't finish that Samsara step. Try again, or keep using CSV.";
}
