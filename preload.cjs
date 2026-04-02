const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("plannerApi", {
  loadState: () => ipcRenderer.invoke("planner:load-state"),
  saveState: (state) => ipcRenderer.invoke("planner:save-state", state),
  notifyTaskDue: (payload) => ipcRenderer.invoke("planner:notify-task-due", payload)
});
