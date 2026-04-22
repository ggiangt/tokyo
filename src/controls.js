import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { camera } from './camera.js';
import { renderer } from './scene.js';

export const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minZoom = 0.4;
controls.maxZoom = 3.0;
controls.maxPolarAngle = Math.PI * 0.48;
controls.update();
