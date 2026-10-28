import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { StarEvolution } from './starEvolution.js';
import { StarMesh } from './starMesh.js';
import { TimeController } from './timeController.js';
import { HUD } from './hud.js';

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: window.devicePixelRatio < 1.5,
  powerPreference: 'high-performance',
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.05,
  200
);
camera.position.set(0, 0.15, 4.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 1.6;
controls.maxDistance = 9;
controls.autoRotate = false;
controls.target.set(0, 0, 0);

// Subtle starfield
(function addStarfield() {
  const N = 900;
  const positions = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 25 + Math.random() * 45;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const m = new THREE.PointsMaterial({
    color: 0xaaccff,
    size: 0.055,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(g, m));
})();

const starMesh = new StarMesh(scene);
const hud = new HUD();

function randomMass() {
  // Log-uniform 0.1–25 M☉ so low-mass stars are common and massive stars rare
  const u = Math.random();
  return Math.pow(10, Math.log10(0.1) + u * (Math.log10(25) - Math.log10(0.1)));
}

let evolution = new StarEvolution(randomMass());
let ageYears = 0;

const timeController = new TimeController({
  onReset() {
    evolution = new StarEvolution(randomMass());
    ageYears = 0;
    const s = evolution.stageAt(0);
    starMesh.update(s, 0);
    hud.update(s, 0);
  },
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);

  ageYears += timeController.tick(delta);
  const state = evolution.stageAt(ageYears);

  starMesh.update(state, delta);
  hud.update(state, ageYears);
  controls.update();

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 120));

// Initial frame
const initial = evolution.stageAt(0);
starMesh.update(initial, 0);
hud.update(initial, 0);
animate();
