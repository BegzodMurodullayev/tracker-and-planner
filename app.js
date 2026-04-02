
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createTask, updateTaskStatus, filterTasks, sortByDeadline } from "./modules/tasks.js";
import { getDeadlineState, formatCountdown } from "./modules/deadline.js";
import { PomodoroTimer } from "./modules/pomodoro.js";
import { computeProductivityScore, weeklyCompletion, formatMinutes } from "./modules/analytics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, "data.json");
const backupDir = path.join(__dirname, "backups");

const defaultData = {
  tasks: [],
  pomodoroSessions: [],
  vocabulary: [],
  settings: {
    warningHours: 24,
    dailyGoal: 10
  },
  focus: {
    totalMinutes: 0,
    sessions: 0,
    streak: 0,
    lastFocusDate: ""
  },
  focusHistory: {},
  study: {
    streak: 0,
    lastStudyDate: ""
  },
  studySessions: [],
  studyPlan: "",
  habits: [],
  goals: []
};

let state = loadData();

const elements = {
  productivityScore: document.getElementById("productivityScore"),
  focusStreak: document.getElementById("focusStreak"),
  quickAddForm: document.getElementById("quickAddForm"),
  taskTitle: document.getElementById("taskTitle"),
  taskDescription: document.getElementById("taskDescription"),
  taskCategory: document.getElementById("taskCategory"),
  taskPriority: document.getElementById("taskPriority"),
  taskDeadline: document.getElementById("taskDeadline"),
  taskRepeat: document.getElementById("taskRepeat"),
  todayTasks: document.getElementById("todayTasks"),
  overdueTasks: document.getElementById("overdueTasks"),
  upcomingTasks: document.getElementById("upcomingTasks"),
  activeTasks: document.getElementById("activeTasks"),
  tasksList: document.getElementById("tasksList"),
  filterStatus: document.getElementById("filterStatus"),
  filterCategory: document.getElementById("filterCategory"),
  taskSearch: document.getElementById("taskSearch"),
  kanbanTodo: document.getElementById("kanbanTodo"),
  kanbanProgress: document.getElementById("kanbanProgress"),
  kanbanDone: document.getElementById("kanbanDone"),
  pomodoroTimer: document.getElementById("pomodoroTimer"),
  pomodoroPhase: document.getElementById("pomodoroPhase"),
  focusMinutes: document.getElementById("focusMinutes"),
  sessionCount: document.getElementById("sessionCount"),
  pomodoroStart: document.getElementById("pomodoroStart"),
  pomodoroPause: document.getElementById("pomodoroPause"),
  pomodoroReset: document.getElementById("pomodoroReset"),
  workDuration: document.getElementById("workDuration"),
  breakDuration: document.getElementById("breakDuration"),
  applyPomodoro: document.getElementById("applyPomodoro"),
  focusOverlay: document.getElementById("focusOverlay"),
  enterFocus: document.getElementById("enterFocus"),
  exitFocus: document.getElementById("exitFocus"),
  focusTimer: document.getElementById("focusTimer"),
  focusStart: document.getElementById("focusStart"),
  focusPause: document.getElementById("focusPause"),
  focusReset: document.getElementById("focusReset"),
  ambientSound: document.getElementById("ambientSound"),
  lockUi: document.getElementById("lockUi"),
  enterStudyMode: document.getElementById("enterStudyMode"),
  studyOverlay: document.getElementById("studyOverlay"),
  exitStudyMode: document.getElementById("exitStudyMode"),
  studyTimer: document.getElementById("studyTimer"),
  studyStart: document.getElementById("studyStart"),
  studyPause: document.getElementById("studyPause"),
  studyReset: document.getElementById("studyReset"),
  studyNotes: document.getElementById("studyNotes"),
  lockStudyUi: document.getElementById("lockStudyUi"),
  vocabInput: document.getElementById("vocabInput"),
  addVocab: document.getElementById("addVocab"),
  vocabList: document.getElementById("vocabList"),
  dailyGoal: document.getElementById("dailyGoal"),
  todayLearned: document.getElementById("todayLearned"),
  studyStreak: document.getElementById("studyStreak"),
  completedCount: document.getElementById("completedCount"),
  pendingCount: document.getElementById("pendingCount"),
  focusTime: document.getElementById("focusTime"),
  weeklyChart: document.getElementById("weeklyChart"),
  focusLineChart: document.getElementById("focusLineChart"),
  completionDonut: document.getElementById("completionDonut"),
  studyTopic: document.getElementById("studyTopic"),
  studyMinutes: document.getElementById("studyMinutes"),
  addStudySession: document.getElementById("addStudySession"),
  dailyPlan: document.getElementById("dailyPlan"),
  saveDailyPlan: document.getElementById("saveDailyPlan"),
  studySessions: document.getElementById("studySessions"),
  todayStudy: document.getElementById("todayStudy"),
  weeklyStudy: document.getElementById("weeklyStudy"),
  topTopic: document.getElementById("topTopic"),
  habitInput: document.getElementById("habitInput"),
  habitFrequency: document.getElementById("habitFrequency"),
  addHabit: document.getElementById("addHabit"),
  habitList: document.getElementById("habitList"),
  goalInput: document.getElementById("goalInput"),
  goalDeadline: document.getElementById("goalDeadline"),
  goalProgress: document.getElementById("goalProgress"),
  addGoal: document.getElementById("addGoal"),
  goalList: document.getElementById("goalList"),
  generateDailyReview: document.getElementById("generateDailyReview"),
  generateWeeklyReview: document.getElementById("generateWeeklyReview"),
  exportJson: document.getElementById("exportJson"),
  exportCsv: document.getElementById("exportCsv"),
  backupNow: document.getElementById("backupNow"),
  reviewOutput: document.getElementById("reviewOutput"),
  toast: document.getElementById("toast"),
  warningHours: document.getElementById("warningHours"),
  dailyGoalInput: document.getElementById("dailyGoalInput"),
  saveSettings: document.getElementById("saveSettings"),
  openSettings: document.getElementById("openSettings"),
  taskModal: document.getElementById("taskModal"),
  taskModalBody: document.getElementById("taskModalBody"),
  closeTaskModal: document.getElementById("closeTaskModal"),

  // Analytics range controls
  range7: document.getElementById("range7"),
  range30: document.getElementById("range30"),
  rangeCustom: document.getElementById("rangeCustom"),
  rangeCustomPicker: document.getElementById("rangeCustomPicker"),
  rangeStart: document.getElementById("rangeStart"),
  rangeEnd: document.getElementById("rangeEnd"),
  applyAnalyticsRange: document.getElementById("applyAnalyticsRange"),
  analyticsRangeLabel: document.getElementById("analyticsRangeLabel"),
  weeklyChartTitle: document.getElementById("weeklyChartTitle"),
  focusChartTitle: document.getElementById("focusChartTitle")
};

