import * as THREE from 'three';
import { scene } from './scene.js';

const hemi = new THREE.HemisphereLight(0xfff4e0, 0xc8b89a, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0cc, 1.6);
sun.position.set(-18, 28, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 80;
sun.shadow.camera.left = -22;
sun.shadow.camera.right = 22;
sun.shadow.camera.top = 22;
sun.shadow.camera.bottom = -22;
sun.shadow.bias = -0.001;
scene.add(sun);
