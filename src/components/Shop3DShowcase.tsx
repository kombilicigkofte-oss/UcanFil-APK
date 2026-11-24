import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Check, Crown, Gift, Lock, Package, RotateCw, Sparkles } from 'lucide-react';
import {
  COSMETIC_CATALOG,
  RARITY_LABELS,
  getCosmeticOwnershipSummary,
} from '../data/cosmetics';
import { CRATE_TIER_CONFIGS, CRATE_TIER_ORDER } from '../data/crates';
import {
  CosmeticCategory,
  CosmeticItem,
  CrateInventoryState,
  CrateTier,
  EquippedCosmetics,
  GameMode,
} from '../types/game';

type ShowcaseSection = 'crates' | CosmeticCategory | 'special';

interface Shop3DShowcaseProps {
  peanutBank: number;
  gameMode: GameMode;
  unlockedIds: string[];
  equipped: EquippedCosmetics;
  crateInventory: CrateInventoryState;
  onSelectOrBuyCosmetic: (item: CosmeticItem) => void;
  onOpenCrate: (tier: CrateTier) => void;
  onBuySingleCrate: (tier: CrateTier) => void;
  onSwitchToLeveled?: () => void;
}

const CRATE_COLORS: Record<
  CrateTier,
  { main: number; trim: number; gem: number; glow: number; ribbon: number }
> = {
  standard: { main: 0x7e22ce, trim: 0xfacc15, gem: 0x38bdf8, glow: 0xa855f7, ribbon: 0xfde047 },
  epic: { main: 0xd97706, trim: 0xfef08a, gem: 0xec4899, glow: 0xf59e0b, ribbon: 0xfef08a },
  outfit: { main: 0x0f766e, trim: 0x5eead4, gem: 0xf43f5e, glow: 0x14b8a6, ribbon: 0x99f6e4 },
  leveled_outfit: { main: 0x15803d, trim: 0x86efac, gem: 0xfacc15, glow: 0x22c55e, ribbon: 0xbbf7d0 },
  special: { main: 0x4c1d95, trim: 0xfacc15, gem: 0x38bdf8, glow: 0xfacc15, ribbon: 0x7dd3fc },
  mythic: { main: 0x9f1239, trim: 0xfde047, gem: 0x22d3ee, glow: 0xf43f5e, ribbon: 0xfef08a },
};

function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material?.dispose();
      }
    }
  });
}

function buildCrate3DGroup(tier: CrateTier): {
  group: THREE.Group;
  lidPivot: THREE.Group;
  gemMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
} {
  const palette = CRATE_COLORS[tier];
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: palette.main,
    roughness: 0.34,
    metalness: 0.28,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: palette.trim,
    roughness: 0.22,
    metalness: 0.82,
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.55,
    metalness: 0.35,
  });
  const gemMat = new THREE.MeshStandardMaterial({
    color: palette.gem,
    emissive: palette.gem,
    emissiveIntensity: 0.75,
    roughness: 0.12,
    metalness: 0.3,
  });

  const baseBox = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.96, 1.24), bodyMat);
  baseBox.position.y = 0.02;
  group.add(baseBox);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), trimMat);
      post.position.set(sx * 0.82, 0.02, sz * 0.58);
      group.add(post);
    }
  }

  const frontBand = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.14, 1.3), darkWoodMat);
  frontBand.position.y = -0.38;
  group.add(frontBand);

  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.5, -0.62);
  group.add(lidPivot);

  const lidBase = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.28, 1.26), bodyMat);
  lidBase.position.set(0, 0.14, 0.62);
  lidPivot.add(lidBase);

  const archGeo = new THREE.CylinderGeometry(0.58, 0.58, 1.66, 18, 1, false, 0, Math.PI);
  archGeo.rotateZ(Math.PI / 2);
  const arch = new THREE.Mesh(archGeo, bodyMat);
  arch.position.set(0, 0.26, 0.62);
  lidPivot.add(arch);

  for (const bx of [-0.56, 0, 0.56]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.34, 1.32), trimMat);
    strap.position.set(bx, 0.16, 0.62);
    lidPivot.add(strap);
  }

  const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.12), trimMat);
  clasp.position.set(0, 0.0, 1.25);
  lidPivot.add(clasp);

  const gemMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), gemMat);
  gemMesh.position.set(0, 0.0, 1.32);
  lidPivot.add(gemMesh);

  if (tier === 'mythic' || tier === 'outfit' || tier === 'leveled_outfit' || tier === 'special') {
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.42, 6), trimMat);
    crest.position.set(0, 0.92, 0.62);
    lidPivot.add(crest);
  }

  const ringMat = new THREE.MeshStandardMaterial({
    color: palette.glow,
    emissive: palette.glow,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.75,
  });
  const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.038, 12, 48), ringMat);
  ringMesh.rotation.x = Math.PI / 2 - 0.18;
  ringMesh.position.y = 0.05;
  group.add(ringMesh);

  if (tier === 'special') {
    const secondRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.52, 0.03, 10, 44),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.85,
        roughness: 0.15,
        metalness: 0.8,
      })
    );
    secondRing.rotation.x = Math.PI / 2 + 0.34;
    secondRing.rotation.y = 0.45;
    secondRing.position.y = 0.14;
    group.add(secondRing);
  }

  return { group, lidPivot, gemMesh, ringMesh };
}