function randomId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateToInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateInput(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function getDayKeysInRange(startDate, endDate) {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  if (start > end) return [];

  const keys = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    keys.push(d.toDateString());
  }
  return keys;
}

let analyticsRange = (() => {
  const endDate = startOfDay(new Date());
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6); // default: last 7 days (inclusive)
  return { mode: "last7", startDate, endDate };
})();

function getAnalyticsDayKeys() {
  return getDayKeysInRange(analyticsRange.startDate, analyticsRange.endDate);
}

function formatRangeLabel(startDate, endDate) {
  const startStr = startDate.toLocaleDateString("uz-UZ");
  const endStr = endDate.toLocaleDateString("uz-UZ");
  return `${startStr} - ${endStr}`;
}

function syncAnalyticsRangeUI({ showCustomPicker } = {}) {
  const isCustom = analyticsRange.mode === "custom";
  const rangeCustomPicker = elements.rangeCustomPicker;

  elements.range7?.classList.toggle("active", analyticsRange.mode === "last7");
  elements.range30?.classList.toggle("active", analyticsRange.mode === "last30");
  elements.rangeCustom?.classList.toggle("active", isCustom);

  if (rangeCustomPicker) {
    rangeCustomPicker.classList.toggle("hidden", !(isCustom || showCustomPicker));
  }

  if (elements.rangeStart && elements.rangeEnd) {
    elements.rangeStart.value = dateToInputValue(analyticsRange.startDate);
    elements.rangeEnd.value = dateToInputValue(analyticsRange.endDate);
  }
}

function setAnalyticsPresetDays(days) {
  const endDate = startOfDay(new Date());
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (days - 1));

  analyticsRange.startDate = startDate;
  analyticsRange.endDate = endDate;
  analyticsRange.mode = days === 30 ? "last30" : "last7";

  syncAnalyticsRangeUI();
  renderAnalytics();
}

function applyCustomAnalyticsRange() {
  const startDate = parseDateInput(elements.rangeStart?.value);
  const endDate = parseDateInput(elements.rangeEnd?.value);
  if (!startDate || !endDate) return;

  let s = startDate;
  let e = endDate;
  if (s > e) {
    const tmp = s;
    s = e;
    e = tmp;
  }

  analyticsRange.startDate = s;
  analyticsRange.endDate = e;
  analyticsRange.mode = "custom";

  syncAnalyticsRangeUI();
  renderAnalytics();
}

function setupAnalyticsRangeControls() {
  elements.range7?.addEventListener("click", () => setAnalyticsPresetDays(7));
  elements.range30?.addEventListener("click", () => setAnalyticsPresetDays(30));
  elements.rangeCustom?.addEventListener("click", () => {
    analyticsRange.mode = "custom";
    syncAnalyticsRangeUI({ showCustomPicker: true });
  });
  elements.applyAnalyticsRange?.addEventListener("click", applyCustomAnalyticsRange);

  // Initial UI sync from current default analyticsRange
  syncAnalyticsRangeUI();
}

const pomodoro = new PomodoroTimer({
  workMinutes: Number(elements.workDuration?.value ?? 25),
  breakMinutes: Number(elements.breakDuration?.value ?? 5),
  onTick: (remainingMs, phase) => {
    const formatted = formatTime(remainingMs);
    elements.pomodoroTimer && (elements.pomodoroTimer.textContent = formatted);
    elements.focusTimer && (elements.focusTimer.textContent = formatted);
    elements.pomodoroPhase &&
      (elements.pomodoroPhase.textContent = phase === "work" ? "Ish" : "Dam");
  },
  onPhaseChange: (phase) => {
    notify(`Pomodoro: ${phase === "work" ? "Ish sessiyasi" : "Dam olish vaqti"}`);
  },
  onSessionComplete: (phase) => {
    if (phase === "work") {
      const minutes = Number(elements.workDuration?.value ?? 25);
      state.focus.totalMinutes += minutes;
      state.focus.sessions += 1;
      addFocusHistory(minutes);
      updateFocusStreak();
      saveData();
      renderFocusStats();
      renderAnalytics();
    }
  }
});

let studyInterval = null;
let studyRemainingMs = 45 * 60 * 1000;

let audioContext = null;
let ambientSource = null;

function getWarningMs() {
  return state.settings.warningHours * 60 * 60 * 1000;
}
function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, "utf-8");
      const parsed = JSON.parse(raw);
      return mergeDefaults(parsed);
    }
  } catch (error) {
    console.warn("data.json o'qilmadi", error);
  }

  const fallback = localStorage.getItem("ultimate-productivity-data");
  if (fallback) {
    try {
      return mergeDefaults(JSON.parse(fallback));
    } catch (error) {
      console.warn("localStorage ma'lumoti o'qilmadi", error);
    }
  }

  return structuredClone(defaultData);
}

