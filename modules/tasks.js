import { getDeadlineState } from "./deadline.js";

function randomId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createTask({ title, description, category, priority, deadline }) {
  const now = new Date().toISOString();
  return {
    id: randomId(),
    title: title.trim(),
    description: description?.trim() || "",
    category,
    priority,
    status: "not started",
    deadline: deadline || "",
    repeat: "none",
    subtasks: [],
    createdAt: now,
    updatedAt: now,
    lastNotified: ""
  };
}

export function updateTaskStatus(task, now, warningMs) {
  if (!task.deadline) return { ...task, deadlineState: "active" };
  if (task.status === "done") return { ...task, deadlineState: "active" };

  const { state } = getDeadlineState(task.deadline, now, warningMs);
  if (state === "overdue") {
    return { ...task, status: "overdue", deadlineState: "overdue" };
  }

  return { ...task, deadlineState: state };
}

export function filterTasks(tasks, statusFilter, categoryFilter) {
  return tasks.filter((task) => {
    const statusMatch = statusFilter === "all" || task.status === statusFilter;
    const categoryMatch = categoryFilter === "all" || task.category === categoryFilter;
    return statusMatch && categoryMatch;
  });
}

export function sortByDeadline(tasks) {
  return [...tasks].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });
}
