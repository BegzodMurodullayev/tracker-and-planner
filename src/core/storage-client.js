import { clone, defaultState, normalizeState } from "./default-state.js";

const FALLBACK_STORAGE_KEY = "reja-plus-state";

function hasNativeBridge() {
  return Boolean(window.plannerApi?.loadState && window.plannerApi?.saveState);
}

function readFallbackState() {
  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (!raw) {
      return clone(defaultState);
    }

    return normalizeState(JSON.parse(raw));
  } catch (error) {
    console.error("Fallback ma'lumotni o'qishda xatolik:", error);
    return clone(defaultState);
  }
}

export async function loadState() {
  if (hasNativeBridge()) {
    try {
      const state = await window.plannerApi.loadState();
      return normalizeState(state);
    } catch (error) {
      console.error("IPC orqali yuklashda xatolik:", error);
    }
  }

  return readFallbackState();
}

export async function saveState(state) {
  const normalized = normalizeState(state);

  if (hasNativeBridge()) {
    try {
      await window.plannerApi.saveState(normalized);
      return normalized;
    } catch (error) {
      console.error("IPC orqali saqlashda xatolik:", error);
    }
  }

  try {
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.error("Fallback ma'lumotni saqlashda xatolik:", error);
  }

  return normalized;
}
