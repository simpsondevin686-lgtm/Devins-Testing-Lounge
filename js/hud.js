import { formatAge, formatSci } from './utils.js';

export class HUD {
  constructor() {
    this.type = document.getElementById('hud-type');
    this.stage = document.getElementById('hud-stage');
    this.age = document.getElementById('hud-age');
    this.mass = document.getElementById('hud-mass');
    this.temp = document.getElementById('hud-temp');
    this.radius = document.getElementById('hud-radius');
    this.lum = document.getElementById('hud-lum');
  }

  update(state, ageYears) {
    this.type.textContent = state.typeLabel;
    this.stage.textContent = state.stageName;
    this.age.textContent = formatAge(ageYears);
    this.mass.textContent = `${state.massSolar.toFixed(2)} M☉`;
    this.temp.textContent = state.isBlackHole ? '—' : `${Math.round(state.temperature).toLocaleString()} K`;
    this.radius.textContent = state.isBlackHole ? '—' : `${formatSci(state.radiusSolar)} R☉`;
    this.lum.textContent = state.isBlackHole ? '—' : `${formatSci(state.luminositySolar)} L☉`;
  }
}