function mergeDefaults(data) {
  return {
    ...structuredClone(defaultData),
    ...data,
    settings: { ...defaultData.settings, ...data.settings },
    focus: { ...defaultData.focus, ...data.focus },
    focusHistory: { ...defaultData.focusHistory, ...data.focusHistory },
    study: { ...defaultData.study, ...data.study },
    studySessions: data.studySessions || [],
    studyPlan: data.studyPlan || "",
    habits: data.habits || [],
    goals: data.goals || [],
    vocabulary: data.vocabulary || []
  };
}

function saveData() {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(state, null, 2));
  } catch (error) {
    console.warn("data.json yozilmadi", error);
  }
  localStorage.setItem("ultimate-productivity-data", JSON.stringify(state));
}

function render() {
  updateDeadlines();
  renderDashboard();
  renderTasks();
  renderKanban();
  renderFocusStats();
  renderVocabulary();
  renderStudyRoom();
  renderHabits();
  renderGoals();
  renderAnalytics();
  renderSettings();
}

function updateDeadlines() {
  const now = new Date();
  const warningMs = getWarningMs();
  state.tasks = state.tasks.map((task) => {
    const updated = updateTaskStatus(task, now, warningMs);
    if (updated.deadlineState !== task.deadlineState && updated.deadline) {
      const notifyKey = updated.deadlineState;
      if ((notifyKey === "warning" || notifyKey === "overdue") && task.lastNotified !== notifyKey) {
        notify(`${updated.title}: ${notifyKey === "warning" ? "Muddat yaqinlashmoqda" : "Vazifa muddati o'tdi"}`);
        updated.lastNotified = notifyKey;
      }
    }
    return updated;
  });
  saveData();
}

function renderDashboard() {
  const now = new Date();
  const today = now.toDateString();
  const upcomingLimit = new Date(now);
  upcomingLimit.setDate(now.getDate() + 7);

  const todayTasks = state.tasks.filter((task) => task.deadline && new Date(task.deadline).toDateString() === today);
  const overdueTasks = state.tasks.filter((task) => task.status === "overdue");
  const upcomingTasks = state.tasks.filter((task) => task.deadline && new Date(task.deadline) > now && new Date(task.deadline) <= upcomingLimit);
  const activeTasks = state.tasks.filter((task) => task.status !== "done");

  elements.todayTasks.innerHTML = renderStatList(todayTasks);
  elements.overdueTasks.innerHTML = renderStatList(overdueTasks);
  elements.upcomingTasks.innerHTML = renderStatList(upcomingTasks);
  elements.activeTasks.innerHTML = renderStatList(activeTasks);
}

function translateState(state) {
  if (state === "overdue") return "MUDDATI O'TGAN";
  if (state === "warning") return "YAQIN";
  if (state === "active") return "FAOL";
  return state.toUpperCase();
}

function renderStatList(tasks) {
  if (!tasks.length) return `<span class="task-meta">Vazifalar yo'q</span>`;
  const warningMs = getWarningMs();
  return tasks
    .slice(0, 4)
    .map((task) => {
      const { diffMs, state } = getDeadlineState(task.deadline, new Date(), warningMs);
      return `<div>${task.title}<span class="task-meta"> · ${translateState(state)} · ${formatCountdown(diffMs)}</span></div>`;
    })
    .join("");
}

function matchesSearch(task, query) {
  if (!query) return true;
  const text = `${task.title} ${task.description}`.toLowerCase();
  return text.includes(query);
}

