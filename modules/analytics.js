export function computeProductivityScore(tasks, focusMinutes, streak) {
  const total = tasks.length || 1;
  const completed = tasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter((t) => t.status === "overdue").length;
  const completionScore = (completed / total) * 60;
  const focusScore = Math.min(focusMinutes / 300, 1) * 25;
  const streakScore = Math.min(streak / 7, 1) * 15;
  const penalty = Math.min(overdue * 4, 20);
  return Math.max(0, Math.round(completionScore + focusScore + streakScore - penalty));
}

export function formatMinutes(totalMinutes) {
  if (!totalMinutes) return "0 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function weeklyCompletion(tasks, dayKeys = null) {
  // Backward compatible default: last 7 days including today.
  const keys =
    dayKeys && dayKeys.length
      ? dayKeys
      : (() => {
          const today = new Date();
          return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - (6 - i));
            return d.toDateString();
          });
        })();

  const result = Array.from({ length: keys.length }, () => 0);
  const keyToIndex = new Map(keys.map((k, idx) => [k, idx]));

  tasks.forEach((task) => {
    if (task.status !== "done") return;
    const doneDate = task.updatedAt ? new Date(task.updatedAt) : new Date(task.createdAt);
    const key = doneDate.toDateString();
    const idx = keyToIndex.get(key);
    if (idx !== undefined) result[idx] += 1;
  });

  return result;
}
