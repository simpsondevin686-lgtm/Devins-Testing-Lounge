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
      uNoiseScale: { value: 2.8 },
      uSeed: { value: Math.random() * 100 },
      uBlackHole: { value: 0 },
      uHotColor: { value: new THREE.Color(1.0, 0.92, 0.78) },
      uCoolColor: { value: new THREE.Color(0.75, 0.18, 0.04) },
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

    const color = state.isBlackHole
      ? new THREE.Color(0x000000)
      : temperatureToColor(state.temperature, THREE);
    this.uniforms.uHotColor.value.copy(color).lerp(new THREE.Color(1, 1, 1), 0.25);
    this.uniforms.uCoolColor.value.copy(color).multiplyScalar(0.55);

    this.light.color.copy(color);
    this.light.intensity = state.isBlackHole ? 0 : 2.2;

    if (state.isBlackHole) {
      this.glow.visible = false;
    } else {
      this.glow.visible = true;
      this.glow.material.color.copy(color);
      const glowScale = state.isRemnant
        ? visualRadius * 1.4
        : visualRadius * (state.isSupernova ? 6.0 : 3.6);
      this.glow.scale.setScalar(glowScale);
    }
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
