import * as THREE from 'three';

export function mat(hex, rough, metal) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    roughness: (rough !== undefined) ? rough : 0.85,
    metalness: (metal !== undefined) ? metal : 0.0,
  });
}

export const C = {
  base:         0xd4c9b0,
  baseDark:     0xbfb49c,
  path:         0xcec3aa,
  pathEdge:     0xb8ae98,
  grass:        0x8db87a,
  torii:        0xe05c1a,
  towerOrange:  0xe8621e,
  towerGrey:    0xc8c0b4,
  roofTeal:     0x5a9e8a,
  roofDark:     0x3d7a68,
  wallCream:    0xf0e8d8,
  wallBeige:    0xe2d9c4,
  woodBrown:    0x8b6344,
  sakuraPink:   0xf4a8c0,
  sakuraPink2:  0xec8eb2,
  trunkBrown:   0x7a5533,
  shadowGrey:   0x9a9490,
  figureBlue:   0x4a7abf,
  figurePink:   0xd4607a,
  figureYellow: 0xd4a830,
  stallCanvas:  0xf2d89a,
  stallRed:     0xd44040,
  water:        0x7ab8d0,
  lanternRed:   0xcc3333,
};