function renderTasks() {
  const filtered = filterTasks(state.tasks, elements.filterStatus.value, elements.filterCategory.value);
  const query = (elements.taskSearch.value || "").toLowerCase().trim();
  const searched = filtered.filter((task) => matchesSearch(task, query));
  const sorted = sortByDeadline(searched);
  if (!sorted.length) {
    elements.tasksList.innerHTML = `<div class="task-meta">Hali vazifa yo'q. Yuqoridan qo'shing.</div>`;
    return;
  }

  const warningMs = getWarningMs();
  elements.tasksList.innerHTML = sorted
    .map((task) => {
      const { diffMs, state } = getDeadlineState(task.deadline, new Date(), warningMs);
      return `
        <div class="task-item" data-id="${task.id}">
          <div class="task-title">
            <strong>${task.title}</strong>
            <span>${task.description || "Tavsif yo'q"}</span>
          </div>
          <div class="task-meta">${task.category}</div>
          <div class="task-meta">Ustuvorlik: ${task.priority}</div>
          <div class="task-meta">${task.deadline ? new Date(task.deadline).toLocaleString() : "Muddat yo'q"}</div>
          <div class="task-status ${state}">${translateState(state)} · ${formatCountdown(diffMs)}</div>
          <div class="task-actions">
            <select class="status-select">
              <option value="not started" ${task.status === "not started" ? "selected" : ""}>Boshlanmagan</option>
              <option value="in progress" ${task.status === "in progress" ? "selected" : ""}>Jarayonda</option>
              <option value="done" ${task.status === "done" ? "selected" : ""}>Bajarildi</option>
              <option value="overdue" ${task.status === "overdue" ? "selected" : ""}>Muddati o'tgan</option>
            </select>
            <button class="details">Tafsilot</button>
            <button class="delete-task">O'chirish</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderKanban() {
  const todo = state.tasks.filter((t) => t.status === "not started");
  const progress = state.tasks.filter((t) => t.status === "in progress");
  const done = state.tasks.filter((t) => t.status === "done");

  elements.kanbanTodo.innerHTML = renderKanbanList(todo);
  elements.kanbanProgress.innerHTML = renderKanbanList(progress);
  elements.kanbanDone.innerHTML = renderKanbanList(done);
}

function renderKanbanList(list) {
  if (!list.length) return `<div class="task-meta">Bo'sh</div>`;
  return list
    .map((task) => {
      return `<div class="kanban-card" data-id="${task.id}">${task.title}</div>`;
    })
    .join("");
}
function renderFocusStats() {
  elements.focusMinutes.textContent = state.focus.totalMinutes;
  elements.sessionCount.textContent = state.focus.sessions;
  elements.focusStreak.textContent = `${state.focus.streak} kun`;
}

function renderVocabulary() {
  const todayKey = new Date().toDateString();
  const learnedToday = state.vocabulary.filter((vocab) => vocab.learnedDate === todayKey).length;
  elements.dailyGoal.textContent = `${state.settings.dailyGoal} so'z`;
  elements.todayLearned.textContent = learnedToday;
  elements.studyStreak.textContent = `${state.study.streak} kun`;

  if (!state.vocabulary.length) {
    elements.vocabList.innerHTML = `<div class="task-meta">Hali so'zlar qo'shilmagan.</div>`;
    return;
  }

  elements.vocabList.innerHTML = state.vocabulary
    .slice()
    .reverse()
    .map((word) => {
      return `
        <div class="vocab-item" data-id="${word.id}">
          <div>
            <strong>${word.term}</strong>
            <span class="task-meta">${word.learnedDate ? "O'rganildi" : "Kutilmoqda"}</span>
          </div>
          <button class="ghost mark-learned">${word.learnedDate ? "Qayta ko'rish" : "O'rganildi deb belgilash"}</button>
        </div>
      `;
    })
    .join("");
}

function renderStudyRoom() {
  elements.dailyPlan.value = state.studyPlan || "";
  if (!state.studySessions.length) {
    elements.studySessions.innerHTML = `<div class="task-meta">Hali sessiya qo'shilmagan.</div>`;
  } else {
    elements.studySessions.innerHTML = state.studySessions
      .slice()
      .reverse()
      .slice(0, 6)
      .map((session) => {
        return `
          <div class="session-item">
            <div>
              <strong>${session.topic}</strong>
              <span class="task-meta">${session.minutes} min · ${new Date(session.date).toLocaleString()}</span>
            </div>
          </div>
        `;
      })
      .join("");
  }

  const todayKey = new Date().toDateString();
  const todayMinutes = state.studySessions
    .filter((s) => new Date(s.date).toDateString() === todayKey)
    .reduce((sum, s) => sum + s.minutes, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekMinutes = state.studySessions
    .filter((s) => new Date(s.date) >= weekStart)
    .reduce((sum, s) => sum + s.minutes, 0);

  const topicCounts = {};
  state.studySessions.forEach((s) => {
    topicCounts[s.topic] = (topicCounts[s.topic] || 0) + 1;
  });
  const topTopic = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  elements.todayStudy.textContent = `${todayMinutes} min`;
  elements.weeklyStudy.textContent = `${weekMinutes} min`;
  elements.topTopic.textContent = topTopic;
}

function renderHabits() {
  if (!state.habits.length) {
    elements.habitList.innerHTML = `<div class="task-meta">Hali odatlar qo'shilmagan.</div>`;
    return;
  }

  elements.habitList.innerHTML = state.habits
    .map((habit) => {
      const percent = habit.history ? Math.min(Math.round((habit.history.length / 7) * 100), 100) : 0;
      return `
        <div class="habit-item" data-id="${habit.id}">
          <div>
            <strong>${habit.name}</strong>
            <span class="task-meta">${habit.frequency === "daily" ? "Har kuni" : "Haftalik"} · Streak: ${habit.streak}</span>
            <span class="task-meta">Haftalik bajarilish: ${percent}%</span>
          </div>
          <div>
            <button class="mark-habit">${isHabitDone(habit) ? "Bugun bajarildi" : "Bajarildi"}</button>
            <button class="delete-habit">O'chirish</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderGoals() {
  if (!state.goals.length) {
    elements.goalList.innerHTML = `<div class="task-meta">Hali maqsadlar yo'q.</div>`;
    return;
  }

  elements.goalList.innerHTML = state.goals
    .map((goal) => {
      const progress = Math.min(Math.max(goal.progress, 0), 100);
      return `
        <div class="goal-item" data-id="${goal.id}">
          <div>
            <strong>${goal.title}</strong>
            <span class="task-meta">Muddat: ${goal.deadline || "Belgilanmagan"}</span>
            <div class="goal-progress"><span style="width:${progress}%"></span></div>
          </div>
          <div>
            <input class="goal-progress-input" type="number" min="0" max="100" value="${progress}" />
            <button class="save-goal">Yangilash</button>
            <button class="delete-goal">O'chirish</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderAnalytics() {
  const dayKeys = getAnalyticsDayKeys();
  const dayKeySet = new Set(dayKeys);

  const getTaskAnalyticsKey = (task) => {
    if (task.status === "done") {
      const d = task.updatedAt ? new Date(task.updatedAt) : new Date(task.createdAt);
      return startOfDay(d).toDateString();
    }
    if (!task.deadline) return null;
    return startOfDay(new Date(task.deadline)).toDateString();
  };

  const completedTasks = state.tasks.filter((t) => t.status === "done" && dayKeySet.has(getTaskAnalyticsKey(t)));
  const pendingTasks = state.tasks.filter(
    (t) => t.status !== "done" && t.deadline && dayKeySet.has(getTaskAnalyticsKey(t))
  );

  const completed = completedTasks.length;
  const pending = pendingTasks.length;

  const rangeFocusMinutes = dayKeys.reduce((sum, key) => sum + (state.focusHistory[key] || 0), 0);
  const tasksInRange = [...completedTasks, ...pendingTasks];

  elements.completedCount.textContent = completed;
  elements.pendingCount.textContent = pending;
  elements.focusTime.textContent = formatMinutes(rangeFocusMinutes);

  const score = computeProductivityScore(tasksInRange, rangeFocusMinutes, state.focus.streak);
  if (elements.productivityScore) elements.productivityScore.textContent = score;

  if (elements.analyticsRangeLabel && analyticsRange.startDate && analyticsRange.endDate) {
    elements.analyticsRangeLabel.textContent = formatRangeLabel(analyticsRange.startDate, analyticsRange.endDate);
  }

  if (elements.weeklyChartTitle) {
    elements.weeklyChartTitle.textContent = `Haftalik bajarilgan vazifalar (${dayKeys.length} kun)`;
  }
  if (elements.focusChartTitle) {
    elements.focusChartTitle.textContent = `Fokus vaqti (${dayKeys.length} kun)`;
  }

  drawWeeklyChart(dayKeys);
  drawFocusLineChart(dayKeys);
  drawCompletionDonut(completed, pending);
}

function renderSettings() {
  elements.warningHours.value = state.settings.warningHours;
  elements.dailyGoalInput.value = state.settings.dailyGoal;
}
function drawWeeklyChart(dayKeys = getAnalyticsDayKeys()) {
  const ctx = elements.weeklyChart.getContext("2d");
  const data = weeklyCompletion(state.tasks, dayKeys);
  const width = (elements.weeklyChart.width = elements.weeklyChart.offsetWidth);
  const height = elements.weeklyChart.height;
  ctx.clearRect(0, 0, width, height);

  const max = Math.max(...data, 1);
  const barWidth = data.length ? width / data.length : width;

  data.forEach((value, index) => {
    const barHeight = (value / max) * (height - 20);
    const x = index * barWidth + 10;
    const y = height - barHeight - 10;

    ctx.fillStyle = "rgba(56, 189, 248, 0.7)";
    ctx.fillRect(x, y, barWidth - 20, barHeight);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Inter";
    ctx.fillText(value, x + 4, y - 6);
  });
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toDateString());
  }
  return days;
}

function addFocusHistory(minutes) {
  const key = new Date().toDateString();
  state.focusHistory[key] = (state.focusHistory[key] || 0) + minutes;
}

function drawFocusLineChart(dayKeys = getAnalyticsDayKeys()) {
  const ctx = elements.focusLineChart.getContext("2d");
  const labels = dayKeys;
  const data = labels.map((label) => state.focusHistory[label] || 0);

  const width = (elements.focusLineChart.width = elements.focusLineChart.offsetWidth);
  const height = elements.focusLineChart.height;
  ctx.clearRect(0, 0, width, height);

  const max = Math.max(...data, 10);
  const padding = 20;
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  data.forEach((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - (value / max) * (height - padding * 2);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "rgba(56, 189, 248, 0.9)";
  data.forEach((value, index) => {
    const x = padding + index * stepX;
    const y = height - padding - (value / max) * (height - padding * 2);
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px Inter";
    ctx.fillText(`${value}m`, x - 6, y - 10);
    ctx.fillStyle = "rgba(56, 189, 248, 0.9)";
  });
}

function drawCompletionDonut(completed, pending) {
  const ctx = elements.completionDonut.getContext("2d");
  const total = Math.max(completed + pending, 1);
  const width = (elements.completionDonut.width = elements.completionDonut.offsetWidth);
  const height = elements.completionDonut.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 10;

  ctx.clearRect(0, 0, width, height);

  const completedAngle = (completed / total) * Math.PI * 2;

  ctx.lineWidth = 16;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(34, 197, 94, 0.9)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, completedAngle - Math.PI / 2);
  ctx.stroke();

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "18px Poppins";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const percent = Math.round((completed / total) * 100);
  ctx.fillText(`${percent}%`, centerX, centerY);
}

function handleQuickAdd(event) {
  event.preventDefault();
  try {
    if (!elements.taskTitle?.value?.trim()) return;

    const task = createTask({
      title: elements.taskTitle.value,
      description: elements.taskDescription?.value,
      category: elements.taskCategory?.value,
      priority: elements.taskPriority?.value,
      deadline: elements.taskDeadline?.value
    });

    task.repeat = elements.taskRepeat?.value || "none";
    task.subtasks = [];

    state.tasks.unshift(task);
    saveData();
    elements.quickAddForm?.reset();
    render();
  } catch (error) {
    console.error("Quick add failed", error);
    notify(`Task qo'shilmadi: ${error?.message || String(error)}`);
  }
}

function openTaskModal(task) {
  elements.taskModal.classList.add("active");
  const subtasks = task.subtasks || [];
  elements.taskModalBody.innerHTML = `
    <div>
      <strong>${task.title}</strong>
      <div class="task-meta">${task.description || "Tavsif yo'q"}</div>
    </div>
    <label>Repeat
      <select id="modalRepeat">
        <option value="none" ${task.repeat === "none" ? "selected" : ""}>Yo'q</option>
        <option value="daily" ${task.repeat === "daily" ? "selected" : ""}>Har kuni</option>
        <option value="weekly" ${task.repeat === "weekly" ? "selected" : ""}>Haftalik</option>
      </select>
    </label>
    <div>
      <h4>Subtasklar</h4>
      <div class="subtask-list">
        ${subtasks
          .map(
            (sub) => `
            <div class="subtask-item" data-subid="${sub.id}">
              <span>${sub.title}</span>
              <button class="ghost toggle-sub">${sub.done ? "Qayta" : "Bajarildi"}</button>
            </div>`
          )
          .join("")}
      </div>
      <div class="study-actions" style="margin-top:10px;">
        <input id="newSubtask" type="text" placeholder="Subtask nomi" />
        <button id="addSubtask" class="primary">Qo'shish</button>
      </div>
    </div>
    <button id="saveTaskModal" class="primary">Saqlash</button>
  `;

  elements.taskModalBody.querySelector("#addSubtask").addEventListener("click", () => {
    const input = elements.taskModalBody.querySelector("#newSubtask");
    const title = input.value.trim();
    if (!title) return;
    task.subtasks = task.subtasks || [];
    task.subtasks.push({ id: randomId(), title, done: false });
    saveData();
    openTaskModal(task);
  });

  elements.taskModalBody.querySelectorAll(".toggle-sub").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const subId = e.target.closest(".subtask-item").dataset.subid;
      const sub = task.subtasks.find((s) => s.id === subId);
      if (!sub) return;
      sub.done = !sub.done;
      saveData();
      openTaskModal(task);
    });
  });

  elements.taskModalBody.querySelector("#saveTaskModal").addEventListener("click", () => {
    const repeatValue = elements.taskModalBody.querySelector("#modalRepeat").value;
    task.repeat = repeatValue;
    saveData();
    elements.taskModal.classList.remove("active");
    render();
  });
}

function handleTasksClick(event) {
  const taskElement = event.target.closest(".task-item");
  if (!taskElement) return;
  const taskId = taskElement.dataset.id;
  const taskIndex = state.tasks.findIndex((task) => task.id === taskId);
  if (taskIndex === -1) return;
  const task = state.tasks[taskIndex];

  if (event.target.classList.contains("delete-task")) {
    state.tasks.splice(taskIndex, 1);
    saveData();
    render();
    return;
  }

  if (event.target.classList.contains("details")) {
    openTaskModal(task);
  }
}

function handleTasksChange(event) {
  if (!event.target.classList.contains("status-select")) return;
  const taskElement = event.target.closest(".task-item");
  if (!taskElement) return;
  const taskId = taskElement.dataset.id;
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  const prevStatus = task.status;
  task.status = event.target.value;
  task.updatedAt = new Date().toISOString();

  if (task.status === "done" && prevStatus !== "done") {
    handleRepeatTask(task);
  }

  saveData();
  render();
}

function handleRepeatTask(task) {
  if (!task.repeat || task.repeat === "none") return;
  const next = { ...task };
  next.id = randomId();
  next.status = "not started";
  next.updatedAt = new Date().toISOString();
  next.createdAt = new Date().toISOString();

  const base = task.deadline ? new Date(task.deadline) : new Date();
  if (task.repeat === "daily") base.setDate(base.getDate() + 1);
  if (task.repeat === "weekly") base.setDate(base.getDate() + 7);
  next.deadline = base.toISOString().slice(0, 16);

  state.tasks.unshift(next);
}

function handleKanbanClick(event) {
  const card = event.target.closest(".kanban-card");
  if (!card) return;
  const task = state.tasks.find((t) => t.id === card.dataset.id);
  if (!task) return;
  openTaskModal(task);
}
function handleVocabAdd() {
  const term = elements.vocabInput.value.trim();
  if (!term) return;
  state.vocabulary.push({
    id: randomId(),
    term,
    learnedDate: ""
  });
  elements.vocabInput.value = "";
  saveData();
  renderVocabulary();
}

function handleVocabClick(event) {
  const item = event.target.closest(".vocab-item");
  if (!item) return;
  const id = item.dataset.id;
  const vocab = state.vocabulary.find((word) => word.id === id);
  if (!vocab) return;

  if (event.target.classList.contains("mark-learned")) {
    if (!vocab.learnedDate) {
      vocab.learnedDate = new Date().toDateString();
      updateStudyStreak();
      saveData();
      renderVocabulary();
      notify(`A'lo! O'rganildi: ${vocab.term}`);
    } else {
      vocab.learnedDate = "";
      saveData();
      renderVocabulary();
    }
  }
}

function handleStudySession() {
  const topic = elements.studyTopic.value.trim();
  const minutes = Number(elements.studyMinutes.value);
  if (!topic || !minutes) return;

  state.studySessions.push({
    id: randomId(),
    topic,
    minutes,
    date: new Date().toISOString()
  });
  elements.studyTopic.value = "";
  elements.studyMinutes.value = "";
  updateStudyStreak();
  saveData();
  renderStudyRoom();
  notify("O'quv sessiyasi qo'shildi");
}

function handleSaveDailyPlan() {
  state.studyPlan = elements.dailyPlan.value.trim();
  saveData();
  notify("Reja saqlandi");
}

function handleHabitAdd() {
  const name = elements.habitInput.value.trim();
  if (!name) return;
  state.habits.push({
    id: randomId(),
    name,
    frequency: elements.habitFrequency.value,
    streak: 0,
    lastDone: "",
    history: []
  });
  elements.habitInput.value = "";
  saveData();
  renderHabits();
}

function isHabitDone(habit) {
  return habit.lastDone === new Date().toDateString();
}

function handleHabitClick(event) {
  const item = event.target.closest(".habit-item");
  if (!item) return;
  const id = item.dataset.id;
  const habit = state.habits.find((h) => h.id === id);
  if (!habit) return;

  if (event.target.classList.contains("delete-habit")) {
    state.habits = state.habits.filter((h) => h.id !== id);
    saveData();
    renderHabits();
    return;
  }

  if (event.target.classList.contains("mark-habit")) {
    const today = new Date();
    const todayKey = today.toDateString();
    if (habit.lastDone === todayKey) return;

    if (habit.lastDone) {
      const last = new Date(habit.lastDone);
      const diff = Math.floor((today - last) / (1000 * 60 * 60 * 24));
      if (habit.frequency === "daily") {
        habit.streak = diff === 1 ? habit.streak + 1 : 1;
      } else {
        habit.streak = diff <= 7 ? habit.streak + 1 : 1;
      }
    } else {
      habit.streak = 1;
    }
    habit.lastDone = todayKey;
    habit.history = habit.history || [];
    habit.history.push(todayKey);
    habit.history = habit.history.slice(-30);
    saveData();
    renderHabits();
  }
}

function handleGoalAdd() {
  const title = elements.goalInput.value.trim();
  const deadline = elements.goalDeadline.value;
  const progress = Number(elements.goalProgress.value) || 0;
  if (!title) return;

  state.goals.push({
    id: randomId(),
    title,
    deadline,
    progress
  });
  elements.goalInput.value = "";
  elements.goalDeadline.value = "";
  elements.goalProgress.value = "";
  saveData();
  renderGoals();
}

function handleGoalClick(event) {
  const item = event.target.closest(".goal-item");
  if (!item) return;
  const id = item.dataset.id;
  const goal = state.goals.find((g) => g.id === id);
  if (!goal) return;

  if (event.target.classList.contains("delete-goal")) {
    state.goals = state.goals.filter((g) => g.id !== id);
    saveData();
    renderGoals();
    return;
  }

  if (event.target.classList.contains("save-goal")) {
    const input = item.querySelector(".goal-progress-input");
    goal.progress = Math.min(Math.max(Number(input.value) || 0, 0), 100);
    saveData();
    renderGoals();
  }
}

function generateDailyReview() {
  const todayKey = new Date().toDateString();
  const completed = state.tasks.filter((t) => t.status === "done" && new Date(t.updatedAt).toDateString() === todayKey).length;
  const pending = state.tasks.filter((t) => t.status !== "done").length;
  const studyMinutes = state.studySessions.filter((s) => new Date(s.date).toDateString() === todayKey).reduce((sum, s) => sum + s.minutes, 0);

  elements.reviewOutput.textContent = `Daily review\n- Bajarildi: ${completed}\n- Kutilmoqda: ${pending}\n- O'quv vaqti: ${studyMinutes} min\n- Fokus: ${state.focus.totalMinutes} min`;
}

function generateWeeklyReview() {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const completed = state.tasks.filter((t) => t.status === "done" && new Date(t.updatedAt) >= weekStart).length;
  const overdue = state.tasks.filter((t) => t.status === "overdue").length;
  const focusMinutes = Object.values(state.focusHistory).reduce((sum, m) => sum + m, 0);
  const studyMinutes = state.studySessions.filter((s) => new Date(s.date) >= weekStart).reduce((sum, s) => sum + s.minutes, 0);

  elements.reviewOutput.textContent = `Weekly review\n- Bajarildi: ${completed}\n- Overdue: ${overdue}\n- Fokus: ${focusMinutes} min\n- O'quv: ${studyMinutes} min`;
}

function exportJson() {
  const file = path.join(__dirname, `export-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
  notify("JSON eksport tayyor");
}

function exportCsv() {
  const file = path.join(__dirname, `tasks-${Date.now()}.csv`);
  const header = "Title,Description,Category,Priority,Status,Deadline";
  const rows = state.tasks.map((t) => [t.title, t.description, t.category, t.priority, t.status, t.deadline].map(escapeCsv).join(","));
  fs.writeFileSync(file, [header, ...rows].join("\n"));
  notify("CSV eksport tayyor");
}

function backupNow() {
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  const file = path.join(backupDir, `backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
  notify("Backup yaratildi");
}

function escapeCsv(value) {
  const safe = (value ?? "").toString().replace(/"/g, '""');
  return `"${safe}"`;
}

function updateStudyStreak() {
  const today = new Date().toDateString();
  if (state.study.lastStudyDate === today) return;

  if (state.study.lastStudyDate) {
    const last = new Date(state.study.lastStudyDate);
    const diff = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
    state.study.streak = diff === 1 ? state.study.streak + 1 : 1;
  } else {
    state.study.streak = 1;
  }
  state.study.lastStudyDate = today;
}

function updateFocusStreak() {
  const today = new Date().toDateString();
  if (state.focus.lastFocusDate === today) return;

  if (state.focus.lastFocusDate) {
    const last = new Date(state.focus.lastFocusDate);
    const diff = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
    state.focus.streak = diff === 1 ? state.focus.streak + 1 : 1;
  } else {
    state.focus.streak = 1;
  }
  state.focus.lastFocusDate = today;
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function notify(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  setTimeout(() => elements.toast.classList.remove("show"), 2500);

  if ("Notification" in window) {
    try {
      new Notification("Ultimate Productivity OS", { body: message });
    } catch (error) {
      console.warn("Bildirishnoma xatosi", error);
    }
  }
}
function setupNavigation() {
  const navButtons = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll("[data-view-section]");
  if (!navButtons.length || !sections.length) return;

  const mainContent = document.querySelector(".main-content");

  const applyView = (view) => {
    navButtons.forEach((item) => {
      item.classList.toggle("active", item.dataset.view === view);
    });
    sections.forEach((section) => {
      section.style.display = section.dataset.viewSection === view ? "block" : "none";
    });

    if (mainContent) mainContent.scrollTop = 0;
  };

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyView(button.dataset.view || "dashboard");
    });
  });

  // Initial view: respect the button that is pre-marked as active.
  const initialActive = document.querySelector(".nav-item.active");
  applyView(initialActive?.dataset.view || "dashboard");
}

