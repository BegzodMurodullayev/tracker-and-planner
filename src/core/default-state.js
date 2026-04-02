export const defaultState = {
  tasks: [],
  deadlines: [],
  focus: {
    workMinutes: 25,
    breakMinutes: 5,
    totalMinutes: 0,
    totalSessions: 0,
    history: {}
  }
};

export function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

export function randomId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeString(value) {
  return typeof value === "string" ? value : "";
}

function safeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHistoryEntry(entry) {
  return {
    minutes: safeNumber(entry?.minutes, 0),
    sessions: safeNumber(entry?.sessions, 0)
  };
}

function normalizeHistory(rawHistory) {
  if (!rawHistory || typeof rawHistory !== "object") {
    return {};
  }

  return Object.entries(rawHistory).reduce((accumulator, [key, value]) => {
    accumulator[key] = normalizeHistoryEntry(value);
    return accumulator;
  }, {});
}

function normalizeTask(task) {
  const priority = ["low", "medium", "high"].includes(task?.priority) ? task.priority : "medium";
  const rawStatus = safeString(task?.status).toLowerCase();

  return {
    id: safeString(task?.id) || randomId(),
    title: safeString(task?.title).trim(),
    description: safeString(task?.description).trim(),
    category: safeString(task?.category).trim() || "Umumiy",
    priority,
    deadline: safeString(task?.deadline || task?.date),
    status: rawStatus === "done" ? "done" : "active",
    lastAlertAt: safeString(task?.lastAlertAt),
    createdAt: safeString(task?.createdAt) || new Date().toISOString()
  };
}

function normalizeDeadline(deadline) {
  return {
    id: safeString(deadline?.id) || randomId(),
    title: safeString(deadline?.title).trim(),
    note: safeString(deadline?.note).trim(),
    date: safeString(deadline?.date || deadline?.deadline),
    createdAt: safeString(deadline?.createdAt) || new Date().toISOString()
  };
}

export function normalizeState(raw) {
  if (!raw || typeof raw !== "object") {
    return clone(defaultState);
  }

  const tasks = Array.isArray(raw.tasks)
    ? raw.tasks.map(normalizeTask).filter((task) => task.title)
    : [];

  const deadlines = Array.isArray(raw.deadlines)
    ? raw.deadlines.map(normalizeDeadline).filter((deadline) => deadline.title && deadline.date)
    : [];

  const focusSource = raw.focus && typeof raw.focus === "object" ? raw.focus : {};
  const legacyHistory = raw.focusHistory && typeof raw.focusHistory === "object" ? raw.focusHistory : {};
  const history = normalizeHistory(focusSource.history || legacyHistory);
  const historyValues = Object.values(history);
  const historyMinutes = historyValues.reduce((sum, entry) => sum + safeNumber(entry.minutes, 0), 0);
  const historySessions = historyValues.reduce((sum, entry) => sum + safeNumber(entry.sessions, 0), 0);

  return {
    tasks,
    deadlines,
    focus: {
      workMinutes: clamp(safeNumber(focusSource.workMinutes, 25), 15, 90),
      breakMinutes: clamp(safeNumber(focusSource.breakMinutes, 5), 3, 30),
      totalMinutes: Math.max(safeNumber(focusSource.totalMinutes, historyMinutes), historyMinutes),
      totalSessions: Math.max(safeNumber(focusSource.totalSessions ?? focusSource.sessions, historySessions), historySessions),
      history
    }
  };
}
