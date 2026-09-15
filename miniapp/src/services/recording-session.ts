export const AUTO_RECORD_DURATION_MS = 3600;
export const RECORDING_WATCHDOG_MS = 4300;

interface ActiveRecording {
  id: string;
  generation: number;
  processing: boolean;
}

/** Prevents late and duplicate recorder callbacks from submitting an answer. */
export class VoiceRecordingGuard {
  private generation = 0;
  private active: ActiveRecording | null = null;

  begin(id: string) {
    this.generation += 1;
    this.active = { id, generation: this.generation, processing: false };
    return this.generation;
  }

  beginProcessing(id: string) {
    if (!this.active || this.active.id !== id || this.active.processing) return null;
    this.active.processing = true;
    return this.active.generation;
  }

  isCurrent(id: string, generation: number) {
    return this.active?.id === id && this.active.generation === generation;
  }

  finish(id: string, generation: number) {
    if (!this.isCurrent(id, generation)) return false;
    this.active = null;
    return true;
  }

  cancel() {
    this.generation += 1;
    this.active = null;
  }
}
