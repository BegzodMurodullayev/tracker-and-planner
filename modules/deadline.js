export function getDeadlineState(deadlineISO, now = new Date(), warningMs = 1000 * 60 * 60 * 24) {
  if (!deadlineISO) return { state: "active", diffMs: Infinity };
  const deadline = new Date(deadlineISO);
  const diffMs = deadline - now;
  if (diffMs <= 0) return { state: "overdue", diffMs };
  if (diffMs <= warningMs) return { state: "warning", diffMs };
  return { state: "active", diffMs };
}

export function formatCountdown(diffMs) {
  if (!isFinite(diffMs)) return "No deadline";
  if (diffMs <= 0) return "Overdue";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}
