import * as THREE from 'three';
import { mat, C } from '../utils/materials.js';
import { roundBox, mkMesh } from '../utils/helpers.js';

export function mkTorii() {
  const g = new THREE.Group();
  const toriiMat = mat(C.torii, 0.7, 0.04);
  const pillarG = new THREE.CylinderGeometry(0.12, 0.12, 2.8, 10);

  [-0.7, 0.7].forEach(x => {
    const p = mkMesh(pillarG, toriiMat);
    p.position.set(x, 1.4, 0);
    g.add(p);
  });

  const kasagi = mkMesh(roundBox(2.2, 0.22, 0.22, 0.06, 4), toriiMat, true, false);
  kasagi.position.y = 2.85;
  g.add(kasagi);

  const nuki = mkMesh(roundBox(1.6, 0.16, 0.18, 0.04, 4), toriiMat, true, false);
  nuki.position.y = 2.35;
  g.add(nuki);

  [-1.0, 1.0].forEach(sx => {
    const horn = mkMesh(new THREE.CylinderGeometry(0.07, 0.1, 0.35, 8), toriiMat, true, false);
    horn.position.set(sx * 1.08, 2.85, 0);
    horn.rotation.z = sx * 0.15;
    g.add(horn);
  });

  return g;
}
