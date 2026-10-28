export const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
export const smooth = t => t * t * (3 - 2 * t);
export const invLerp = (a, b, v) => (v - a) / (b - a);

export function formatAge(years) {
  if (!isFinite(years)) return '—';
  if (years < 1e3) return `${years.toFixed(0)} yr`;
  if (years < 1e6) return `${(years / 1e3).toFixed(1)} kyr`;
  if (years < 1e9) return `${(years / 1e6).toFixed(1)} Myr`;
  if (years < 1e12) return `${(years / 1e9).toFixed(2)} Gyr`;
  return `${(years / 1e12).toFixed(2)} Tyr`;
}

export function formatSpeed(yearsPerSecond) {
  if (yearsPerSecond < 1) return `${(yearsPerSecond * SECONDS_PER_YEAR).toFixed(0)} s/s`;
  if (yearsPerSecond < 1e3) return `${yearsPerSecond.toFixed(1)} yr/s`;
  if (yearsPerSecond < 1e6) return `${(yearsPerSecond / 1e3).toFixed(1)} kyr/s`;
  if (yearsPerSecond < 1e9) return `${(yearsPerSecond / 1e6).toFixed(1)} Myr/s`;
  if (yearsPerSecond < 1e12) return `${(yearsPerSecond / 1e9).toFixed(1)} Gyr/s`;
  return `${(yearsPerSecond / 1e12).toFixed(1)} Tyr/s`;
}

export function formatSci(n, digits = 2) {
  if (n === 0) return '0';
  if (!isFinite(n)) return '—';
  const exp = Math.floor(Math.log10(Math.abs(n)));
  if (exp >= -2 && exp <= 3) return n.toFixed(digits);
  return `${(n / Math.pow(10, exp)).toFixed(digits)}×10^${exp}`;
}

/** 
 * Accurate blackbody color (0 to 40,000 K).
 * Pushes high temps to intense blue-white and low temps to deep red-orange.
 */
export function temperatureToColor(K, THREE) {
  const t = clamp(K, 1000, 40000) / 100;
  let r, g, b;

  // Red
  if (t <= 66) {
    r = 255;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
  }

  // Green
  if (t <= 66) {
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
  } else {
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  }

  // Blue
  if (t >= 66) {
    b = 255;
  } else if (t <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  }

  // Normalize and clamp
  return new THREE.Color(
    clamp(r, 0, 255) / 255,
    clamp(g, 0, 255) / 255,
    clamp(b, 0, 255) / 255
  );
}