function setupPomodoroControls() {
  try {
    elements.pomodoroStart?.addEventListener("click", () => pomodoro.start());
    elements.pomodoroPause?.addEventListener("click", () => pomodoro.pause());
    elements.pomodoroReset?.addEventListener("click", () => pomodoro.reset());
    elements.applyPomodoro?.addEventListener("click", () => {
      pomodoro.setDurations(Number(elements.workDuration?.value ?? 25), Number(elements.breakDuration?.value ?? 5));
    });

    elements.focusStart?.addEventListener("click", () => pomodoro.start());
    elements.focusPause?.addEventListener("click", () => pomodoro.pause());
    elements.focusReset?.addEventListener("click", () => pomodoro.reset());
  } catch (error) {
    console.warn("Pomodoro controls init failed", error);
  }
}

function setupStudyMode() {
  try {
    elements.enterStudyMode?.addEventListener("click", () => {
      elements.studyOverlay?.classList.add("active");
    });
    elements.exitStudyMode?.addEventListener("click", () => {
      if (elements.lockStudyUi?.checked) return;
      elements.studyOverlay?.classList.remove("active");
    });
    elements.lockStudyUi?.addEventListener("change", () => {
      if (elements.exitStudyMode) elements.exitStudyMode.disabled = elements.lockStudyUi.checked;
    });

    elements.studyStart?.addEventListener("click", () => {
      if (studyInterval) return;
      studyInterval = setInterval(() => {
        studyRemainingMs -= 1000;
        if (studyRemainingMs <= 0) {
          clearInterval(studyInterval);
          studyInterval = null;
          notify("Study sessiya tugadi");
        }
        if (elements.studyTimer) elements.studyTimer.textContent = formatTime(studyRemainingMs);
      }, 1000);
    });

    elements.studyPause?.addEventListener("click", () => {
      clearInterval(studyInterval);
      studyInterval = null;
    });

    elements.studyReset?.addEventListener("click", () => {
      clearInterval(studyInterval);
      studyInterval = null;
      studyRemainingMs = 45 * 60 * 1000;
      if (elements.studyTimer) elements.studyTimer.textContent = formatTime(studyRemainingMs);
    });
  } catch (error) {
    console.warn("Study mode controls init failed", error);
  }
}

