import * as THREE from 'three';

export function roundBox(w, h, d, r, segs) {
  r = (r !== undefined) ? r : 0.08;
  segs = segs || 4;
  const g = new THREE.BoxGeometry(w, h, d, segs, segs, segs);
  const pos = g.attributes.position;
  const hw = Math.max(0, w * 0.5 - r);
  const hh = Math.max(0, h * 0.5 - r);
  const hd = Math.max(0, d * 0.5 - r);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ix = Math.max(-hw, Math.min(hw, x));
    const iy = Math.max(-hh, Math.min(hh, y));
    const iz = Math.max(-hd, Math.min(hd, z));
    const dx = x - ix, dy = y - iy, dz = z - iz;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len > 0.0001) {
      pos.setXYZ(i, ix + dx / len * r, iy + dy / len * r, iz + dz / len * r);
    }
  }
  g.computeVertexNormals();
  return g;
}

export function mkMesh(geo, material, castShadow, receiveShadow) {
  const o = new THREE.Mesh(geo, material);
  o.castShadow = (castShadow !== false);
  o.receiveShadow = (receiveShadow !== false);
  return o;
}
