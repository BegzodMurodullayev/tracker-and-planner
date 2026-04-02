import fs from "fs";
import { app, BrowserWindow, ipcMain, Menu, Notification as ElectronNotification, Tray, nativeImage, shell } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { clone, defaultState, normalizeState } from "./src/core/default-state.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const smokeMode = process.env.REJA_SMOKE === "1";
const smokeResultPath = path.join(__dirname, "smoke-result.json");
const forcedUserDataPath = smokeMode
  ? path.join(app.getPath("temp"), "reja-plus-smoke")
  : path.join(app.getPath("appData"), "Reja+");

app.setPath("userData", forcedUserDataPath);

let mainWindow = null;
let tray = null;
let smokeWatchdog = null;
let isQuitting = false;
let hasShownTrayHint = false;

function getAppStatePath() {
  return path.join(app.getPath("userData"), "reja-plus-state.json");
}

function getLegacyProjectStatePath() {
  return path.join(__dirname, "data.json");
}

function getLegacyUserDataStatePath() {
  return path.join(app.getPath("appData"), "ultimate-productivity-os", "reja-plus-state.json");
}

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#5eead4" />
          <stop offset="100%" stop-color="#7dd3fc" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="16" fill="#0b1220" />
      <rect x="10" y="10" width="44" height="44" rx="14" fill="url(#g)" opacity="0.9" />
      <text x="32" y="38" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="700" fill="#06111b">R+</text>
    </svg>
  `;

  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}

function showMainWindow() {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
  mainWindow.setSkipTaskbar(false);
}

function hideToTray() {
  if (!mainWindow || smokeMode) return;
  mainWindow.hide();
  mainWindow.setSkipTaskbar(true);

  if (!hasShownTrayHint && ElectronNotification.isSupported()) {
    hasShownTrayHint = true;
    const notification = new ElectronNotification({
      title: "Reja+ fonda ishlamoqda",
      body: "Oynani yopganingizda ilova trayga yashirinadi va vazifalarni kuzatishda davom etadi.",
      silent: true
    });
    notification.on("click", () => showMainWindow());
    notification.show();
  }
}

function createTray() {
  if (tray || smokeMode) return;

  tray = new Tray(createTrayIcon());
  tray.setToolTip("Reja+");
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: "Ochish",
      click: () => showMainWindow()
    },
    {
      label: "Yashirish",
      click: () => hideToTray()
    },
    { type: "separator" },
    {
      label: "Chiqish",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]));
  tray.on("double-click", () => showMainWindow());
}

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Faylni o'qishda xatolik: ${filePath}`, error);
    return null;
  }
}

function writeJsonFile(filePath, value) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
  } catch (error) {
    console.error(`Faylni saqlashda xatolik: ${filePath}`, error);
  }
}

function loadPersistedState() {
  const appStatePath = getAppStatePath();
  const storedState = readJsonFile(appStatePath);
  if (storedState) {
    return normalizeState(storedState);
  }

  const legacyUserDataState = readJsonFile(getLegacyUserDataStatePath());
  if (legacyUserDataState) {
    const migrated = normalizeState(legacyUserDataState);
    writeJsonFile(appStatePath, migrated);
    return migrated;
  }

  const legacyProjectState = readJsonFile(getLegacyProjectStatePath());
  const migratedState = legacyProjectState ? normalizeState(legacyProjectState) : clone(defaultState);
  writeJsonFile(appStatePath, migratedState);
  return migratedState;
}

function recordSmokeResult(result) {
  writeJsonFile(smokeResultPath, result);
}