function setupFocusOverlay() {
  try {
    elements.enterFocus?.addEventListener("click", () => {
      elements.focusOverlay?.classList.add("active");
    });

    elements.exitFocus?.addEventListener("click", () => {
      if (elements.lockUi?.checked) return;
      elements.focusOverlay?.classList.remove("active");
    });

    elements.lockUi?.addEventListener("change", () => {
      if (elements.exitFocus) elements.exitFocus.disabled = elements.lockUi.checked;
    });
  } catch (error) {
    console.warn("Focus overlay init failed", error);
  }
}

function setupAmbientSound() {
  try {
    elements.ambientSound?.addEventListener("change", (event) => {
      const value = event.target.value;
      stopAmbient();
      if (value === "none") return;
      if (!audioContext) audioContext = new AudioContext();

      if (value === "rain") {
        ambientSource = createNoise(audioContext);
      } else {
        ambientSource = createLofi(audioContext);
      }
      ambientSource.start();
    });
  } catch (error) {
    console.warn("Ambient sound init failed", error);
  }
}

function createNoise(context) {
  const bufferSize = context.sampleRate * 2;
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 0.2 - 0.1;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(context.destination);
  return source;
}

function createLofi(context) {
  const oscillator = context.createOscillator();
  oscillator.type = "triangle";
  oscillator.frequency.value = 196;
  const gain = context.createGain();
  gain.gain.value = 0.05;
  oscillator.connect(gain).connect(context.destination);
  return oscillator;
}

