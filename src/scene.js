import * as THREE from 'three';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xddd8d2);
scene.fog = new THREE.Fog(0xddd8d2, 60, 120);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);