async function runSmokeTest(window) {
  try {
    const result = await window.webContents.executeJavaScript(`
      (async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const pad = (value) => String(value).padStart(2, "0");
        const toInputValue = (date) => {
          return date.getFullYear()
            + "-" + pad(date.getMonth() + 1)
            + "-" + pad(date.getDate())
            + "T" + pad(date.getHours())
            + ":" + pad(date.getMinutes())
            + ":" + pad(date.getSeconds());
        };

        await wait(800);

        document.getElementById("heroTaskButton")?.click();
        await wait(150);
        const taskPageActive = document.querySelector('[data-page="vazifalar"]')?.classList.contains("active") || false;
        const initialTasks = document.querySelectorAll("#taskList .item-card").length;
        document.getElementById("taskTitle").value = "Smoke vazifa";
        document.getElementById("taskDescription").value = "Terminal smoke test";
        document.getElementById("taskDeadline").value = toInputValue(new Date(Date.now() + 2000));
        document.getElementById("taskForm").requestSubmit();
        await wait(250);
        const taskAdded = document.querySelectorAll("#taskList .item-card").length > initialTasks;
        await wait(2500);
        const taskOverdue = document.querySelector("#taskList .status-chip")?.textContent.includes("Muddati o'tgan") || false;

        document.getElementById("heroDeadlineButton")?.click();
        await wait(150);
        const deadlinePageActive = document.querySelector('[data-page="muddatlar"]')?.classList.contains("active") || false;
        const initialDeadlines = document.querySelectorAll("#deadlineList .item-card").length;
        document.getElementById("deadlineTitle").value = "Smoke muddat";
        document.getElementById("deadlineDate").value = toInputValue(new Date(Date.now() + 2000));
        document.getElementById("deadlineForm").requestSubmit();
        await wait(250);
        const deadlineAdded = document.querySelectorAll("#deadlineList .item-card").length > initialDeadlines;
        await wait(2500);
        const deadlineOverdue = document.querySelector("#deadlineList .status-chip")?.textContent.includes("Muddati o'tgan") || false;

        document.querySelector('[data-route="fokus"]')?.click();
        await wait(150);
        const focusPageActive = document.querySelector('[data-page="fokus"]')?.classList.contains("active") || false;
        const before = document.getElementById("focusTimer").textContent;
        document.getElementById("focusStart")?.click();
        await wait(1400);
        const after = document.getElementById("focusTimer").textContent;
        document.getElementById("focusStop")?.click();

        return {
          taskPageActive,
          taskAdded,
          taskOverdue,
          deadlinePageActive,
          deadlineAdded,
          deadlineOverdue,
          focusPageActive,
          focusAdvanced: before !== after
        };
      })();
    `, true);

    const passed = Object.values(result).every(Boolean);
    recordSmokeResult({ passed, stage: "completed", ...result });
    if (!passed) {
      process.exitCode = 1;
    }
  } catch (error) {
    recordSmokeResult({ passed: false, stage: "execute-error", error: String(error) });
    process.exitCode = 1;
  } finally {
    clearTimeout(smokeWatchdog);
    setTimeout(() => app.quit(), 300);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1180,
    minHeight: 820,
    show: false,
    title: "Reja+",
    autoHideMenuBar: true,
    backgroundColor: "#080b14",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (smokeMode) {
    recordSmokeResult({ passed: false, stage: "window-created" });
    smokeWatchdog = setTimeout(() => {
      recordSmokeResult({ passed: false, stage: "timeout" });
      app.quit();
    }, 16000);
  }

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.once("ready-to-show", () => {
    if (!smokeMode) {
      mainWindow.show();
    }
  });
  mainWindow.on("close", (event) => {
    if (isQuitting || smokeMode) return;
    event.preventDefault();
    hideToTray();
  });
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    const label = level >= 2 ? "renderer-error" : "renderer-log";
    console.log(`[${label}] ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.once("did-finish-load", () => {
    if (smokeMode && mainWindow) {
      recordSmokeResult({ passed: false, stage: "did-finish-load" });
      void runSmokeTest(mainWindow);
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("planner:load-state", async () => loadPersistedState());
ipcMain.handle("planner:save-state", async (_event, nextState) => {
  const normalized = normalizeState(nextState);
  writeJsonFile(getAppStatePath(), normalized);
  return normalized;
});
ipcMain.handle("planner:notify-task-due", async (_event, payload) => {
  const title = typeof payload?.title === "string" && payload.title.trim() ? payload.title.trim() : "Vazifa";
  const description = typeof payload?.description === "string" && payload.description.trim() ? payload.description.trim() : "Izoh kiritilmagan.";
  const deadline = typeof payload?.deadline === "string" && payload.deadline.trim() ? payload.deadline.trim() : "hozir";

  shell.beep();
  setTimeout(() => shell.beep(), 450);
  setTimeout(() => shell.beep(), 900);

  if (ElectronNotification.isSupported()) {
    const notification = new ElectronNotification({
      title: `Vazifa muddati yetdi: ${title}`,
      body: `${description}\nVaqt: ${deadline}`,
      silent: false
    });
    notification.on("click", () => showMainWindow());
    notification.show();
  }

  return true;
});

app.whenReady().then(() => {
  createTray();
  createWindow();

  app.on("activate", () => {
    if (mainWindow) {
      showMainWindow();
      return;
    }

    createWindow();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && isQuitting) {
    app.quit();
  }
});
