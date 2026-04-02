export class FocusTimer {
  constructor({ workMinutes = 25, breakMinutes = 5, onTick, onPhaseChange, onWorkComplete }) {
    this.workMinutes = workMinutes;
    this.breakMinutes = breakMinutes;
    this.onTick = onTick;
    this.onPhaseChange = onPhaseChange;
    this.onWorkComplete = onWorkComplete;
    this.phase = "work";
    this.remainingMs = workMinutes * 60 * 1000;
    this.interval = null;
    this.lastTick = 0;
  }

  setDurations(workMinutes, breakMinutes) {
    this.workMinutes = workMinutes;
    this.breakMinutes = breakMinutes;
    this.reset();
  }

  start() {
    if (this.interval) return;
    this.lastTick = Date.now();
    this.interval = setInterval(() => this.tick(), 250);
    this.emitTick();
  }

  stop() {
    if (!this.interval) return;
    clearInterval(this.interval);
    this.interval = null;
  }

  reset() {
    this.stop();
    this.phase = "work";
    this.remainingMs = this.workMinutes * 60 * 1000;
    this.lastTick = 0;
    this.emitTick();
    this.onPhaseChange?.(this.phase);
  }

  tick() {
    const now = Date.now();
    const elapsed = this.lastTick ? now - this.lastTick : 250;
    this.lastTick = now;
    this.remainingMs -= elapsed;

    if (this.remainingMs <= 0) {
      this.completePhase();
    }

    this.emitTick();
  }

  completePhase() {
    if (this.phase === "work") {
      this.onWorkComplete?.(this.workMinutes);
      this.phase = "break";
      this.remainingMs = this.breakMinutes * 60 * 1000;
    } else {
      this.phase = "work";
      this.remainingMs = this.workMinutes * 60 * 1000;
    }

    this.lastTick = Date.now();
    this.onPhaseChange?.(this.phase);
  }

  emitTick() {
    this.onTick?.(Math.max(0, this.remainingMs), this.phase);
  }
}

export function formatTimer(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getPhaseLabel(phase) {
  return phase === "break" ? "Dam olish vaqti" : "Ish vaqti";
}