function stopAmbient() {
  if (!ambientSource) return;
  try {
    ambientSource.stop();
  } catch (error) {
    console.warn("Ambient to'xtamadi", error);
  }
  ambientSource = null;
}

function startCountdowns() {
  setInterval(() => {
    render();
    smartReminders();
  }, 1000);
}

function smartReminders() {
  const now = new Date();
  if (now.getMinutes() !== 0 || now.getSeconds() > 3) return;

  if (now.getHours() >= 18) {
    const pendingHabits = state.habits.filter((h) => !isHabitDone(h));
    if (pendingHabits.length) notify(`Bugun ${pendingHabits.length} ta odat bajarilmadi`);
  }

  const todayKey = now.toDateString();
  const learnedToday = state.vocabulary.filter((v) => v.learnedDate === todayKey).length;
  if (learnedToday < state.settings.dailyGoal) {
    notify(`Kunlik lug'at maqsadi: ${learnedToday}/${state.settings.dailyGoal}`);
  }
}

function saveSettings() {
  const warningHours = Number(elements.warningHours.value);
  const dailyGoal = Number(elements.dailyGoalInput.value);
  state.settings.warningHours = Number.isFinite(warningHours) ? warningHours : 24;
  state.settings.dailyGoal = Number.isFinite(dailyGoal) ? dailyGoal : 10;
  saveData();
  render();
  notify("Sozlamalar yangilandi");
}

