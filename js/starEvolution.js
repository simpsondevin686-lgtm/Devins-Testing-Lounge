import { clamp, lerp, smooth, formatAge } from './utils.js';

const MS_TABLE = [
  { m: 0.10, T: 3000, R: 0.10, L: 0.001 },
  { m: 0.50, T: 4000, R: 0.50, L: 0.03 },
  { m: 0.80, T: 5000, R: 0.80, L: 0.20 },
  { m: 1.00, T: 5778, R: 1.00, L: 1.00 },
  { m: 1.50, T: 7000, R: 1.50, L: 5.00 },
  { m: 3.00, T: 11000, R: 2.50, L: 60 },
  { m: 6.00, T: 20000, R: 4.00, L: 800 },
  { m: 10.0, T: 30000, R: 6.00, L: 10000 },
  { m: 15.0, T: 35000, R: 7.00, L: 30000 },
  { m: 25.0, T: 40000, R: 10.0, L: 100000 },
];

function tableValue(mass, key) {
  if (mass <= MS_TABLE[0].m) return MS_TABLE[0][key];
  const last = MS_TABLE[MS_TABLE.length - 1];
  if (mass >= last.m) return last[key];
  for (let i = 0; i < MS_TABLE.length - 1; i++) {
    const a = MS_TABLE[i], b = MS_TABLE[i + 1];
    if (mass >= a.m && mass <= b.m) {
      const t = (Math.log10(mass) - Math.log10(a.m)) /
                (Math.log10(b.m) - Math.log10(a.m));
      if (key === 'L' || key === 'R') {
        return Math.pow(10, lerp(Math.log10(a[key]), Math.log10(b[key]), t));
      }
      return lerp(a[key], b[key], t);
    }
  }
  return MS_TABLE[0][key];
}

function spectralTypeFromTemp(T) {
  if (T >= 30000) return 'O';
  if (T >= 10000) return 'B';
  if (T >= 7500) return 'A';
  if (T >= 6000) return 'F';
  if (T >= 5200) return 'G';
  if (T >= 3700) return 'K';
  return 'M';
}

export class StarEvolution {
  constructor(massSolar) {
    this.mass = clamp(massSolar, 0.08, 30);
    this.msT = tableValue(this.mass, 'T');
    this.msR = tableValue(this.mass, 'R');
    this.msL = tableValue(this.mass, 'L');

    // Protostar / pre-main-sequence duration (yr)
    this.tPms = clamp(3e7 * Math.pow(this.mass, -1.5), 2e5, 2e9);

    // Main-sequence lifetime (yr)
    this.tMs = clamp(1e10 * Math.pow(this.mass, -2.5), 1e6, 1e14);

    // Red giant / supergiant duration
    this.tRg = clamp(this.tMs * 0.1, 1e5, 2e9);

    // Planetary nebula or supernova phase
    this.tPost = this.mass < 8 ? 5e4 : 1e3;

    // Remnant cooling / evolution
    this.tRemnant = this.mass < 8 ? 1e10 : (this.mass < 20 ? 1e8 : 1e10);

    this.tMsEnd = this.tPms + this.tMs;
    this.tRgEnd = this.tMsEnd + this.tRg;
    this.tPostEnd = this.tRgEnd + this.tPost;
    this.tTotal = this.tPostEnd + this.tRemnant;

    this.spectral = spectralTypeFromTemp(this.msT);
    this.isMassive = this.mass >= 8;
    this.isVeryMassive = this.mass >= 20;
  }