function buildPet3DGroup(item: CosmeticItem): {
  group: THREE.Group;
  animate: (t: number) => void;
} {
  const group = new THREE.Group();
  const mainCol = new THREE.Color(item.previewColor).getHex();
  const accentCol = new THREE.Color(item.accentColor || '#FACC15').getHex();

  const mainMat = new THREE.MeshStandardMaterial({
    color: mainCol,
    roughness: 0.35,
    metalness: 0.25,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentCol,
    emissive: accentCol,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.65,
  });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });

  if (item.shape === 'peanut_fairy') {
    const lobe1 = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 16), mainMat);
    lobe1.position.set(-0.24, 0, 0);
    const lobe2 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), mainMat);
    lobe2.position.set(0.26, 0.04, 0);
    group.add(lobe1, lobe2);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), eyeMat);
    eyeL.position.set(0.32, 0.14, 0.37);
    const eyeR = eyeL.clone();
    eyeR.position.set(0.52, 0.14, 0.24);
    group.add(eyeL, eyeR);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 10, 28), accentMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0.05, 0.72, 0);
    group.add(halo);

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    });
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.38, 0.04), wingMat);
    wingL.position.set(-0.45, 0.28, -0.3);
    const wingR = wingL.clone();
    wingR.position.set(-0.45, 0.28, 0.3);
    group.add(wingL, wingR);

    return {
      group,
      animate: (t) => {
        group.position.y = Math.sin(t * 3.2) * 0.16;
        wingL.rotation.y = Math.sin(t * 14) * 0.55;
        wingR.rotation.y = -Math.sin(t * 14) * 0.55;
        halo.rotation.z = Math.sin(t * 2) * 0.12;
      },
    };
  }

  if (item.shape === 'pixel_soul') {
    const cubes = [
      [0, -0.4, 0],
      [-0.25, -0.15, 0],
      [0.25, -0.15, 0],
      [0, -0.15, 0],
      [-0.5, 0.12, 0],
      [-0.25, 0.12, 0],
      [0, 0.12, 0],
      [0.25, 0.12, 0],
      [0.5, 0.12, 0],
      [-0.5, 0.38, 0],
      [-0.25, 0.38, 0],
      [0.25, 0.38, 0],
      [0.5, 0.38, 0],
      [-0.25, 0.62, 0],
      [0.25, 0.62, 0],
    ];
    for (const [cx, cy, cz] of cubes) {
      const vox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), mainMat);
      vox.position.set(cx, cy, cz);
      group.add(vox);
    }

    const wingL = new THREE.Group();
    const wingR = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const fL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.08), accentMat);
      fL.position.set(-0.8 - i * 0.22, 0.3 - i * 0.1, 0);
      wingL.add(fL);
      const fR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.08), accentMat);
      fR.position.set(0.8 + i * 0.22, 0.3 - i * 0.1, 0);
      wingR.add(fR);
    }
    group.add(wingL, wingR);

    return {
      group,
      animate: (t) => {
        group.position.y = Math.sin(t * 3) * 0.14;
        wingL.rotation.y = Math.sin(t * 10) * 0.35;
        wingR.rotation.y = -Math.sin(t * 10) * 0.35;
      },
    };
  }

  if (item.shape === 'cyber_drone') {
    const darkShell = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.78,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.54, 24, 18), darkShell);
    group.add(core);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.2), mainMat);
    visor.position.set(0, 0.08, 0.48);
    group.add(visor);

    const gyro1 = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.05, 12, 36), accentMat);
    gyro1.rotation.x = Math.PI / 2.4;
    group.add(gyro1);

    const gyro2 = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.035, 12, 36), mainMat);
    gyro2.rotation.y = Math.PI / 3;
    group.add(gyro2);

    const thruster = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 14), accentMat);
    thruster.rotation.x = Math.PI;
    thruster.position.set(0, -0.7, 0);
    group.add(thruster);

    return {
      group,
      animate: (t) => {
        group.position.y = Math.sin(t * 3.8) * 0.14;
        gyro1.rotation.z = t * 2.4;
        gyro2.rotation.x = t * 1.9;
        thruster.scale.y = 0.8 + Math.sin(t * 24) * 0.25;
      },
    };
  }

  if (item.shape === 'mini_dragon') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.52, 22, 18), mainMat);
    body.scale.set(1.15, 0.95, 0.92);
    group.add(body);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 14), accentMat);
    belly.position.set(0.18, -0.14, 0.2);
    group.add(belly);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.34), mainMat);
    snout.position.set(0.55, 0.08, 0);
    group.add(snout);

    for (const sz of [-0.18, 0.18]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 10), accentMat);
      horn.position.set(-0.02, 0.62, sz);
      horn.rotation.z = 0.25;
      group.add(horn);
    }

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.48, 0.06), wingMat);
    wingL.position.set(-0.22, 0.32, -0.58);
    const wingR = wingL.clone();
    wingR.position.set(-0.22, 0.32, 0.58);
    group.add(wingL, wingR);

    const flame = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfb923c,
        emissive: 0xf97316,
        emissiveIntensity: 0.9,
      })
    );
    flame.position.set(0.95, 0.06, 0);
    group.add(flame);

    return {
      group,
      animate: (t) => {
        group.position.y = Math.sin(t * 3.5) * 0.15;
        wingL.rotation.x = -0.3 + Math.sin(t * 11) * 0.45;
        wingR.rotation.x = 0.3 - Math.sin(t * 11) * 0.45;
        flame.rotation.y = t * 4;
        flame.scale.setScalar(0.85 + Math.sin(t * 14) * 0.22);
      },
    };
  }

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 18), mainMat);
  body.scale.set(1.2, 0.9, 0.9);
  group.add(body);

  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.62, 8), accentMat);
  crest.position.set(0.15, 0.64, 0);
  crest.rotation.z = -0.38;
  group.add(crest);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 12, 40), accentMat);
  halo.rotation.y = Math.PI / 2;
  group.add(halo);

  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.44, 0.06), accentMat);
  wingL.position.set(-0.18, 0.24, -0.58);
  const wingR = wingL.clone();
  wingR.position.set(-0.18, 0.24, 0.58);
  group.add(wingL, wingR);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.95, 8), mainMat);
  tail.rotation.z = Math.PI / 2.2;
  tail.position.set(-0.78, -0.1, 0);
  group.add(tail);

  return {
    group,
    animate: (t) => {
      group.position.y = Math.sin(t * 3.1) * 0.16;
      wingL.rotation.x = -0.25 + Math.sin(t * 9.5) * 0.5;
      wingR.rotation.x = 0.25 - Math.sin(t * 9.5) * 0.5;
      halo.rotation.z = t * 1.4;
    },
  };
}

