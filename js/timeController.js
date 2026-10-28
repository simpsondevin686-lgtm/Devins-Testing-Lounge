import { SECONDS_PER_YEAR, formatSpeed } from './utils.js';

export class TimeController {
  constructor({ onReset }) {
    this.speedSlider = document.getElementById('speed-slider');
    this.playBtn = document.getElementById('btn-play');
    this.resetBtn = document.getElementById('btn-reset');
    this.speedLabel = document.getElementById('speed-label');
    this.onReset = onReset;
    this.playing = true;

    this.speedSlider.addEventListener('input', () => this.updateLabel());
    this.playBtn.addEventListener('click', () => this.togglePlay());
    this.resetBtn.addEventListener('click', () => this.reset());

    this.updateLabel();
  }

  get yearsPerSecond() {
    const v = Number(this.speedSlider.value) / 1000;
    const minExp = 0;
    const maxExp = Math.log10(1e12 * SECONDS_PER_YEAR); // ~1e12 yr/s
    const exp = minExp + v * (maxExp - minExp);
    return Math.pow(10, exp) / SECONDS_PER_YEAR;
  }

  updateLabel() {
    this.speedLabel.textContent = formatSpeed(this.yearsPerSecond);
  }

  togglePlay() {
    this.playing = !this.playing;
    this.playBtn.textContent = this.playing ? '⏸' : '▶';
  }

  reset() {
    this.playing = true;
    this.playBtn.textContent = '⏸';
    this.onReset();
  }

  tick(deltaRealSeconds) {
    if (!this.playing) return 0;
    return deltaRealSeconds * this.yearsPerSecond;
  }
}
