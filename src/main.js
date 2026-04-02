import { loadState, saveState } from "./core/storage-client.js";
import { createTask, enrichTask, filterTasks, getPriorityLabel, getTaskMetrics, sortTasks, updateTask } from "./features/tasks.js";
import { createDeadline, enrichDeadline, formatDeadlineCountdown, sortDeadlines } from "./features/deadlines.js";
import { FocusTimer, formatTimer, getPhaseLabel } from "./features/focus.js";
import { setupRouter } from "./ui/router.js";
import { showToast } from "./ui/toast.js";

const ROUTE_COPY = {
  bosh: {
    eyebrow: "Bosh sahifa",
    title: "Rejalaringiz boshqaruv ostida",
    description: "Kunlik vazifalar, muddatlar va fokus sessiyalarini bir joydan boshqaring."
  },
  vazifalar: {
    eyebrow: "Vazifalar",
    title: "Tartibli vazifalar oqimi",
    description: "Qo'shish, tahrirlash va bajarish jarayonini soddalashtirilgan dark-mode interfeysda boshqaring."
  },
  muddatlar: {
    eyebrow: "Muddatlar",
    title: "Deadline nazorati bir sahifada",
    description: "Yaqinlashayotgan muddatlarni ko'ring, o'zgartiring va o'tkazib yubormang."
  },
  fokus: {
    eyebrow: "Fokus rejimi",
    title: "Chuqur ish uchun tinch makon",
    description: "Pomodoro rejimi bilan ish vaqtini ajrating, dam oling va statistikani kuzating."
  }
};

const elements = {
  navButtons: document.querySelectorAll(".nav-item"),
  pages: document.querySelectorAll(".page"),
  routeEyebrow: document.getElementById("routeEyebrow"),
  routeTitle: document.getElementById("routeTitle"),
  routeDescription: document.getElementById("routeDescription"),
  todayTaskCount: document.getElementById("todayTaskCount"),
  upcomingDeadlineCount: document.getElementById("upcomingDeadlineCount"),
  sidebarFocusHint: document.getElementById("sidebarFocusHint"),
  totalTaskCount: document.getElementById("totalTaskCount"),
  activeTaskCount: document.getElementById("activeTaskCount"),
  doneTaskCount: document.getElementById("doneTaskCount"),
  overdueTaskCount: document.getElementById("overdueTaskCount"),
  focusMinutesTotal: document.getElementById("focusMinutesTotal"),
  focusSessionTotal: document.getElementById("focusSessionTotal"),
  homeCompletionRate: document.getElementById("homeCompletionRate"),
  homeTaskPreview: document.getElementById("homeTaskPreview"),
  homeDeadlinePreview: document.getElementById("homeDeadlinePreview"),
  homeFocusHistory: document.getElementById("homeFocusHistory"),
  heroTaskButton: document.getElementById("heroTaskButton"),
  heroDeadlineButton: document.getElementById("heroDeadlineButton"),
  viewAllTasks: document.getElementById("viewAllTasks"),
  viewAllDeadlines: document.getElementById("viewAllDeadlines"),
  quickFocus: document.getElementById("quickFocus"),
  newTaskShortcut: document.getElementById("newTaskShortcut"),
  taskForm: document.getElementById("taskForm"),
  taskTitle: document.getElementById("taskTitle"),
  taskDescription: document.getElementById("taskDescription"),
  taskCategory: document.getElementById("taskCategory"),
  taskPriority: document.getElementById("taskPriority"),
  taskDeadline: document.getElementById("taskDeadline"),
  taskSubmit: document.getElementById("taskSubmit"),
  taskCancel: document.getElementById("taskCancel"),
  taskSearch: document.getElementById("taskSearch"),
  taskStatusFilter: document.getElementById("taskStatusFilter"),
  taskCollectionMeta: document.getElementById("taskCollectionMeta"),
  taskList: document.getElementById("taskList"),
  deadlineForm: document.getElementById("deadlineForm"),
  deadlineTitle: document.getElementById("deadlineTitle"),
  deadlineDate: document.getElementById("deadlineDate"),
  deadlineNote: document.getElementById("deadlineNote"),
  deadlineSubmit: document.getElementById("deadlineSubmit"),
  deadlineCancel: document.getElementById("deadlineCancel"),
  deadlineCollectionMeta: document.getElementById("deadlineCollectionMeta"),
  deadlineList: document.getElementById("deadlineList"),
  focusTimer: document.getElementById("focusTimer"),
  focusPhase: document.getElementById("focusPhase"),
  focusStart: document.getElementById("focusStart"),
  focusStop: document.getElementById("focusStop"),
  focusReset: document.getElementById("focusReset"),
  presetClassic: document.getElementById("presetClassic"),
  presetDeep: document.getElementById("presetDeep"),
  workMinutes: document.getElementById("workMinutes"),
  breakMinutes: document.getElementById("breakMinutes"),
  applyFocus: document.getElementById("applyFocus"),
  focusTodayMinutes: document.getElementById("focusTodayMinutes"),
  focusTodaySessions: document.getElementById("focusTodaySessions"),
  focusHistoryList: document.getElementById("focusHistoryList"),
  toast: document.getElementById("toast")
};