function buildCosmetic3DGroup(
  item: CosmeticItem,
  isSecretLocked = false
): {
  group: THREE.Group;
  animate: (t: number) => void;
} {
  const group = new THREE.Group();

  if (isSecretLocked) {
    const mysteryColor = item.leveledOnly ? 0x10b981 : 0xf43f5e;
    const cube = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.68, 0),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.25,
        metalness: 0.85,
      })
    );
    const cage = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.045, 10, 32),
      new THREE.MeshStandardMaterial({
        color: mysteryColor,
        emissive: mysteryColor,
        emissiveIntensity: 0.85,
      })
    );
    cage.rotation.x = Math.PI / 3;
    const cage2 = cage.clone();
    cage2.rotation.y = Math.PI / 2.5;
    group.add(cube, cage, cage2);
    return {
      group,
      animate: (t) => {
        group.position.y = Math.sin(t * 2.5) * 0.12;
        cube.rotation.y = t * 0.9;
        cage.rotation.z = t * 1.6;
        cage2.rotation.x = -t * 1.3;
      },
    };
  }

  const mainCol = new THREE.Color(item.previewColor).getHex();
  const accentCol = new THREE.Color(item.accentColor || '#FACC15').getHex();

  const mainMat = new THREE.MeshStandardMaterial({
    color: mainCol,
    roughness: item.shape === 'metallic' ? 0.16 : item.shape === 'pitch_black' ? 0.72 : 0.34,
    metalness: item.shape === 'metallic' ? 0.88 : item.shape === 'pitch_black' ? 0.08 : 0.34,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentCol,
    emissive: accentCol,
    emissiveIntensity: 0.34,
    roughness: 0.22,
    metalness: 0.72,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.4,
    metalness: 0.45,
  });

  if (item.category === 'hat') {
    if (item.shape === 'crown') {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.72, 0.34, 24), mainMat);
      band.position.y = -0.22;
      group.add(band);
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 * i) / 6;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.48, 6), mainMat);
        spike.position.set(Math.cos(ang) * 0.65, 0.16, Math.sin(ang) * 0.65);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), accentMat);
        gem.position.set(Math.cos(ang) * 0.76, -0.2, Math.sin(ang) * 0.76);
        group.add(spike, gem);
      }
    } else if (item.shape === 'party' || item.shape === 'wizard') {
      const isWizard = item.shape === 'wizard';
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(isWizard ? 1.05 : 0.62, isWizard ? 1.08 : 0.68, 0.08, 24),
        mainMat
      );
      brim.position.y = -0.4;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(isWizard ? 0.6 : 0.56, isWizard ? 1.35 : 1.15, 22),
        mainMat
      );
      cone.position.y = 0.2;
      if (isWizard) cone.rotation.z = 0.15;
      const topOrb = new THREE.Mesh(
        isWizard ? new THREE.OctahedronGeometry(0.18, 0) : new THREE.SphereGeometry(0.18, 12, 12),
        accentMat
      );
      topOrb.position.set(isWizard ? -0.18 : 0, 0.82, 0);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 8, 24), accentMat);
      band.rotation.x = Math.PI / 2;
      band.position.y = -0.34;
      group.add(brim, cone, topOrb, band);
    } else if (item.shape === 'tophat') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 24), mainMat);
      brim.position.y = -0.35;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.58, 0.92, 24), mainMat);
      body.position.y = 0.12;
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.61, 0.6, 0.16, 24), accentMat);
      ribbon.position.y = -0.22;
      group.add(brim, body, ribbon);
    } else if (item.shape === 'chef') {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.58, 0.42, 22), mainMat);
      band.position.y = -0.22;
      group.add(band);
      for (let i = 0; i < 4; i++) {
        const ang = (Math.PI * 2 * i) / 4;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), mainMat);
        puff.position.set(Math.cos(ang) * 0.28, 0.25, Math.sin(ang) * 0.28);
        group.add(puff);
      }
      const centerPuff = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 14), accentMat);
      centerPuff.position.y = 0.36;
      group.add(centerPuff);
    } else if (item.shape === 'viking') {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
        mainMat
      );
      dome.position.y = -0.15;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.08, 10, 26), accentMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = -0.15;
      group.add(dome, rim);
      for (const sx of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.78, 10), accentMat);
        horn.position.set(sx * 0.78, 0.28, 0);
        horn.rotation.z = -sx * 0.85;
        group.add(horn);
      }
    } else if (item.shape === 'devil') {
      const headband = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 10, 24), darkMat);
      headband.rotation.x = Math.PI / 2;
      headband.position.y = -0.25;
      group.add(headband);
      for (const sx of [-0.42, 0.42]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.82, 12), mainMat);
        horn.position.set(sx, 0.22, 0);
        horn.rotation.z = -sx * 0.42;
        group.add(horn);
      }
    } else if (item.shape === 'halo') {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.11, 14, 36), accentMat);
      halo.rotation.x = Math.PI / 2;
      const inner = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 10, 28), mainMat);
      inner.rotation.x = Math.PI / 2;
      group.add(halo, inner);
    } else if (item.shape === 'propeller' || item.shape === 'beanie') {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.66, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
        mainMat
      );
      dome.position.y = -0.18;
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.1, 10, 26), accentMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.18;
      group.add(dome, cuff);
      if (item.shape === 'propeller') {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 0.16), accentMat);
        blade.position.y = 0.55;
        group.add(blade);
      } else {
        const pom = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), accentMat);
        pom.position.y = 0.54;
        group.add(pom);
      }
    } else if (item.shape === 'aviator' || item.shape === 'astronaut') {
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.72, 22, 18), mainMat);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.38, 0.4), accentMat);
      visor.position.set(0, 0.08, 0.55);
      group.add(helmet, visor);
    } else if (item.shape === 'kabuto') {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
        mainMat
      );
      dome.position.y = -0.12;
      const neckGuard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.74, 0.88, 0.35, 18, 1, true, Math.PI * 0.6, Math.PI * 0.8),
        mainMat
      );
      neckGuard.position.y = -0.22;
      const crest = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.08, 10, 24, Math.PI), accentMat);
      crest.rotation.z = Math.PI;
      crest.position.set(0, 0.72, 0.42);
      group.add(dome, neckGuard, crest);
    } else if (item.shape === 'witch_cat') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.0, 0.08, 26), mainMat);
      brim.position.y = -0.35;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.25, 22), mainMat);
      cone.position.y = 0.25;
      cone.rotation.z = 0.14;
      const earL = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 6), accentMat);
      earL.position.set(-0.32, 0.1, 0.36);
      const earR = earL.clone();
      earR.position.set(0.32, 0.1, 0.36);
      group.add(brim, cone, earL, earR);
    } else if (item.shape === 'ufo') {
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.72, 0.26, 26), mainMat);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
        accentMat
      );
      dome.position.y = 0.12;
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(0.68, 1.15, 22, 1, true),
        new THREE.MeshStandardMaterial({
          color: accentCol,
          emissive: accentCol,
          emissiveIntensity: 0.45,
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
        })
      );
      beam.position.y = -0.68;
      group.add(saucer, dome, beam);
    } else {
      for (let i = -2; i <= 2; i++) {
        const feather = new THREE.Mesh(
          new THREE.ConeGeometry(0.16, 1.05 - Math.abs(i) * 0.14, 8),
          i % 2 === 0 ? mainMat : accentMat
        );
        feather.position.set(i * 0.22, 0.18, 0);
        feather.rotation.z = -i * 0.24;
        group.add(feather);
      }
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), accentMat);
      gem.position.y = -0.3;
      group.add(gem);
    }
  } else if (item.category === 'glasses') {
    if (item.shape === 'golden_rings') {
      const cyanCoreMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.85,
        roughness: 0.15,
        metalness: 0.65,
      });
      const visorBridge = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.11, 0.14), accentMat);
      const gemCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), cyanCoreMat);
      gemCore.position.set(0, 0, 0.09);
      const outerHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.92, 0.048, 10, 36),
        accentMat
      );
      outerHalo.rotation.x = Math.PI / 2.6;
      const innerHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.74, 0.034, 10, 32),
        cyanCoreMat
      );
      innerHalo.rotation.y = Math.PI / 3;
      const eyePieces: THREE.Mesh[] = [];
      for (const sx of [-0.46, 0.46]) {
        const wingFin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.54, 4), mainMat);
        wingFin.rotation.z = sx < 0 ? Math.PI / 2.4 : -Math.PI / 2.4;
        wingFin.position.set(sx * 1.9, 0.1, -0.05);
        const ringRim = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.075, 12, 28), mainMat);
        ringRim.position.set(sx, 0, 0);
        const ringAccent = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 8, 22), cyanCoreMat);
        ringAccent.position.set(sx, 0, 0.05);
        const lens = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.28, 0.05, 20),
          new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.65,
            roughness: 0.15,
            metalness: 0.6,
          })
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.set(sx, 0, 0);
        group.add(wingFin, ringRim, ringAccent, lens);
        eyePieces.push(ringAccent);
      }
      group.add(visorBridge, gemCore, outerHalo, innerHalo);
      return {
        group,
        animate: (t) => {
          group.position.y = Math.sin(t * 2.6) * 0.11;
          group.rotation.y = Math.sin(t * 0.8) * 0.55;
          outerHalo.rotation.z = t * 1.5;
          outerHalo.rotation.y = t * 0.65;
          innerHalo.rotation.z = -t * 2.1;
          innerHalo.rotation.x = Math.PI / 4 + Math.sin(t * 1.5) * 0.25;
          gemCore.rotation.y = t * 2.8;
          for (const ep of eyePieces) {
            ep.rotation.z = t * 2.4;
          }
        },
      };
    } else if (item.shape === 'visor' || item.shape === 'scouter') {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.42, 0.24), mainMat);
      const lens = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.26, 0.28), accentMat);
      group.add(frame, lens);
    } else if (item.shape === 'monocle') {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.08, 12, 28), mainMat);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 22), accentMat);
      lens.rotation.x = Math.PI / 2;
      const chain = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.06), mainMat);
      chain.position.set(0.46, -0.5, 0);
      group.add(rim, lens, chain);
    } else if (item.shape === 'eyepatch') {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 0.08), darkMat);
      strap.rotation.z = 0.22;
      const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.12, 16), mainMat);
      patch.rotation.x = Math.PI / 2;
      patch.position.set(0.32, -0.05, 0.08);
      group.add(strap, patch);
    } else if (item.shape === 'pixel') {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.12), mainMat);
      group.add(bridge);
      for (const sx of [-0.48, 0.48]) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.14), mainMat);
        frame.position.set(sx, 0, 0);
        const glint = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.16), accentMat);
        glint.position.set(sx - 0.1, 0.06, 0);
        group.add(frame, glint);
      }
    } else {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.1), mainMat);
      group.add(bridge);
      const is3D = item.shape === '3d';
      const lensLeftMat = is3D
        ? new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.4 })
        : accentMat;
      const lensRightMat = is3D
        ? new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.4 })
        : accentMat;
      for (const [idx, sx] of ([-0.46, 0.46] as const).entries()) {
        const rim = new THREE.Mesh(
          item.shape === 'star'
            ? new THREE.TorusGeometry(0.36, 0.08, 6, 5)
            : new THREE.TorusGeometry(0.34, 0.075, 12, 26),
          mainMat
        );
        rim.position.set(sx, 0, 0);
        const lens = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 0.06, 20),
          idx === 0 ? lensLeftMat : lensRightMat
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.set(sx, 0, 0);
        group.add(rim, lens);
      }
    }
  } else if (item.category === 'skin') {
    const geo =
      item.shape === 'origami' || item.shape === 'void_prism'
        ? new THREE.IcosahedronGeometry(0.68, 0)
        : new THREE.SphereGeometry(0.66, 24, 18);
    const body = new THREE.Mesh(geo, mainMat);
    group.add(body);
    // Stylized elephant trunk + ears so skin previews clearly read as Elephant skin!
    const earGeo = new THREE.SphereGeometry(0.36, 14, 12);
    const earL = new THREE.Mesh(earGeo, mainMat);
    earL.scale.set(0.35, 0.95, 0.85);
    earL.position.set(-0.68, 0.08, 0.05);
    const earR = earL.clone();
    earR.position.set(0.68, 0.08, 0.05);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.56, 12), mainMat);
    trunk.rotation.x = Math.PI / 2.6;
    trunk.position.set(0, -0.15, 0.72);
    group.add(earL, earR, trunk);

    if (item.shape === 'stripes' || item.shape === 'blueprint' || item.shape === 'galaxy' || item.shape === 'rainbow' || item.shape === 'mosaic') {
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 10, 32), accentMat);
      orbit.rotation.x = Math.PI / 2.5;
      group.add(orbit);
    }
  } else if (item.category === 'suit') {
    if (item.shape === 'golden_rings') {
      const obsidianMat = new THREE.MeshStandardMaterial({
        color: 0x2e1065,
        roughness: 0.22,
        metalness: 0.82,
      });
      const cyanGlowMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.85,
        roughness: 0.15,
        metalness: 0.7,
      });
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.46, 1.06, 18), obsidianMat);
      torso.position.y = -0.05;
      const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.5, 0.68), mainMat);
      chestPlate.position.set(0, 0.15, 0.14);
      const crestRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 10, 24), accentMat);
      crestRing.position.set(0, 0.16, 0.51);
      const reactorCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), cyanGlowMat);
      reactorCore.position.set(0, 0.16, 0.53);
      const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.86, 4), accentMat);
      wingL.rotation.z = 0.72;
      wingL.position.set(-0.78, 0.58, -0.22);
      const wingR = wingL.clone();
      wingR.rotation.z = -0.72;
      wingR.position.set(0.78, 0.58, -0.22);
      const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), mainMat);
      shoulderL.position.set(-0.66, 0.34, 0);
      const shoulderR = shoulderL.clone();
      shoulderR.position.set(0.66, 0.34, 0);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.07, 10, 24), accentMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.48;
      const haloA = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.048, 10, 38), accentMat);
      haloA.rotation.x = Math.PI / 3;
      const haloB = new THREE.Mesh(new THREE.TorusGeometry(0.94, 0.036, 10, 34), cyanGlowMat);
      haloB.rotation.y = Math.PI / 3;
      const orbGems: THREE.Mesh[] = [];
      for (let i = 0; i < 6; i++) {
        const gem = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.095, 0),
          i % 2 === 0 ? accentMat : cyanGlowMat
        );
        orbGems.push(gem);
        group.add(gem);
      }
      group.add(
        torso,
        chestPlate,
        crestRing,
        reactorCore,
        wingL,
        wingR,
        shoulderL,
        shoulderR,
        collar,
        haloA,
        haloB
      );
      return {
        group,
        animate: (t) => {
          group.position.y = Math.sin(t * 2.4) * 0.1;
          group.rotation.y = t * 0.55;
          haloA.rotation.z = t * 1.5;
          haloA.rotation.x = Math.PI / 3 + Math.sin(t * 1.1) * 0.2;
          haloB.rotation.z = -t * 1.9;
          haloB.rotation.y = Math.PI / 3 + Math.cos(t * 1.2) * 0.25;
          crestRing.rotation.z = t * 2.2;
          reactorCore.rotation.y = -t * 3.0;
          orbGems.forEach((gem, idx) => {
            const ang = t * 2.2 + (idx * Math.PI) / 3;
            gem.position.set(Math.cos(ang) * 1.04, Math.sin(ang * 2) * 0.3, Math.sin(ang) * 1.04);
            gem.rotation.y = t * 3;
          });
        },
      };
    } else {
      // 3D Suit armor/jacket bust
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.48, 1.08, 18), mainMat);
      torso.position.y = -0.05;
      const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.52, 0.68), accentMat);
      chestPlate.position.set(0, 0.16, 0.16);
      const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), accentMat);
      shoulderL.position.set(-0.66, 0.34, 0);
      const shoulderR = shoulderL.clone();
      shoulderR.position.set(0.66, 0.34, 0);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 10, 24), darkMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.48;
      group.add(torso, chestPlate, shoulderL, shoulderR, collar);
    }
  } else if (item.shape === 'golden_rings') {
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), accentMat);
    const ringOuter = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.045, 10, 36), mainMat);
    const ringMid = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.04, 10, 30), accentMat);
    const ringInner = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.035, 8, 24), mainMat);
    const miniRings: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const mini = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.03, 8, 18),
        i % 2 === 0 ? accentMat : mainMat
      );
      miniRings.push(mini);
      group.add(mini);
    }
    group.add(core, ringOuter, ringMid, ringInner);
    return {
      group,
      animate: (t) => {
        group.position.y = Math.sin(t * 2.6) * 0.12;
        core.rotation.y = t * 2.4;
        core.rotation.x = t * 1.4;
        ringOuter.rotation.set(Math.PI / 2.8, t * 0.9, t * 1.2);
        ringMid.rotation.set(-t * 1.1, Math.PI / 3, -t * 1.5);
        ringInner.rotation.set(t * 1.6, -t * 0.8, Math.PI / 4);
        miniRings.forEach((mr, idx) => {
          const ang = t * 1.8 + (Math.PI * 2 * idx) / 6;
          mr.position.set(Math.cos(ang) * 0.84, Math.sin(ang * 2) * 0.25, Math.sin(ang) * 0.84);
          mr.rotation.x = ang;
          mr.rotation.y = t * 2.2;
        });
      },
    };
  } else {
    // Trail showcase: orbiting 3D sculptures
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI * 2 * i) / 6;
      const node = new THREE.Mesh(
        item.shape === 'binary'
          ? new THREE.BoxGeometry(0.26, 0.26, 0.26)
          : item.shape === 'ring' || item.shape === 'orbit_moons'
            ? new THREE.TorusGeometry(0.18, 0.05, 8, 18)
            : new THREE.OctahedronGeometry(0.22, 0),
        i % 2 === 0 ? mainMat : accentMat
      );
      node.position.set(Math.cos(ang) * 0.82, Math.sin(ang * 2) * 0.24, Math.sin(ang) * 0.82);
      group.add(node);
    }
  }

  return {
    group,
    animate: (t) => {
      group.position.y = Math.sin(t * 2.6) * 0.12;
      group.rotation.y = t * 0.65;
    },
  };
}

