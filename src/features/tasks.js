import { randomId } from "../core/default-state.js";

export function createTask({ title, description, category, priority, deadline }) {
  return {
    id: randomId(),
    title: title.trim(),
    description: description?.trim() || "",
    category: category || "Umumiy",
    priority: ["low", "medium", "high"].includes(priority) ? priority : "medium",
    deadline: deadline || "",
    status: "active",
    lastAlertAt: "",
    createdAt: new Date().toISOString()
  };
}

export function getTaskStatus(task, now = new Date()) {
  if (task.status === "done") return "done";
  if (!task.deadline) return "active";

  const timestamp = new Date(task.deadline).getTime();
  if (!Number.isFinite(timestamp)) return "active";
  return timestamp <= now.getTime() ? "overdue" : "active";
}

export function updateTask(task, updates) {
  const nextStatus = task.status === "done" ? "done" : "active";
  const nextDeadline = updates.deadline ?? task.deadline;
  const deadlineChanged = nextDeadline !== task.deadline;

  return {
    ...task,
    ...updates,
    title: (updates.title ?? task.title).trim(),
    description: (updates.description ?? task.description ?? "").trim(),
    category: updates.category ?? task.category,
    priority: updates.priority ?? task.priority,
    deadline: nextDeadline,
    status: nextStatus,
    lastAlertAt: deadlineChanged ? "" : (task.lastAlertAt || "")
  };
}

export function enrichTask(task, now = new Date()) {
  return {
    ...task,
    computedStatus: getTaskStatus(task, now)
  };
}

export function filterTasks(tasks, { query, status }) {
  const normalizedQuery = query?.trim().toLowerCase() || "";

  return tasks.filter((task) => {
    const text = `${task.title} ${task.description} ${task.category}`.toLowerCase();
    const matchesQuery = !normalizedQuery || text.includes(normalizedQuery);
    const matchesStatus = status === "all" || task.computedStatus === status;
    return matchesQuery && matchesStatus;
  });
}

export function sortTasks(tasks) {
  const priorityWeight = { high: 0, medium: 1, low: 2 };

  return [...tasks].sort((left, right) => {
    const leftHasDeadline = Boolean(left.deadline);
    const rightHasDeadline = Boolean(right.deadline);

    if (leftHasDeadline && rightHasDeadline) {
      const diff = new Date(left.deadline).getTime() - new Date(right.deadline).getTime();
      if (diff !== 0) return diff;
    }

    if (leftHasDeadline !== rightHasDeadline) {
      return leftHasDeadline ? -1 : 1;
    }

    return priorityWeight[left.priority] - priorityWeight[right.priority];
  });
}

export function getTaskMetrics(tasks) {
  return tasks.reduce((metrics, task) => {
    metrics.total += 1;
    if (task.computedStatus === "done") metrics.done += 1;
    if (task.computedStatus === "active") metrics.active += 1;
    if (task.computedStatus === "overdue") metrics.overdue += 1;
    return metrics;
  }, { total: 0, done: 0, active: 0, overdue: 0 });
}

export function getPriorityLabel(priority) {
  if (priority === "high") return "Yuqori";
  if (priority === "low") return "Past";
  return "O'rta";
}