  stageAt(ageYears) {
    const age = Math.max(0, ageYears);
    let phase, stageName, temperature, radiusSolar, luminositySolar, activity;
    let isRemnant = false, isBlackHole = false, isSupernova = false;

    if (age < this.tPms) {
      // Protostar / T Tauri: large, cool, turbulent
      const p = smooth(age / this.tPms);
      temperature = lerp(2500, this.msT * 0.9, p);
      radiusSolar = lerp(50 * Math.sqrt(this.mass), this.msR * 1.6, p);
      luminositySolar = Math.pow(radiusSolar, 2) *
        Math.pow(temperature / 5778, 4);
      activity = lerp(0.9, 0.35, p);
      phase = 'protostar';
      stageName = 'Protostar / T Tauri';
    } else if (age < this.tMsEnd) {
      // Main sequence
      const p = (age - this.tPms) / this.tMs;
      temperature = lerp(this.msT * 0.95, this.msT * 1.05, p);
      radiusSolar = lerp(this.msR * 0.9, this.msR * 1.2, p);
      luminositySolar = lerp(this.msL * 0.7, this.msL * 1.5, p);
      activity = 0.18;
      phase = 'main_sequence';
      stageName = 'Main Sequence';
    } else if (age < this.tRgEnd) {
      // Red giant / red supergiant
      const p = smooth((age - this.tMsEnd) / this.tRg);
      const rgR = this.mass < 8
        ? 100 * Math.pow(this.mass, 0.5)
        : Math.min(1500, 800 * Math.pow(this.mass / 10, 0.6));
      temperature = lerp(this.msT * 1.05, 3500, p);
      radiusSolar = lerp(this.msR * 1.2, rgR, p);
      luminositySolar = Math.pow(radiusSolar, 2) *
        Math.pow(temperature / 5778, 4);
      activity = 0.65;
      phase = this.mass < 8 ? 'red_giant' : 'red_supergiant';
      stageName = this.mass < 8 ? 'Red Giant' : 'Red Supergiant';
    } else if (age < this.tPostEnd) {
      // Planetary nebula or supernova
      const p = smooth((age - this.tRgEnd) / this.tPost);
      if (this.mass < 8) {
        temperature = lerp(8000, 120000, p);
        radiusSolar = lerp(this.msR * 1.2, 0.02, p);
        luminositySolar = Math.pow(radiusSolar, 2) *
          Math.pow(temperature / 5778, 4);
        activity = 1.0;
        phase = 'planetary_nebula';
        stageName = 'Planetary Nebula';
      } else {
        temperature = 12000;
        radiusSolar = lerp(this.msR * 1.2, 5000, p);
        luminositySolar = 1e9;
        activity = 1.0;
        phase = 'supernova';
        stageName = 'Supernova';
        isSupernova = true;
      }
    } else {
      // Remnant
      const p = clamp((age - this.tPostEnd) / this.tRemnant, 0, 1);
      if (this.mass < 8) {
        temperature = lerp(100000, 5000, p);
        radiusSolar = 0.012;
        luminositySolar = Math.pow(radiusSolar, 2) *
          Math.pow(temperature / 5778, 4);
        activity = 0.05;
        phase = 'white_dwarf';
        stageName = 'White Dwarf';
      } else if (this.mass < 20) {
        temperature = 1e6;
        radiusSolar = 1e-5;
        luminositySolar = 0.01;
        activity = 0.02;
        phase = 'neutron_star';
        stageName = 'Neutron Star';
      } else {
        temperature = 0;
        radiusSolar = 0.001;
        luminositySolar = 0;
        activity = 0;
        phase = 'black_hole';
        stageName = 'Black Hole';
        isBlackHole = true;
      }
      isRemnant = true;
    }

    const spectral = phase === 'main_sequence'
      ? `${this.spectral}V`
      : phase === 'red_giant'
        ? `${spectralTypeFromTemp(temperature)}III`
        : phase === 'red_supergiant'
          ? `${spectralTypeFromTemp(temperature)}I`
          : phase === 'white_dwarf'
            ? 'D'
            : phase === 'neutron_star'
              ? 'NS'
              : phase === 'black_hole'
                ? 'BH'
                : phase === 'protostar'
                  ? 'PMS'
                  : phase === 'planetary_nebula'
                    ? 'PN'
                    : 'SN';

    return {
      phase,
      stageName,
      typeLabel: `${spectral} ${stageName}`,
      temperature,
      radiusSolar,
      luminositySolar,
      activity,
      isRemnant,
      isBlackHole,
      isSupernova,
      spectral,
      ageYears: age,
      massSolar: this.mass,
    };
  }
}