export default function Shop3DShowcase({
  peanutBank,
  gameMode,
  unlockedIds,
  equipped,
  crateInventory,
  onSelectOrBuyCosmetic,
  onOpenCrate,
  onBuySingleCrate,
  onSwitchToLeveled,
}: Shop3DShowcaseProps) {
  const [section, setSection] = useState<ShowcaseSection>('crates');
  const [selectedCrate, setSelectedCrate] = useState<CrateTier>('special');
  const [selectedByCat, setSelectedByCat] = useState<Record<CosmeticCategory | 'special', string>>({
    pet: 'pet_celestial_phoenix',
    hat: 'hat_ufo_abduct',
    glasses: 'glasses_golden_rings',
    skin: 'skin_void_prism',
    trail: 'trail_golden_rings',
    suit: 'suit_golden_rings',
    special: 'suit_golden_rings',
  });
  const [isChestOpen, setIsChestOpen] = useState<boolean>(false);

  const unlockedSet = useMemo(() => new Set(unlockedIds), [unlockedIds]);
  const ownershipSummary = useMemo(() => getCosmeticOwnershipSummary(unlockedIds), [unlockedIds]);

  const itemsByCategory = useMemo(() => {
    const map: Record<CosmeticCategory | 'special', CosmeticItem[]> = {
      pet: [],
      hat: [],
      glasses: [],
      skin: [],
      trail: [],
      suit: [],
      special: [],
    };
    for (const item of COSMETIC_CATALOG) {
      if (item.cost === 0 && !item.dropOnly) continue; // skip free "none/classic" defaults
      if (item.leveledOnly && gameMode !== 'leveled') continue;
      map[item.category].push(item);
      if (item.isSpecial) {
        map.special.push(item);
      }
    }
    return map;
  }, [gameMode]);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const chestOpenRef = useRef<boolean>(false);
  chestOpenRef.current = isChestOpen;

  // Persistent single-instance Three.js stage (zero mobile lag!)
  const showcaseRootRef = useRef<THREE.Group | null>(null);
  const animateFnRef = useRef<((t: number) => void) | null>(null);

  const activeCosmeticItem = useMemo(() => {
    if (section === 'crates') return null;
    const list = itemsByCategory[section];
    const desiredId = selectedByCat[section];
    return list.find((i) => i.id === desiredId) || list[0] || null;
  }, [itemsByCategory, section, selectedByCat]);

  // Mount WebGLRenderer + RoomEnvironment + OrbitControls ONCE
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(240, container.clientWidth);
    const height = Math.max(170, container.clientHeight);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const glName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software/i.test(glName);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1.25 : 1.5));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090f1d');
    scene.fog = new THREE.Fog('#090f1d', 7, 16);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 40);
    camera.position.set(2.45, 1.85, 3.25);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 2.1;
    controls.maxDistance = 6.2;
    controls.maxPolarAngle = Math.PI * 0.56;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.25;

    const hemi = new THREE.HemisphereLight(0xbbe6ff, 0x1e293b, 0.9);
    const key = new THREE.DirectionalLight(0xfffbeb, 1.9);
    key.position.set(3.5, 5.5, 4.0);
    const rim = new THREE.PointLight(0x38bdf8, 2.5, 12);
    rim.position.set(-2.8, 1.8, -2.5);
    scene.add(hemi, key, rim);

    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.y = -0.95;
    const pedBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.38, 1.55, 0.24, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.72 })
    );
    const pedRim = new THREE.Mesh(
      new THREE.TorusGeometry(1.39, 0.045, 10, 40),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.7,
      })
    );
    pedRim.rotation.x = Math.PI / 2;
    pedRim.position.y = 0.12;
    pedestalGroup.add(pedBase, pedRim);
    scene.add(pedestalGroup);

    const showcaseRoot = new THREE.Group();
    showcaseRootRef.current = showcaseRoot;
    scene.add(showcaseRoot);

    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width < 10 || rect.height < 10) return;
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height);
    });
    ro.observe(container);

    const clock = new THREE.Clock();
    let rafId = 0;
    const renderLoop = () => {
      const t = clock.getElapsedTime();
      if (animateFnRef.current) animateFnRef.current(t);
      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(renderLoop);
    };
    rafId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      showcaseRootRef.current = null;
      animateFnRef.current = null;
      disposeObject3D(scene);
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  // Swap only the active 3D sculpture inside showcaseRootRef cleanly on selection change
  useEffect(() => {
    const root = showcaseRootRef.current;
    if (!root) return;

    while (root.children.length > 0) {
      const child = root.children[0];
      root.remove(child);
      disposeObject3D(child);
    }

    if (section === 'crates') {
      const built = buildCrate3DGroup(selectedCrate);
      root.add(built.group);
      let openAngle = 0;
      animateFnRef.current = (t) => {
        const targetAngle = chestOpenRef.current ? -1.18 : 0;
        openAngle += (targetAngle - openAngle) * 0.12;
        built.lidPivot.rotation.x = openAngle;
        built.group.position.y = Math.sin(t * 2.2) * 0.08 + (chestOpenRef.current ? 0.06 : 0);
        built.gemMesh.rotation.y = t * 2.5;
        built.ringMesh.rotation.z = t * 1.1;
      };
    } else if (section === 'pet' && activeCosmeticItem) {
      const built = buildPet3DGroup(activeCosmeticItem);
      root.add(built.group);
      animateFnRef.current = built.animate;
    } else if (activeCosmeticItem) {
      const isSecretLocked =
        !unlockedSet.has(activeCosmeticItem.id) && Boolean(activeCosmeticItem.hiddenUntilUnlocked);
      const built = buildCosmetic3DGroup(activeCosmeticItem, isSecretLocked);
      root.add(built.group);
      animateFnRef.current = built.animate;
    } else {
      animateFnRef.current = null;
    }
  }, [activeCosmeticItem, section, selectedCrate, unlockedSet]);

  const crateCfg = CRATE_TIER_CONFIGS[selectedCrate];
  const isCrateLeveledLocked = Boolean(crateCfg.leveledOnly) && gameMode !== 'leveled';
  const crateOwned = crateInventory[selectedCrate] || 0;

  const navItems: { id: ShowcaseSection; label: string }[] = [
    { id: 'crates', label: 'Kutular' },
    { id: 'pet', label: `Pet (${ownershipSummary.byCategory.pet.owned}/5)` },
    { id: 'hat', label: `Şapka (${ownershipSummary.byCategory.hat.owned})` },
    { id: 'glasses', label: `Gözlük (${ownershipSummary.byCategory.glasses.owned})` },
    { id: 'skin', label: `Renk (${ownershipSummary.byCategory.skin.owned})` },
    { id: 'trail', label: `İz (${ownershipSummary.byCategory.trail.owned})` },
    {
      id: 'suit',
      label: `Kostüm (${ownershipSummary.byCategory.suit.owned + (gameMode === 'leveled' ? ownershipSummary.byCategory.leveled.owned : 0)})`,
    },
    {
      id: 'special',
      label: `Özel (${ownershipSummary.byCategory.special.owned}/${ownershipSummary.byCategory.special.total})`,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Sub-navigation Switcher covering Crates, all Cosmetic Categories, and Special section right next to Costume */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 p-1 bg-slate-800 rounded-xl border border-slate-700/80">
        {navItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setSection(tab.id);
              setIsChestOpen(false);
            }}
            className={`py-1.5 px-1 rounded-lg text-[10px] font-extrabold font-mono-num transition-colors cursor-pointer truncate ${
              section === tab.id
                ? tab.id === 'special'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow'
                  : 'bg-cyan-400 text-slate-950 shadow'
                : tab.id === 'special'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-400/40 hover:text-amber-200'
                  : 'text-slate-300 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Interactive 3D Canvas Stage (NO backdrop-blur over WebGL!) */}
      <div className="relative rounded-2xl border border-cyan-500/40 bg-slate-950 overflow-hidden shadow-inner">
        <div
          ref={mountRef}
          onClick={() => {
            if (section === 'crates') setIsChestOpen((p) => !p);
          }}
          className="w-full h-[185px] landscape:h-[165px] touch-none overscroll-contain cursor-grab active:cursor-grabbing"
        />

        <div className="pointer-events-none absolute top-2.5 left-3 right-3 flex items-center justify-between gap-2">
          <span className="px-2 py-1 rounded-md bg-slate-900/90 border border-slate-700 text-[10px] font-bold text-cyan-200 inline-flex items-center gap-1">
            <RotateCw className="w-3 h-3" />
            Sürükle çevir · Yakınlaştır
          </span>

          {section === 'crates' && (
            <button
              type="button"
              onClick={() => setIsChestOpen((p) => !p)}
              className="pointer-events-auto px-2.5 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-extrabold cursor-pointer transition-colors"
            >
              {isChestOpen ? 'Kapağı Kapat' : 'Kapağı Aç / Bak'}
            </button>
          )}
        </div>
      </div>

      {/* Section Controls & Quick Action Card */}
      {section === 'crates' ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {CRATE_TIER_ORDER.map((tier) => {
              const cfg = CRATE_TIER_CONFIGS[tier];
              const owned = crateInventory[tier] || 0;
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    setSelectedCrate(tier);
                    setIsChestOpen(false);
                  }}
                  className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                    selectedCrate === tier
                      ? 'bg-cyan-500/20 border-cyan-400 text-white'
                      : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="text-[11px] font-extrabold truncate">{cfg.name}</div>
                  <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono-num text-amber-300">
                    <span>{cfg.unitCost}F</span>
                    {owned > 0 && <span className="text-cyan-300">x{owned}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 font-extrabold text-white text-sm">
                  {selectedCrate === 'mythic' || selectedCrate === 'special' ? (
                    <Crown
                      className={`w-4 h-4 ${
                        selectedCrate === 'special' ? 'text-amber-300' : 'text-rose-400'
                      }`}
                    />
                  ) : (
                    <Gift className="w-4 h-4 text-amber-300" />
                  )}
                  <span>{crateCfg.name}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{crateCfg.description}</p>
              </div>
              {crateOwned > 0 && (
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-mono-num text-xs font-bold shrink-0">
                  x{crateOwned}
                </span>
              )}
            </div>

            {isCrateLeveledLocked ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-emerald-500/40">
                <span className="text-[11px] font-semibold text-emerald-200">
                  Yalnızca Seviyeli modda açılır.
                </span>
                {onSwitchToLeveled && (
                  <button
                    type="button"
                    onClick={onSwitchToLeveled}
                    className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-extrabold cursor-pointer"
                  >
                    Seviyeliye Geç
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onBuySingleCrate(selectedCrate)}
                  disabled={peanutBank < crateCfg.unitCost}
                  className={`py-2 px-3 rounded-lg text-xs font-extrabold font-mono-num inline-flex items-center justify-center gap-1.5 transition-colors ${
                    peanutBank >= crateCfg.unitCost
                      ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Çantaya +1 · {crateCfg.unitCost}F</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCrate(selectedCrate)}
                  disabled={peanutBank < crateCfg.unitCost}
                  className={`py-2 px-3 rounded-lg text-xs font-extrabold font-mono-num transition-colors ${
                    peanutBank >= crateCfg.unitCost
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  1x Hemen Aç · {crateCfg.unitCost}F
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        (() => {
          const list = itemsByCategory[section];
          const active = activeCosmeticItem!;
          const isUnlocked = unlockedSet.has(active.id);
          const isEquipped = equipped[active.category] === active.id;
          const isDropOnly = Boolean(active.dropOnly);
          const isSecretLocked = !isUnlocked && Boolean(active.hiddenUntilUnlocked);
          const canAfford = !isDropOnly && peanutBank >= active.cost;
          const rarityMeta = RARITY_LABELS[active.rarity];

          return (
            <div className="flex flex-col gap-3">
              {section === 'special' && (
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/75 via-purple-950/60 to-slate-900 border border-amber-400/55 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-extrabold text-amber-300">
                      Özel İmparator Kasası (%60 Özel Düşüş)
                    </div>
                    <div className="text-[10px] text-slate-300 truncate">
                      3D incele, doğrudan al veya şans kasasıyla çıkar!
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCrate('special');
                      setSection('crates');
                      setIsChestOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-extrabold shrink-0 cursor-pointer"
                  >
                    3D Kutu (120F)
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5 max-h-[155px] overflow-y-auto pr-1">
                {list.map((item) => {
                  const unlocked = unlockedSet.has(item.id);
                  const secretLocked = !unlocked && Boolean(item.hiddenUntilUnlocked);
                  const eq = equipped[item.category] === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setSelectedByCat((prev) => ({ ...prev, [section]: item.id }))
                      }
                      className={`p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                        active.id === item.id
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] font-bold truncate">
                        {secretLocked ? '???' : item.name}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-[10px]">
                        <span className={RARITY_LABELS[item.rarity].textClass}>
                          {secretLocked ? 'Gizli' : RARITY_LABELS[item.rarity].label}
                        </span>
                        <span className="font-mono-num text-amber-300 font-bold">
                          {eq
                            ? 'Takılı'
                            : unlocked
                              ? 'Açık'
                              : item.dropOnly
                                ? 'Kutu'
                                : `${item.cost}F`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
                    <span className="font-extrabold text-sm text-white truncate">
                      {isSecretLocked ? '??? (Gizli Kostüm)' : active.name}
                    </span>
                  </div>
                  <div className={`text-xs font-semibold mt-0.5 ${rarityMeta.textClass}`}>
                    {isSecretLocked
                      ? active.dropRateLabel || 'Sadece Kutudan Çıkar'
                      : `${rarityMeta.label} · 3D İnceleme`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectOrBuyCosmetic(active)}
                  disabled={!isUnlocked && (isDropOnly || !canAfford)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 transition-colors ${
                    isEquipped
                      ? 'bg-purple-500 hover:bg-purple-400 text-white cursor-pointer'
                      : isUnlocked
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 cursor-pointer'
                        : isDropOnly
                          ? 'bg-rose-500/20 border border-rose-400/50 text-rose-200 cursor-not-allowed'
                          : canAfford
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isEquipped ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {active.category === 'pet' || active.category === 'suit'
                          ? 'Takılı · Çıkar'
                          : 'Takılı'}
                      </span>
                    </>
                  ) : isUnlocked ? (
                    <span>Kuşan</span>
                  ) : isDropOnly ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Kutu Özel</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span className="font-mono-num">{active.cost}F Al</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
