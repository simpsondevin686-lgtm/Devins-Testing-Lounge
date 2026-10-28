import * as THREE from 'three';
import { starVertexShader, starFragmentShader } from './shaders.js';
import { temperatureToColor, clamp } from './utils.js';

function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0.00, 'rgba(255,255,255,1.0)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.82)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.24)');
  g.addColorStop(0.72, 'rgba(255,255,255,0.05)');
  g.addColorStop(1.00, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

export class StarMesh {
  constructor(scene) {
    this.group = new THREE.Group();
    this.uniforms = {
      uTime: { value: 0 },
      uTemperature: { value: 5778 },
      uActivity: { value: 0.2 },
      uIntensity: { value: 1.0 },
      uSeed: { value: Math.random() * 100 },
      uBlackHole: { value: 0 },
      uBaseColor: { value: new THREE.Color(1.0, 1.0, 1.0) },
      uSpotColor: { value: new THREE.Color(0.2, 0.0, 0.0) },
    };

    const geo = new THREE.SphereGeometry(1, 64, 64);
    const mat = new THREE.ShaderMaterial({
      vertexShader: starVertexShader,
      fragmentShader: starFragmentShader,
      uniforms: this.uniforms,
    });
    this.sphere = new THREE.Mesh(geo, mat);
    this.group.add(this.sphere);

    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(),
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.9,
    }));
    this.glow.scale.setScalar(3.6);
    this.group.add(this.glow);

    this.light = new THREE.PointLight(0xffffff, 2.2, 0, 2);
    this.group.add(this.light);

    scene.add(this.group);
    this.disposed = false;
  }

  update(state, deltaSeconds) {
    if (this.disposed) return;

    const visualRadius = clamp(0.32 * Math.pow(Math.max(state.radiusSolar, 1e-6), 0.22), 0.012, 2.4);
    this.group.scale.setScalar(visualRadius);

    this.uniforms.uTime.value += deltaSeconds;
    this.uniforms.uTemperature.value = state.temperature;
    this.uniforms.uActivity.value = state.activity;
    this.uniforms.uBlackHole.value = state.isBlackHole ? 1 : 0;

    if (state.isBlackHole) {
      this.uniforms.uIntensity.value = 0;
      this.glow.visible = false;
      this.light.intensity = 0;
      return;
    }

    // --- BLACKBODY PHYSICS ---
    // Base surface color
    const baseColor = temperatureToColor(state.temperature, THREE);
    this.uniforms.uBaseColor.value.copy(baseColor);

    // Starspots are typically 1000K - 2000K cooler than the surface
    const spotTemp = Math.max(1500, state.temperature - 1500);
    const spotColor = temperatureToColor(spotTemp, THREE);
    
    // Spots on hot stars are still blue, but less intense. Spots on cool stars are deep red/brown.
    this.uniforms.uSpotColor.value.copy(spotColor).multiplyScalar(0.3);

    // --- LUMINOSITY MATH ---
    // Convert solar luminosity to visual intensity.
    // Sun (L=1) -> ~1.0 intensity.
    // O-type (L=10,000) -> ~2.8 intensity (blows out to white).
    // Red dwarf (L=0.01) -> ~0.6 intensity.
    const logL = Math.log10(Math.max(0.001, state.luminositySolar));
    const intensity = clamp(1.0 + (logL * 0.45), 0.4, 4.0);
    this.uniforms.uIntensity.value = intensity;

    // Update the scene light so the planet/glow gets the right color
    this.light.color.copy(baseColor);
    this.light.intensity = 2.0 * intensity;

    // Update the glow sprite
    this.glow.visible = true;
    this.glow.material.color.copy(baseColor);
    
    // Glow gets much bigger and brighter for high luminosity stars (supernova/giants)
    const glowScale = visualRadius * (state.isSupernova ? 6.0 : 3.6) * Math.min(intensity, 2.0);
    this.glow.scale.setScalar(glowScale);
    this.glow.material.opacity = clamp(0.5 + (intensity * 0.2), 0.5, 1.0);
  }

  dispose() {
    this.disposed = true;
    this.group.parent?.remove(this.group);
    this.sphere.geometry.dispose();
    this.sphere.material.dispose();
    this.glow.material.map?.dispose();
    this.glow.material.dispose();
  }
}

// Inject the new spot color uniform
StarMesh.prototype.addSpotColorUniform = function() {
  this.uniforms.uSpotColor = { value: new THREE.Color(0.2, 0.05, 0.0) };
};