const dateTimeFormatter = new Intl.DateTimeFormat("uz-UZ", {
  dateStyle: "medium",
  timeStyle: "short"
});

const dateFormatter = new Intl.DateTimeFormat("uz-UZ", {
  dateStyle: "medium"
});

let state = null;
let router = null;
let focusTimer = null;
let editingTaskId = null;
let editingDeadlineId = null;
let saveTimerId = null;
let timeMonitorId = null;
let lastTimeSignature = "";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeTimestamp(value) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatDateTime(value) {
  const timestamp = safeTimestamp(value);
  if (timestamp === null) return "Muddat belgilanmagan";
  return dateTimeFormatter.format(timestamp);
}

function formatDate(value) {
  const timestamp = safeTimestamp(value);
  if (timestamp === null) return "Sana yo'q";
  return dateFormatter.format(timestamp);
}

function todayKey() {
  return new Date().toDateString();
}

function createEmptyState(title, description) {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

function getStatusPresentation(status) {
  if (status === "done") {
    return { label: "Bajarildi", className: "status-done" };
  }

  if (status === "overdue") {
    return { label: "Muddati o'tgan", className: "status-overdue" };
  }

  if (status === "near") {
    return { label: "Yaqinlashmoqda", className: "status-near" };
  }

  return { label: "Faol", className: "status-active" };
}

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function scheduleSave() {
  clearTimeout(saveTimerId);
  saveTimerId = setTimeout(() => {
    void saveState(state).catch((error) => {
      console.error("Saqlashda xatolik:", error);
      showToast(elements.toast, "Saqlashda xatolik yuz berdi.");
    });
  }, 120);
}

function persistState(message) {
  renderAll();
  scheduleSave();
  if (message) showToast(elements.toast, message);
}

function getDecoratedTasks() {
  return sortTasks(state.tasks.map((task) => enrichTask(task)));
}

function getDecoratedDeadlines() {
  return sortDeadlines(state.deadlines.map((deadline) => enrichDeadline(deadline)));
}

function buildTimeSignature(tasks, deadlines) {
  const taskSignature = tasks.map((task) => `${task.id}:${task.computedStatus}`).join("|");
  const deadlineSignature = deadlines.map((deadline) => `${deadline.id}:${deadline.computedStatus}`).join("|");
  return `${taskSignature}::${deadlineSignature}`;
}

async function notifyTaskDue(task) {
  const message = `"${task.title}" vazifasining muddati yetdi.`;

  if (window.plannerApi?.notifyTaskDue) {
    try {
      await window.plannerApi.notifyTaskDue({
        title: task.title,
        deadline: formatDateTime(task.deadline)
      });
      return;
    } catch (error) {
      console.error("Task notification yuborishda xatolik:", error);
    }
  }

  showToast(elements.toast, message);
}

function checkTaskAlerts(tasks) {
  const dueTasks = tasks.filter((task) => task.computedStatus === "overdue" && task.status !== "done" && !task.lastAlertAt);
  if (dueTasks.length === 0) return;

  const dueIds = new Set(dueTasks.map((task) => task.id));
  const alertedAt = new Date().toISOString();

  state.tasks = state.tasks.map((task) => dueIds.has(task.id) ? { ...task, lastAlertAt: alertedAt } : task);

  dueTasks.forEach((task) => {
    void notifyTaskDue(task);
  });

  if (dueTasks.length === 1) {
    showToast(elements.toast, `"${dueTasks[0].title}" vazifasining muddati yetdi.`);
  } else {
    showToast(elements.toast, `${dueTasks.length} ta vazifa muddati yetdi.`);
  }

  scheduleSave();
}

function startTimeMonitor() {
  clearInterval(timeMonitorId);
  timeMonitorId = setInterval(() => {
    const tasks = getDecoratedTasks();
    const deadlines = getDecoratedDeadlines();
    const nextSignature = buildTimeSignature(tasks, deadlines);

    if (nextSignature !== lastTimeSignature) {
      lastTimeSignature = nextSignature;
      renderAll();
    }

    checkTaskAlerts(tasks);
  }, 1000);
}

function updateRouteCopy(route) {
  const copy = ROUTE_COPY[route] || ROUTE_COPY.bosh;
  elements.routeEyebrow.textContent = copy.eyebrow;
  elements.routeTitle.textContent = copy.title;
  elements.routeDescription.textContent = copy.description;
}

function goToRoute(route, focusElement) {
  router?.goTo(route);
  if (focusElement) {
    requestAnimationFrame(() => focusElement.focus());
  }
}

function renderSidebar(tasks, deadlines) {
  const now = new Date();
  const today = now.toDateString();
  const dueTodayCount = tasks.filter((task) => task.deadline && new Date(task.deadline).toDateString() === today && task.computedStatus !== "done").length;
  const upcomingDeadlines = deadlines.filter((deadline) => {
    const timestamp = safeTimestamp(deadline.date);
    if (timestamp === null) return false;
    const diff = timestamp - now.getTime();
    return diff > 0 && diff <= 1000 * 60 * 60 * 24 * 7;
  }).length;

  elements.todayTaskCount.textContent = dueTodayCount;
  elements.upcomingDeadlineCount.textContent = upcomingDeadlines;

  if (tasks.some((task) => task.computedStatus === "overdue")) {
    const overdueCount = tasks.filter((task) => task.computedStatus === "overdue").length;
    elements.sidebarFocusHint.textContent = `${overdueCount} ta vazifaning muddati o'tgan. Avval ularni tartibga keltirib oling.`;
    return;
  }

  if (state.focus.totalSessions > 0) {
    elements.sidebarFocusHint.textContent = `Siz ${state.focus.totalSessions} ta fokus sessiyasini yakunlagansiz. Shu ritmni davom ettiring.`;
    return;
  }

  elements.sidebarFocusHint.textContent = "Bugun bitta chuqur fokus sessiyasi bilan boshlang.";
}

function renderHomeTasks(tasks) {
  const previewTasks = tasks.filter((task) => task.computedStatus !== "done").slice(0, 4);

  if (previewTasks.length === 0) {
    elements.homeTaskPreview.innerHTML = createEmptyState("Faol vazifalar yo'q", "Yangi vazifa qo'shing yoki tugallangan ishlarni kuzatib boring.");
    return;
  }

  elements.homeTaskPreview.innerHTML = previewTasks.map((task) => {
    const status = getStatusPresentation(task.computedStatus);
    return `
      <article class="preview-card">
        <div class="item-title-row">
          <h3>${escapeHtml(task.title)}</h3>
          <span class="status-chip ${status.className}">${status.label}</span>
        </div>
        <p>${escapeHtml(task.description || "Izoh kiritilmagan.")}</p>
        <div class="meta-line">
          <span>${escapeHtml(task.category)}</span>
          <span>${getPriorityLabel(task.priority)}</span>
          <span>${escapeHtml(formatDateTime(task.deadline))}</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderHomeDeadlines(deadlines) {
  const previewDeadlines = deadlines.slice(0, 4);

  if (previewDeadlines.length === 0) {
    elements.homeDeadlinePreview.innerHTML = createEmptyState("Muddatlar mavjud emas", "Muhim sana va vaqtlarni alohida muddat sifatida qo'shing.");
    return;
  }

  elements.homeDeadlinePreview.innerHTML = previewDeadlines.map((deadline) => {
    const status = getStatusPresentation(deadline.computedStatus);
    return `
      <article class="preview-card">
        <div class="item-title-row">
          <h3>${escapeHtml(deadline.title)}</h3>
          <span class="status-chip ${status.className}">${status.label}</span>
        </div>
        <p>${escapeHtml(deadline.note || "Qo'shimcha izoh yo'q.")}</p>
        <div class="meta-line">
          <span>${escapeHtml(formatDateTime(deadline.date))}</span>
          <span>${escapeHtml(formatDeadlineCountdown(deadline.date))}</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderFocusHistoryList(container, entries) {
  if (entries.length === 0) {
    container.innerHTML = createEmptyState("Fokus tarixi hali bo'sh", "Birinchi sessiyani boshlang va natijalar shu yerda ko'rinadi.");
    return;
  }

  container.innerHTML = entries.map((entry) => `
    <article class="history-card">
      <div>
        <h3>${escapeHtml(formatDate(entry.key))}</h3>
        <p>${entry.sessions} ta sessiya yakunlangan</p>
      </div>
      <span class="status-chip status-active">${entry.minutes} daq.</span>
    </article>
  `).join("");
}

function renderDashboard(tasks, deadlines) {
  const metrics = getTaskMetrics(tasks);
  const completionRate = metrics.total > 0 ? Math.round((metrics.done / metrics.total) * 100) : 0;

  elements.totalTaskCount.textContent = metrics.total;
  elements.activeTaskCount.textContent = metrics.active;
  elements.doneTaskCount.textContent = metrics.done;
  elements.overdueTaskCount.textContent = metrics.overdue;
  elements.homeCompletionRate.textContent = `${completionRate}%`;
  elements.focusMinutesTotal.textContent = `${state.focus.totalMinutes} daq.`;
  elements.focusSessionTotal.textContent = state.focus.totalSessions;

  renderHomeTasks(tasks);
  renderHomeDeadlines(deadlines);

  const historyEntries = Object.entries(state.focus.history)
    .map(([key, value]) => ({ key, ...value }))
    .sort((left, right) => new Date(right.key).getTime() - new Date(left.key).getTime())
    .slice(0, 4);

  renderFocusHistoryList(elements.homeFocusHistory, historyEntries);
}

function renderTaskList(tasks) {
  const filteredTasks = filterTasks(tasks, {
    query: elements.taskSearch.value,
    status: elements.taskStatusFilter.value
  });

  if (filteredTasks.length === 0) {
    const hasFilters = Boolean(elements.taskSearch.value.trim()) || elements.taskStatusFilter.value !== "all";
    elements.taskCollectionMeta.textContent = hasFilters ? "Filtr bo'yicha vazifa topilmadi." : "Hozircha vazifalar mavjud emas.";
    elements.taskList.innerHTML = createEmptyState("Vazifalar ko'rinmadi", hasFilters ? "Qidiruv yoki holat filtrini o'zgartirib ko'ring." : "Yuqoridagi forma orqali birinchi vazifani qo'shing.");
    return;
  }

  elements.taskCollectionMeta.textContent = `${filteredTasks.length} ta vazifa ko'rsatilmoqda.`;
  elements.taskList.innerHTML = filteredTasks.map((task) => {
    const status = getStatusPresentation(task.computedStatus);
    const toggleLabel = task.status === "done" ? "Qayta faol qilish" : "Bajarildi";

    return `
      <article class="item-card">
        <div class="item-title-row">
          <h3>${escapeHtml(task.title)}</h3>
          <span class="status-chip ${status.className}">${status.label}</span>
        </div>
        <p>${escapeHtml(task.description || "Izoh kiritilmagan.")}</p>
        <div class="meta-line">
          <span>${escapeHtml(task.category)}</span>
          <span class="priority-chip priority-${escapeHtml(task.priority)}">${getPriorityLabel(task.priority)}</span>
          <span>${escapeHtml(formatDateTime(task.deadline))}</span>
        </div>
        <div class="item-footer">
          <div class="item-actions">
            <button type="button" class="action-button" data-action="toggle-task" data-id="${escapeHtml(task.id)}">${toggleLabel}</button>
            <button type="button" class="action-button" data-action="edit-task" data-id="${escapeHtml(task.id)}">Tahrirlash</button>
            <button type="button" class="action-button" data-action="delete-task" data-id="${escapeHtml(task.id)}">O'chirish</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderDeadlineList(deadlines) {
  if (deadlines.length === 0) {
    elements.deadlineCollectionMeta.textContent = "Muddatlar hali qo'shilmagan.";
    elements.deadlineList.innerHTML = createEmptyState("Muddatlar ro'yxati bo'sh", "Muhim sanalarni deadline sifatida yozib qo'ying.");
    return;
  }

  elements.deadlineCollectionMeta.textContent = `${deadlines.length} ta muddat kuzatilmoqda.`;
  elements.deadlineList.innerHTML = deadlines.map((deadline) => {
    const status = getStatusPresentation(deadline.computedStatus);

    return `
      <article class="item-card">
        <div class="item-title-row">
          <h3>${escapeHtml(deadline.title)}</h3>
          <span class="status-chip ${status.className}">${status.label}</span>
        </div>
        <p>${escapeHtml(deadline.note || "Qo'shimcha izoh yo'q.")}</p>
        <div class="meta-line">
          <span>${escapeHtml(formatDateTime(deadline.date))}</span>
          <span>${escapeHtml(formatDeadlineCountdown(deadline.date))}</span>
        </div>
        <div class="item-footer">
          <div class="item-actions">
            <button type="button" class="action-button" data-action="edit-deadline" data-id="${escapeHtml(deadline.id)}">Tahrirlash</button>
            <button type="button" class="action-button" data-action="delete-deadline" data-id="${escapeHtml(deadline.id)}">O'chirish</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderFocusPage() {
  const todayEntry = state.focus.history[todayKey()] || { minutes: 0, sessions: 0 };
  elements.focusTodayMinutes.textContent = `${todayEntry.minutes} daq.`;
  elements.focusTodaySessions.textContent = todayEntry.sessions;
  elements.workMinutes.value = state.focus.workMinutes;
  elements.breakMinutes.value = state.focus.breakMinutes;

  elements.presetClassic.classList.toggle("active", state.focus.workMinutes === 25 && state.focus.breakMinutes === 5);
  elements.presetDeep.classList.toggle("active", state.focus.workMinutes === 50 && state.focus.breakMinutes === 10);

  const historyEntries = Object.entries(state.focus.history)
    .map(([key, value]) => ({ key, ...value }))
    .sort((left, right) => new Date(right.key).getTime() - new Date(left.key).getTime())
    .slice(0, 8);

  renderFocusHistoryList(elements.focusHistoryList, historyEntries);
}

function renderAll() {
  const tasks = getDecoratedTasks();
  const deadlines = getDecoratedDeadlines();

  renderSidebar(tasks, deadlines);
  renderDashboard(tasks, deadlines);
  renderTaskList(tasks);
  renderDeadlineList(deadlines);
  renderFocusPage();

  lastTimeSignature = buildTimeSignature(tasks, deadlines);
}

function resetTaskForm() {
  editingTaskId = null;
  elements.taskForm.reset();
  elements.taskCategory.value = "Umumiy";
  elements.taskPriority.value = "medium";
  elements.taskSubmit.textContent = "Vazifa qo'shish";
  elements.taskCancel.hidden = true;
}

function startTaskEdit(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  editingTaskId = task.id;
  elements.taskTitle.value = task.title;
  elements.taskDescription.value = task.description;
  elements.taskCategory.value = task.category;
  elements.taskPriority.value = task.priority;
  elements.taskDeadline.value = task.deadline || "";
  elements.taskSubmit.textContent = "Vazifani yangilash";
  elements.taskCancel.hidden = false;
  goToRoute("vazifalar", elements.taskTitle);
  showToast(elements.toast, "Vazifa tahrirlash uchun yuklandi.");
}

function resetDeadlineForm() {
  editingDeadlineId = null;
  elements.deadlineForm.reset();
  elements.deadlineSubmit.textContent = "Muddat qo'shish";
  elements.deadlineCancel.hidden = true;
}

function startDeadlineEdit(deadlineId) {
  const deadline = state.deadlines.find((item) => item.id === deadlineId);
  if (!deadline) return;

  editingDeadlineId = deadline.id;
  elements.deadlineTitle.value = deadline.title;
  elements.deadlineDate.value = deadline.date || "";
  elements.deadlineNote.value = deadline.note;
  elements.deadlineSubmit.textContent = "Muddatni yangilash";
  elements.deadlineCancel.hidden = false;
  goToRoute("muddatlar", elements.deadlineTitle);
  showToast(elements.toast, "Muddat tahrirlash uchun yuklandi.");
}

function updateFocusDurations(workMinutes, breakMinutes, message) {
  const work = clamp(workMinutes, 15, 90, 25);
  const rest = clamp(breakMinutes, 3, 30, 5);

  state.focus.workMinutes = work;
  state.focus.breakMinutes = rest;
  focusTimer.setDurations(work, rest);
  persistState(message);
}

function initializeTimer() {
  focusTimer = new FocusTimer({
    workMinutes: state.focus.workMinutes,
    breakMinutes: state.focus.breakMinutes,
    onTick: (remainingMs) => {
      elements.focusTimer.textContent = formatTimer(remainingMs);
    },
    onPhaseChange: (phase) => {
      elements.focusPhase.textContent = getPhaseLabel(phase);
    },
    onWorkComplete: (minutes) => {
      const key = todayKey();
      if (!state.focus.history[key]) {
        state.focus.history[key] = { minutes: 0, sessions: 0 };
      }

      state.focus.history[key].minutes += minutes;
      state.focus.history[key].sessions += 1;
      state.focus.totalMinutes += minutes;
      state.focus.totalSessions += 1;
      persistState("Fokus sessiyasi yakunlandi.");
    }
  });

  focusTimer.reset();
}

function bindTaskEvents() {
  elements.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = elements.taskTitle.value.trim();
    if (!title) {
      showToast(elements.toast, "Vazifa nomini kiriting.");
      return;
    }

    const payload = {
      title,
      description: elements.taskDescription.value,
      category: elements.taskCategory.value,
      priority: elements.taskPriority.value,
      deadline: elements.taskDeadline.value
    };

    if (editingTaskId) {
      state.tasks = state.tasks.map((task) => task.id === editingTaskId ? updateTask(task, payload) : task);
      resetTaskForm();
      persistState("Vazifa yangilandi.");
      return;
    }

    state.tasks.unshift(createTask(payload));
    resetTaskForm();
    persistState("Yangi vazifa qo'shildi.");
  });

  elements.taskCancel.addEventListener("click", () => {
    resetTaskForm();
  });

  elements.taskSearch.addEventListener("input", () => renderTaskList(getDecoratedTasks()));
  elements.taskStatusFilter.addEventListener("change", () => renderTaskList(getDecoratedTasks()));

  elements.taskList.addEventListener("click", (event) => {
    const target = event.target.closest("button[data-action]");
    if (!target) return;

    const { action, id } = target.dataset;
    if (!id) return;

    if (action === "toggle-task") {
      state.tasks = state.tasks.map((task) => task.id === id ? { ...task, status: task.status === "done" ? "active" : "done" } : task);
      persistState("Vazifa holati yangilandi.");
      return;
    }

    if (action === "edit-task") {
      startTaskEdit(id);
      return;
    }

    if (action === "delete-task") {
      state.tasks = state.tasks.filter((task) => task.id !== id);
      if (editingTaskId === id) resetTaskForm();
      persistState("Vazifa o'chirildi.");
    }
  });
}

function bindDeadlineEvents() {
  elements.deadlineForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = elements.deadlineTitle.value.trim();
    if (!title || !elements.deadlineDate.value) {
      showToast(elements.toast, "Muddat nomi va sanasini kiriting.");
      return;
    }

    const payload = {
      title,
      date: elements.deadlineDate.value,
      note: elements.deadlineNote.value
    };

    if (editingDeadlineId) {
      state.deadlines = state.deadlines.map((deadline) => deadline.id === editingDeadlineId ? { ...deadline, ...payload } : deadline);
      resetDeadlineForm();
      persistState("Muddat yangilandi.");
      return;
    }

    state.deadlines.unshift(createDeadline(payload));
    resetDeadlineForm();
    persistState("Yangi muddat qo'shildi.");
  });

  elements.deadlineCancel.addEventListener("click", () => {
    resetDeadlineForm();
  });

  elements.deadlineList.addEventListener("click", (event) => {
    const target = event.target.closest("button[data-action]");
    if (!target) return;

    const { action, id } = target.dataset;
    if (!id) return;

    if (action === "edit-deadline") {
      startDeadlineEdit(id);
      return;
    }

    if (action === "delete-deadline") {
      state.deadlines = state.deadlines.filter((deadline) => deadline.id !== id);
      if (editingDeadlineId === id) resetDeadlineForm();
      persistState("Muddat o'chirildi.");
    }
  });
}

function bindFocusEvents() {
  elements.focusStart.addEventListener("click", () => {
    focusTimer.start();
    showToast(elements.toast, "Fokus taymeri boshlandi.");
  });

  elements.focusStop.addEventListener("click", () => {
    focusTimer.stop();
    showToast(elements.toast, "Fokus taymeri to'xtatildi.");
  });

  elements.focusReset.addEventListener("click", () => {
    focusTimer.reset();
    showToast(elements.toast, "Fokus taymeri qayta sozlandi.");
  });

  elements.applyFocus.addEventListener("click", () => {
    updateFocusDurations(elements.workMinutes.value, elements.breakMinutes.value, "Fokus davomiyligi yangilandi.");
  });

  elements.presetClassic.addEventListener("click", () => {
    updateFocusDurations(25, 5, "Klassik fokus rejimi tanlandi.");
  });

  elements.presetDeep.addEventListener("click", () => {
    updateFocusDurations(50, 10, "Chuqur fokus rejimi tanlandi.");
  });
}

function bindQuickActions() {
  elements.heroTaskButton.addEventListener("click", () => goToRoute("vazifalar", elements.taskTitle));
  elements.newTaskShortcut.addEventListener("click", () => goToRoute("vazifalar", elements.taskTitle));
  elements.viewAllTasks.addEventListener("click", () => goToRoute("vazifalar"));

  elements.heroDeadlineButton.addEventListener("click", () => goToRoute("muddatlar", elements.deadlineTitle));
  elements.viewAllDeadlines.addEventListener("click", () => goToRoute("muddatlar"));

  elements.quickFocus.addEventListener("click", () => {
    goToRoute("fokus");
    focusTimer.start();
    showToast(elements.toast, "Fokus taymeri boshlandi.");
  });
}

async function init() {
  state = await loadState();
  await saveState(state);
  console.info("Reja+ yuklandi.");

  resetTaskForm();
  resetDeadlineForm();
  initializeTimer();
  bindTaskEvents();
  bindDeadlineEvents();
  bindFocusEvents();
  bindQuickActions();

  router = setupRouter({
    navButtons: elements.navButtons,
    pages: elements.pages,
    onRouteChange: (route) => {
      updateRouteCopy(route);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  renderAll();
  startTimeMonitor();
}

void init();

