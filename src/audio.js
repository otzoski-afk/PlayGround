// Tiny WebAudio chiptune engine: generated sound effects plus a looping
// original melody, so the game ships without any audio files.
const SEMITONE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

function noteToFreq(name) {
  const match = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!match) return 0;
  const midi = (Number(match[2]) + 1) * 12 + SEMITONE[match[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const MELODY = [
  'G4', 'B4', 'D5', 'B4', 'G4', 'A4', 'B4', null,
  'A4', 'C5', 'E5', 'C5', 'A4', 'G4', 'A4', null,
  'B4', 'D5', 'G5', 'D5', 'B4', 'A4', 'G4', null,
  'E4', 'G4', 'A4', 'B4', 'D5', 'B4', 'G4', null,
];
const BASS = ['G2', 'G2', 'A2', 'A2', 'B2', 'B2', 'E2', 'E2', 'G2', 'G2', 'D2', 'D2', 'E2', 'E2', 'G2', 'D2'];

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicOn = false;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.stepDur = 0.2; // eighth notes at 150 bpm
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.32;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.32, this.ctx.currentTime, 0.02);
    }
  }

  tone(freq, duration, { type = 'square', volume = 0.3, slide = 0, delay = 0, attack = 0.005 } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  noise(duration, { volume = 0.2, delay = 0, freq = 1200 } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(this.master);
    source.start(t0);
  }

  jump() { this.tone(330, 0.16, { type: 'square', volume: 0.22, slide: 480 }); }
  bigJump() { this.tone(280, 0.2, { type: 'square', volume: 0.24, slide: 560 }); }
  coin() {
    this.tone(noteToFreq('B5'), 0.09, { type: 'square', volume: 0.2 });
    this.tone(noteToFreq('E6'), 0.26, { type: 'square', volume: 0.2, delay: 0.07 });
  }
  bump() { this.tone(150, 0.1, { type: 'square', volume: 0.18, slide: -60 }); }
  brick() { this.noise(0.18, { volume: 0.26, freq: 900 }); this.tone(110, 0.14, { type: 'square', volume: 0.14, slide: -50 }); }
  stomp() { this.tone(200, 0.12, { type: 'square', volume: 0.22, slide: -110 }); this.noise(0.09, { volume: 0.16, freq: 500 }); }
  kick() { this.tone(420, 0.1, { type: 'square', volume: 0.18, slide: -220 }); }
  power() {
    const notes = ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'];
    notes.forEach((n, i) => this.tone(noteToFreq(n), 0.14, { type: 'square', volume: 0.2, delay: i * 0.055 }));
  }
  grow() {
    const notes = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'];
    notes.forEach((n, i) => this.tone(noteToFreq(n), 0.1, { type: 'triangle', volume: 0.22, delay: i * 0.045 }));
  }
  fire() { this.tone(700, 0.09, { type: 'sawtooth', volume: 0.14, slide: -420 }); }
  hurt() { this.tone(340, 0.32, { type: 'square', volume: 0.22, slide: -260 }); }
  die() {
    this.stopMusic();
    const notes = ['B4', 'F4', 'D4', 'B3', 'G3', 'E3', 'C3'];
    notes.forEach((n, i) => this.tone(noteToFreq(n), 0.24, { type: 'square', volume: 0.22, delay: i * 0.11 }));
  }
  flag() {
    this.stopMusic();
    const notes = ['C5', 'E5', 'G5', 'C6', 'G5', 'C6'];
    notes.forEach((n, i) => this.tone(noteToFreq(n), 0.2, { type: 'square', volume: 0.2, delay: i * 0.1 }));
  }
  clear() {
    const notes = ['C5', 'C5', 'C5', 'C5', 'G4', 'A4', 'C5', 'A4', 'C5', 'E5'];
    notes.forEach((n, i) => this.tone(noteToFreq(n), 0.26, { type: 'square', volume: 0.2, delay: i * 0.14 }));
  }
  tick() { this.tone(1200, 0.04, { type: 'square', volume: 0.08 }); }

  startMusic() {
    if (!this.ensure() || this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 40);
  }

  stopMusic() {
    this.musicOn = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    if (!this.ctx || !this.musicOn) return;
    const horizon = this.ctx.currentTime + 0.18;
    while (this.nextTime < horizon) {
      const i = this.step % MELODY.length;
      const note = MELODY[i];
      const delay = Math.max(0, this.nextTime - this.ctx.currentTime);
      if (note) {
        this.tone(noteToFreq(note), this.stepDur * 0.86, { type: 'square', volume: 0.11, delay });
      }
      if (i % 2 === 0) {
        const bass = BASS[(this.step >> 1) % BASS.length];
        this.tone(noteToFreq(bass), this.stepDur * 1.7, { type: 'triangle', volume: 0.13, delay });
      }
      if (i % 4 === 2) this.noise(0.05, { volume: 0.035, freq: 6000, delay });
      this.step++;
      this.nextTime += this.stepDur;
    }
  }
}
