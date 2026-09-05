let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.05) {
  const c = ac();
  if (!c) return;
  void c.resume();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0008, c.currentTime + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur);
}

export function sfxToss() {
  tone(220, 0.12, "triangle", 0.04);
  tone(440, 0.18, "sine", 0.03);
}

export function sfxClash() {
  tone(140, 0.09, "square", 0.035);
}

export function sfxWin() {
  tone(523, 0.12, "sine", 0.05);
  setTimeout(() => tone(784, 0.18, "sine", 0.05), 90);
}

export function sfxLose() {
  tone(180, 0.22, "sawtooth", 0.03);
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function waitMs(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function playDelay(fullMs: number) {
  return waitMs(prefersReducedMotion() ? Math.min(420, fullMs) : fullMs);
}
