import { randomId } from "../core/default-state.js";

export function createDeadline({ title, date, note }) {
  return {
    id: randomId(),
    title: title.trim(),
    date,
    note: note?.trim() || "",
    createdAt: new Date().toISOString()
  };
}

export function getDeadlineStatus(deadline, now = new Date()) {
  if (!deadline.date) return "active";

  const timestamp = new Date(deadline.date).getTime();
  if (!Number.isFinite(timestamp)) return "active";

  const diff = timestamp - now.getTime();
  if (diff <= 0) return "overdue";
  if (diff <= 1000 * 60 * 60 * 24 * 3) return "near";
  return "active";
}

export function enrichDeadline(deadline, now = new Date()) {
  return {
    ...deadline,
    computedStatus: getDeadlineStatus(deadline, now)
  };
}

export function sortDeadlines(deadlines) {
  return [...deadlines].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
}

export function formatDeadlineCountdown(deadlineDate, now = new Date()) {
  if (!deadlineDate) return "Muddat belgilanmagan";

  const diffMs = new Date(deadlineDate).getTime() - now.getTime();
  if (!Number.isFinite(diffMs)) return "Sana noto'g'ri";
  if (diffMs <= 0) return "Muddat o'tgan";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (days) parts.push(`${days} kun`);
  if (hours) parts.push(`${hours} soat`);
  parts.push(`${minutes} daqiqa`);
  return parts.join(" ");
}