function setupEventListeners() {
  try {
    elements.quickAddForm?.addEventListener("submit", handleQuickAdd);
    elements.tasksList?.addEventListener("click", handleTasksClick);
    elements.tasksList?.addEventListener("change", handleTasksChange);
    elements.kanbanTodo?.addEventListener("click", handleKanbanClick);
    elements.kanbanProgress?.addEventListener("click", handleKanbanClick);
    elements.kanbanDone?.addEventListener("click", handleKanbanClick);
    elements.filterStatus?.addEventListener("change", renderTasks);
    elements.filterCategory?.addEventListener("change", renderTasks);
    elements.taskSearch?.addEventListener("input", renderTasks);
    elements.addVocab?.addEventListener("click", handleVocabAdd);
    elements.vocabList?.addEventListener("click", handleVocabClick);
    elements.addStudySession?.addEventListener("click", handleStudySession);
    elements.saveDailyPlan?.addEventListener("click", handleSaveDailyPlan);
    elements.addHabit?.addEventListener("click", handleHabitAdd);
    elements.habitList?.addEventListener("click", handleHabitClick);
    elements.addGoal?.addEventListener("click", handleGoalAdd);
    elements.goalList?.addEventListener("click", handleGoalClick);
    elements.generateDailyReview?.addEventListener("click", generateDailyReview);
    elements.generateWeeklyReview?.addEventListener("click", generateWeeklyReview);
    elements.exportJson?.addEventListener("click", exportJson);
    elements.exportCsv?.addEventListener("click", exportCsv);
    elements.backupNow?.addEventListener("click", backupNow);
    elements.saveSettings?.addEventListener("click", saveSettings);
    elements.openSettings?.addEventListener("click", () => {
      document.querySelector(".nav-item[data-view='settings']")?.click();
    });
    elements.closeTaskModal?.addEventListener("click", () => {
      elements.taskModal?.classList.remove("active");
    });

    elements.vocabInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") handleVocabAdd();
    });

    setupAnalyticsRangeControls();
  } catch (error) {
    console.warn("Event listeners init failed", error);
  }
}

setupNavigation();
setupPomodoroControls();
setupStudyMode();
setupFocusOverlay();
setupAmbientSound();
setupEventListeners();
render();
startCountdowns();
