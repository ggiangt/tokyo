import * as THREE from 'three';
import { mat, C } from '../utils/materials.js';
import { roundBox, mkMesh } from '../utils/helpers.js';

export function mkTokyoTower() {
  const g = new THREE.Group();
  const tMat = mat(C.towerOrange, 0.75, 0.05);
  const tMatGrey = mat(C.towerGrey, 0.75, 0.05);
  const legMat = mat(C.towerOrange, 0.75, 0.04);

  function section(rBot, rTop, h, yOff) {
    const m = mkMesh(new THREE.CylinderGeometry(rTop, rBot, h, 8), tMat);
    m.position.y = yOff;
    g.add(m);
  }

  [[-0.55, 0.55], [0.55, 0.55], [-0.55, -0.55], [0.55, -0.55]].forEach(([lx, lz]) => {
    const legM = mkMesh(new THREE.CylinderGeometry(0.09, 0.18, 1.4, 6), legMat);
    legM.position.set(lx, 0.7, lz);
    legM.rotation.z = (lx < 0) ? 0.22 : -0.22;
    legM.rotation.x = (lz < 0) ? 0.22 : -0.22;
    g.add(legM);
  });

  section(0.42, 0.34, 2.0, 1.9);
  section(0.34, 0.26, 2.0, 3.9);
  section(0.26, 0.18, 2.0, 5.9);

  const deck = mkMesh(roundBox(1.1, 0.28, 1.1, 0.06, 4), mat(C.towerGrey, 0.7, 0.05));
  deck.position.y = 7.1;
  g.add(deck);

  section(0.14, 0.10, 2.2, 8.3);
  section(0.10, 0.06, 1.8, 10.5);

  const needle = mkMesh(new THREE.CylinderGeometry(0.02, 0.06, 1.8, 6), tMat, true, false);
  needle.position.y = 12.5;
  g.add(needle);

  [[2.5, 0.46], [4.5, 0.36], [6.5, 0.26], [8.8, 0.16], [10.8, 0.10]].forEach(([y, r]) => {
    const girder = mkMesh(new THREE.TorusGeometry(r, 0.04, 6, 16), tMatGrey, true, false);
    girder.position.y = y;
    g.add(girder);
  });

  return g;
}
