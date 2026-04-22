import * as THREE from 'three';

export const camSize = 14;

export const camera = new THREE.OrthographicCamera(
  -camSize * (window.innerWidth / window.innerHeight),
  camSize * (window.innerWidth / window.innerHeight),
  camSize, -camSize,
  0.1, 200
);
camera.position.set(22, 18, 22);
camera.lookAt(0, 2, 0);
