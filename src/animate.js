import { controls } from './controls.js';
import { scene, renderer } from './scene.js';
import { camera } from './camera.js';

export function startLoop() {
  (function loop() {
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  })();
}
