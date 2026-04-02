export class PomodoroTimer {
  constructor({ workMinutes = 25, breakMinutes = 5, onTick, onPhaseChange, onSessionComplete }) {
    this.workMinutes = workMinutes;
    this.breakMinutes = breakMinutes;
    this.onTick = onTick;
    this.onPhaseChange = onPhaseChange;
    this.onSessionComplete = onSessionComplete;
    this.phase = "work";
    this.remainingMs = workMinutes * 60 * 1000;
    this.interval = null;
  }

  setDurations(workMinutes, breakMinutes) {
    this.workMinutes = workMinutes;
    this.breakMinutes = breakMinutes;
    if (!this.interval) {
      this.phase = "work";
      this.remainingMs = workMinutes * 60 * 1000;
      this.emitTick();
    }
  }

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => this.tick(), 1000);
  }

  pause() {
    clearInterval(this.interval);
    this.interval = null;
  }

  reset() {
    this.pause();
    this.phase = "work";
    this.remainingMs = this.workMinutes * 60 * 1000;
    this.emitTick();
  }

  tick() {
    this.remainingMs -= 1000;
    if (this.remainingMs <= 0) {
      this.completePhase();
    }
    this.emitTick();
  }

  completePhase() {
    if (this.onSessionComplete) this.onSessionComplete(this.phase);
    if (this.phase === "work") {
      this.phase = "break";
      this.remainingMs = this.breakMinutes * 60 * 1000;
    } else {
      this.phase = "work";
      this.remainingMs = this.workMinutes * 60 * 1000;
    }
    if (this.onPhaseChange) this.onPhaseChange(this.phase);
  }

  emitTick() {
    if (this.onTick) this.onTick(this.remainingMs, this.phase);
  }
}
