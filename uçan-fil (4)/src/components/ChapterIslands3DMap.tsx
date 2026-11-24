import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Compass, Crown, Lock, Play, RotateCcw, Shield, Skull } from 'lucide-react';
import { getChapterInfo, getLevelConfig, IslandThemeKind, LEVELS_PER_CHAPTER } from '../data/levels';
import { BIOME_THEMES } from '../utils/renderer';

interface ChapterIslands3DMapProps {
  selectedLevel: number;
  unlockedLevel: number;
  onSelectLevel: (level: number) => void;
  onStartLevel: (level: number) => void;
}

interface IslandPreset {
  chapter: number;
  shortTitle: string;
  chapterTitle: string;
  turfColor: number;
  rockMid: number;
  rockDark: number;
  accentColor: number;
  skyTint: number;
  themeKind: IslandThemeKind;
  isUnlocked: boolean;
  isCleared: boolean;
  shieldUnlocked: boolean;
  firstLevel: number;
  lastLevel: number;
  position: THREE.Vector3;
}

function getThemeConfig(chapter: number): {
  shortTitle: string;
  turfColor: number;
  rockMid: number;
  rockDark: number;
  accentColor: number;
  skyTint: number;
  themeKind: IslandThemeKind;
} {
  const firstLevel = (chapter - 1) * LEVELS_PER_CHAPTER + 1;
  const info = getChapterInfo(firstLevel);
  const biome = BIOME_THEMES[info.biomeIndex % BIOME_THEMES.length];

  return {
    shortTitle: info.shortTitle,
    turfColor: new THREE.Color(biome.groundTop).getHex(),
    rockMid: new THREE.Color(biome.earthTop).getHex(),
    rockDark: new THREE.Color(biome.earthBottom).getHex(),
    accentColor: new THREE.Color(biome.sceneryAccent || biome.badgeColor).getHex(),
    skyTint: new THREE.Color(biome.badgeColor).getHex(),
    themeKind: info.islandThemeKind,
  };
}

function createProceduralSurfaceTexture(baseHex: number, darkHex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const base = new THREE.Color(baseHex);
    const dark = new THREE.Color(darkHex);
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, `#${base.getHexString()}`);
    grad.addColorStop(1, `#${dark.getHexString()}`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    // Subtle organic grain patches
    for (let i = 0; i < 160; i++) {
      const x = ((i * 73) % 128);
      const y = ((i * 41) % 128);
      const r = 1.5 + (i % 4);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.09)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function detectSoftwareWebGL(): boolean {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

// Reusable math objects outside animation loop
const _pointerNdc = new THREE.Vector2();
const _targetFocus = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();

export default function ChapterIslands3DMap({
  selectedLevel,
  unlockedLevel,
  onSelectLevel,
  onStartLevel,
}: ChapterIslands3DMapProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const selectedLevelRef = useRef(selectedLevel);
  selectedLevelRef.current = selectedLevel;
  const unlockedLevelRef = useRef(unlockedLevel);
  unlockedLevelRef.current = unlockedLevel;
  const onSelectLevelRef = useRef(onSelectLevel);
  onSelectLevelRef.current = onSelectLevel;
  const onStartLevelRef = useRef(onStartLevel);
  onStartLevelRef.current = onStartLevel;

  const selectedCfg = useMemo(() => getLevelConfig(selectedLevel), [selectedLevel]);
  const unlockedChapter = getChapterInfo(unlockedLevel).chapter;
  const totalDisplayedChapters = Math.max(6, unlockedChapter + 1);

  const islandPresets = useMemo<IslandPreset[]>(() => {
    const list: IslandPreset[] = [];
    for (let idx = 0; idx < totalDisplayedChapters; idx++) {
      const chapter = idx + 1;
      const firstLevel = (chapter - 1) * LEVELS_PER_CHAPTER + 1;
      const lastLevel = chapter * LEVELS_PER_CHAPTER;
      const info = getChapterInfo(firstLevel);
      const theme = getThemeConfig(chapter);

      // Scenic winding archipelago curve in 3D sky space
      const x = (idx - (totalDisplayedChapters - 1) / 2) * 8.4;
      const z = Math.sin(idx * 0.95) * 4.2;
      const y = Math.cos(idx * 0.8) * 1.15 + idx * 0.35;

      list.push({
        chapter,
        shortTitle: theme.shortTitle,
        chapterTitle: info.title,
        turfColor: theme.turfColor,
        rockMid: theme.rockMid,
        rockDark: theme.rockDark,
        accentColor: theme.accentColor,
        skyTint: theme.skyTint,
        themeKind: theme.themeKind,
        isUnlocked: unlockedLevel >= firstLevel,
        isCleared: unlockedLevel > lastLevel,
        shieldUnlocked: info.shieldUnlocked,
        firstLevel,
        lastLevel,
        position: new THREE.Vector3(x, y, z),
      });
    }
    return list;
  }, [totalDisplayedChapters, unlockedLevel]);

  const cameraFocusTriggerRef = useRef<((chapter: number, instant?: boolean) => void) | null>(null);

  // Sync camera glide when user picks another chapter via bottom dock
  useEffect(() => {
    cameraFocusTriggerRef.current?.(selectedCfg.chapter, false);
  }, [selectedCfg.chapter]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(260, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071022);
    scene.fog = new THREE.FogExp2(0x071022, 0.0115);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.2, 220);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.075;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 6.5;
    controls.maxDistance = 44;
    controls.minPolarAngle = 0.28;
    controls.maxPolarAngle = Math.PI * 0.49;

    // 3-point outdoor sky rig
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e1b4b, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.0);
    keyLight.position.set(18, 28, 16);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 90;
      const d = 28;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.75);
    rimLight.position.set(-16, 10, -18);
    scene.add(rimLight);

    // Track disposable resources cleanly
    const geometriesToDispose: THREE.BufferGeometry[] = [];
    const materialsToDispose: THREE.Material[] = [];
    const texturesToDispose: THREE.Texture[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometriesToDispose.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materialsToDispose.push(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      texturesToDispose.push(t);
      return t;
    };

    // Instanced Sky Stars
    const starCount = 240;
    const starGeo = trackGeo(new THREE.OctahedronGeometry(0.11, 0));
    const starMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
    );
    const starsMesh = new THREE.InstancedMesh(starGeo, starMat, starCount);
    const starColors = [0xfef08a, 0xbae6fd, 0xfbcfe8, 0xffffff];
    const tempColor = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      const angle = i * 2.39996;
      const radius = 34 + (i % 17) * 2.1;
      const sy = -10 + ((i * 19) % 42);
      _dummyObj.position.set(
        Math.cos(angle) * radius,
        sy,
        Math.sin(angle) * radius
      );
      const scale = 0.55 + (i % 5) * 0.24;
      _dummyObj.scale.setScalar(scale);
      _dummyObj.updateMatrix();
      starsMesh.setMatrixAt(i, _dummyObj.matrix);
      tempColor.setHex(starColors[i % starColors.length]);
      starsMesh.setColorAt(i, tempColor);
    }
    starsMesh.instanceMatrix.needsUpdate = true;
    if (starsMesh.instanceColor) starsMesh.instanceColor.needsUpdate = true;
    starsMesh.computeBoundingSphere();
    scene.add(starsMesh);

    // Shared geometries for islands & landmarks
    const turfGeo = trackGeo(new THREE.CylinderGeometry(2.85, 2.75, 0.52, 10));
    const rockConeGeo = trackGeo(new THREE.ConeGeometry(2.72, 3.1, 8));
    const subRockGeo = trackGeo(new THREE.DodecahedronGeometry(0.75, 0));
    const pebbleGeo = trackGeo(new THREE.OctahedronGeometry(0.26, 0));
    const pedestalGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.4, 0.22, 8));
    const crystalGeo = trackGeo(new THREE.OctahedronGeometry(0.28, 0));
    const bossSpireGeo = trackGeo(new THREE.ConeGeometry(0.32, 0.92, 6));
    const haloRingGeo = trackGeo(new THREE.TorusGeometry(0.46, 0.055, 8, 24));
    const cloudPuffGeo = trackGeo(new THREE.SphereGeometry(0.75, 10, 8));
    const cloudMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.92,
        metalness: 0.02,
        transparent: true,
        opacity: 0.78,
      })
    );

    interface AnimatedIsland {
      group: THREE.Group;
      baseY: number;
      phase: number;
      pebbles: THREE.Mesh[];
      cosmicHalo?: THREE.Mesh;
      chapter: number;
    }

    interface AnimatedStageNode {
      level: number;
      chapter: number;
      crystalMesh: THREE.Mesh;
      pedestalMesh: THREE.Mesh;
      haloMesh: THREE.Mesh;
      baseY: number;
    }

    const animatedIslands: AnimatedIsland[] = [];
    const animatedStages: AnimatedStageNode[] = [];
    const clickables: THREE.Object3D[] = [];
    const islandCenterByChapter = new Map<number, THREE.Vector3>();

    islandPresets.forEach((island, idx) => {
      islandCenterByChapter.set(island.chapter, island.position.clone());
      const islandGroup = new THREE.Group();
      islandGroup.position.copy(island.position);

      const turfTex = trackTex(createProceduralSurfaceTexture(island.turfColor, island.rockMid));
      const rockTex = trackTex(createProceduralSurfaceTexture(island.rockMid, island.rockDark));

      const turfMat = trackMat(
        new THREE.MeshStandardMaterial({
          map: turfTex,
          color: island.isUnlocked ? 0xffffff : 0x64748b,
          roughness: 0.78,
          metalness: 0.06,
        })
      );
      const rockMat = trackMat(
        new THREE.MeshStandardMaterial({
          map: rockTex,
          color: island.isUnlocked ? 0xffffff : 0x475569,
          roughness: 0.92,
          metalness: 0.08,
          flatShading: true,
        })
      );
      const accentMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: island.accentColor,
          emissive: island.isUnlocked ? island.accentColor : 0x0f172a,
          emissiveIntensity: island.isUnlocked ? 0.35 : 0.04,
          roughness: 0.25,
          metalness: 0.65,
        })
      );

      // 1. Main Turf Slab + Cliff Underside + Sub-rocks
      const turfMesh = new THREE.Mesh(turfGeo, turfMat);
      turfMesh.position.y = 0;
      turfMesh.receiveShadow = true;
      turfMesh.castShadow = true;
      turfMesh.userData = { clickKind: 'island', chapter: island.chapter };
      islandGroup.add(turfMesh);
      clickables.push(turfMesh);

      const cliffMesh = new THREE.Mesh(rockConeGeo, rockMat);
      cliffMesh.rotation.x = Math.PI;
      cliffMesh.position.y = -1.75;
      cliffMesh.castShadow = true;
      cliffMesh.userData = { clickKind: 'island', chapter: island.chapter };
      islandGroup.add(cliffMesh);
      clickables.push(cliffMesh);

      for (let r = 0; r < 3; r++) {
        const subRock = new THREE.Mesh(subRockGeo, rockMat);
        const ang = (r / 3) * Math.PI * 2 + idx * 0.7;
        subRock.position.set(Math.cos(ang) * 1.55, -0.95 - r * 0.22, Math.sin(ang) * 1.45);
        subRock.scale.set(0.9, 1.35, 0.85);
        subRock.rotation.set(r * 0.4, ang, r * 0.2);
        islandGroup.add(subRock);
      }

      // Floating drifting pebbles under the cliff
      const pebbles: THREE.Mesh[] = [];
      for (let p = 0; p < 3; p++) {
        const peb = new THREE.Mesh(pebbleGeo, rockMat);
        const pang = p * 2.1 + idx;
        peb.position.set(Math.cos(pang) * 2.1, -2.5 - p * 0.45, Math.sin(pang) * 2.1);
        islandGroup.add(peb);
        pebbles.push(peb);
      }

      // 2. Theme-Specific Composite 3D Landmarks (3–6 distinct parts)
      let cosmicHalo: THREE.Mesh | undefined;
      const landmarkGroup = new THREE.Group();
      landmarkGroup.position.set(-0.65, 0.26, -0.65);

      if (island.themeKind === 'savanna') {
        const trunkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 }));
        const leafMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.75 }));
        const trunk = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.24, 1.45, 7)), trunkMat);
        trunk.position.y = 0.72;
        trunk.castShadow = true;
        landmarkGroup.add(trunk);

        const branch = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.12, 0.9, 6)), trunkMat);
        branch.position.set(0.36, 1.15, 0);
        branch.rotation.z = -0.65;
        landmarkGroup.add(branch);

        const canopy1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.15, 0.9, 0.34, 8)), leafMat);
        canopy1.position.set(0, 1.5, 0);
        canopy1.castShadow = true;
        landmarkGroup.add(canopy1);

        const canopy2 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.7, 0.55, 0.28, 7)), leafMat);
        canopy2.position.set(0.68, 1.38, 0.2);
        landmarkGroup.add(canopy2);

        const sunStone = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.36, 0)), accentMat);
        sunStone.position.set(-0.95, 0.3, 0.55);
        landmarkGroup.add(sunStone);
      } else if (island.themeKind === 'sakura') {
        const trunkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: 0.85 }));
        const blossomMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.65 }));
        const blossomDeep = trackMat(new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.65 }));
        const trunk = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.25, 1.5, 7)), trunkMat);
        trunk.position.y = 0.72;
        trunk.rotation.z = 0.1;
        trunk.castShadow = true;
        landmarkGroup.add(trunk);

        const puffPositions = [
          [0, 1.55, 0, 0.72],
          [-0.52, 1.4, 0.22, 0.52],
          [0.54, 1.44, -0.18, 0.54],
          [0.1, 1.82, 0.12, 0.48],
        ];
        puffPositions.forEach(([px, py, pz, pr], pi) => {
          const puff = new THREE.Mesh(
            trackGeo(new THREE.DodecahedronGeometry(pr, 1)),
            pi % 2 === 0 ? blossomMat : blossomDeep
          );
          puff.position.set(px, py, pz);
          puff.castShadow = true;
          landmarkGroup.add(puff);
        });
      } else if (island.themeKind === 'frost') {
        const iceMat = trackMat(
          new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8,
            roughness: 0.15,
            metalness: 0.15,
            clearcoat: 1.0,
          })
        );
        const snowMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf0f9ff, roughness: 0.8 }));
        const peak1 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.68, 1.95, 5)), iceMat);
        peak1.position.set(0, 0.96, 0);
        peak1.castShadow = true;
        landmarkGroup.add(peak1);

        const snowCap = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.36, 0.75, 5)), snowMat);
        snowCap.position.set(0, 1.58, 0);
        landmarkGroup.add(snowCap);

        const peak2 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.45, 1.35, 5)), iceMat);
        peak2.position.set(0.72, 0.66, 0.28);
        landmarkGroup.add(peak2);

        const peak3 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.35, 1.05, 5)), snowMat);
        peak3.position.set(-0.62, 0.5, 0.35);
        landmarkGroup.add(peak3);
      } else if (island.themeKind === 'volcano') {
        const basaltMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.95, flatShading: true }));
        const lavaMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: 0xf97316,
            emissive: 0xef4444,
            emissiveIntensity: 1.3,
            roughness: 0.3,
          })
        );
        const cone = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 1.15, 1.55, 8)), basaltMat);
        cone.position.y = 0.76;
        cone.castShadow = true;
        landmarkGroup.add(cone);

        const caldera = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.36, 0.16, 8)), lavaMat);
        caldera.position.y = 1.52;
        landmarkGroup.add(caldera);

        const spike1 = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.22, 0.9, 5)), basaltMat);
        spike1.position.set(-0.92, 0.42, 0.42);
        landmarkGroup.add(spike1);

        const ember = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.18, 0)), lavaMat);
        ember.position.set(0.1, 2.05, 0);
        landmarkGroup.add(ember);
      } else if (island.themeKind === 'cyber') {
        const bodyMat = trackMat(
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.85 })
        );
        const neonCyan = trackMat(
          new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.2, roughness: 0.2 })
        );
        const neonPink = trackMat(
          new THREE.MeshStandardMaterial({ color: 0xe879f9, emissive: 0xe879f9, emissiveIntensity: 1.1, roughness: 0.2 })
        );
        const towerMain = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 1.85, 0.62)), bodyMat);
        towerMain.position.set(0, 0.92, 0);
        towerMain.castShadow = true;
        landmarkGroup.add(towerMain);

        const band1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.14, 0.68)), neonCyan);
        band1.position.set(0, 1.4, 0);
        landmarkGroup.add(band1);

        const band2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.12, 0.68)), neonPink);
        band2.position.set(0, 0.85, 0);
        landmarkGroup.add(band2);

        const sideTower = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 1.15, 0.45)), bodyMat);
        sideTower.position.set(0.7, 0.57, 0.25);
        landmarkGroup.add(sideTower);

        const sideCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.48, 0.1, 0.48)), neonCyan);
        sideCap.position.set(0.7, 1.16, 0.25);
        landmarkGroup.add(sideCap);
      } else {
        const crystalMat1 = trackMat(
          new THREE.MeshPhysicalMaterial({
            color: 0xe879f9,
            emissive: 0x9333ea,
            emissiveIntensity: 0.55,
            roughness: 0.12,
            metalness: 0.25,
            clearcoat: 1.0,
          })
        );
        const crystalMat2 = trackMat(
          new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.45,
            roughness: 0.12,
            metalness: 0.25,
            clearcoat: 1.0,
          })
        );
        const spire1 = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.55, 0)), crystalMat1);
        spire1.scale.set(0.75, 1.9, 0.75);
        spire1.position.set(0, 0.95, 0);
        landmarkGroup.add(spire1);

        const spire2 = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.4, 0)), crystalMat2);
        spire2.scale.set(0.7, 1.5, 0.7);
        spire2.position.set(0.62, 0.68, 0.24);
        spire2.rotation.z = -0.22;
        landmarkGroup.add(spire2);

        cosmicHalo = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.05, 0.06, 8, 30)), accentMat);
        cosmicHalo.position.set(0, 1.25, 0);
        cosmicHalo.rotation.set(Math.PI / 2.6, 0.3, 0);
        landmarkGroup.add(cosmicHalo);
      }

      islandGroup.add(landmarkGroup);

      // 3. 5 Interactive Stage Crystal Pedestals arranged in a crisp foreground arc
      for (let s = 0; s < LEVELS_PER_CHAPTER; s++) {
        const lvl = island.firstLevel + s;
        const cfg = getLevelConfig(lvl);
        const stageUnlocked = unlockedLevel >= lvl;
        const stageCleared = unlockedLevel > lvl;
        const isBigBoss = cfg.bossKind === 'boss';
        const isMiniBoss = cfg.bossKind === 'miniboss';

        const arcAngle = -Math.PI * 0.78 + (s / (LEVELS_PER_CHAPTER - 1)) * Math.PI * 0.72;
        const radius = 1.82;
        const sx = Math.cos(arcAngle) * radius + 0.35;
        const sz = Math.sin(arcAngle) * -radius + 0.55;

        const pedColor = !stageUnlocked
          ? 0x334155
          : stageCleared
            ? 0x10b981
            : 0x38bdf8;

        const pedMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: pedColor,
            roughness: 0.45,
            metalness: 0.35,
          })
        );

        const crystalColor = !stageUnlocked
          ? 0x475569
          : isBigBoss
            ? 0xf43f5e
            : isMiniBoss
              ? 0xfb923c
              : stageCleared
                ? 0x34d399
                : 0x38bdf8;

        const crystalMat = trackMat(
          new THREE.MeshStandardMaterial({
            color: crystalColor,
            emissive: stageUnlocked ? crystalColor : 0x000000,
            emissiveIntensity: stageUnlocked ? 0.55 : 0,
            roughness: 0.2,
            metalness: 0.6,
          })
        );

        const pedestal = new THREE.Mesh(pedestalGeo, pedMat);
        pedestal.position.set(sx, 0.36, sz);
        pedestal.castShadow = true;
        pedestal.userData = { clickKind: 'stage', level: lvl, chapter: island.chapter };
        islandGroup.add(pedestal);
        clickables.push(pedestal);

        const crystal = new THREE.Mesh(
          isBigBoss || isMiniBoss ? bossSpireGeo : crystalGeo,
          crystalMat
        );
        const crystalBaseY = isBigBoss || isMiniBoss ? 0.92 : 0.78;
        crystal.position.set(sx, crystalBaseY, sz);
        crystal.castShadow = true;
        crystal.userData = { clickKind: 'stage', level: lvl, chapter: island.chapter };
        islandGroup.add(crystal);
        clickables.push(crystal);

        const haloMat = trackMat(
          new THREE.MeshBasicMaterial({
            color: 0xfacc15,
            transparent: true,
            opacity: 0.95,
          })
        );
        const halo = new THREE.Mesh(haloRingGeo, haloMat);
        halo.rotation.x = Math.PI / 2;
        halo.position.set(sx, 0.38, sz);
        halo.visible = lvl === selectedLevelRef.current;
        islandGroup.add(halo);

        animatedStages.push({
          level: lvl,
          chapter: island.chapter,
          crystalMesh: crystal,
          pedestalMesh: pedestal,
          haloMesh: halo,
          baseY: crystalBaseY,
        });
      }

      // 4. Fluffy floating sky cloud beside each island
      const cloudGroup = new THREE.Group();
      cloudGroup.position.set(2.8, -0.5 + (idx % 2) * 0.9, -2.2);
      const puff1 = new THREE.Mesh(cloudPuffGeo, cloudMat);
      const puff2 = new THREE.Mesh(cloudPuffGeo, cloudMat);
      puff2.scale.setScalar(0.75);
      puff2.position.set(0.65, -0.1, 0.15);
      const puff3 = new THREE.Mesh(cloudPuffGeo, cloudMat);
      puff3.scale.setScalar(0.68);
      puff3.position.set(-0.62, -0.14, -0.1);
      cloudGroup.add(puff1, puff2, puff3);
      islandGroup.add(cloudGroup);

      scene.add(islandGroup);
      animatedIslands.push({
        group: islandGroup,
        baseY: island.position.y,
        phase: idx * 1.1,
        pebbles,
        cosmicHalo,
        chapter: island.chapter,
      });
    });

    // Sky Bridges connecting consecutive islands (glowing stepping orbs + curved tube)
    const beadGeo = trackGeo(new THREE.SphereGeometry(0.14, 8, 8));
    for (let i = 0; i < islandPresets.length - 1; i++) {
      const a = islandPresets[i];
      const b = islandPresets[i + 1];
      const mid = new THREE.Vector3()
        .addVectors(a.position, b.position)
        .multiplyScalar(0.5);
      mid.y += 1.15;

      const curve = new THREE.QuadraticBezierCurve3(
        a.position.clone().add(new THREE.Vector3(2.5, 0.25, 0)),
        mid,
        b.position.clone().add(new THREE.Vector3(-2.5, 0.25, 0))
      );
      const bridgeUnlocked = b.isUnlocked;
      const beadMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: bridgeUnlocked ? 0x34d399 : 0x475569,
          emissive: bridgeUnlocked ? 0x10b981 : 0x000000,
          emissiveIntensity: bridgeUnlocked ? 0.6 : 0,
          roughness: 0.3,
        })
      );
      const steps = 6;
      for (let st = 1; st < steps; st++) {
        const pt = curve.getPoint(st / steps);
        const bead = new THREE.Mesh(beadGeo, beadMat);
        bead.position.copy(pt);
        scene.add(bead);
      }
    }

    // Smooth camera focus animation state
    let isCameraGliding = false;
    const focusOnChapter = (chapter: number, instant = false) => {
      const center = islandCenterByChapter.get(chapter) || islandPresets[0]?.position;
      if (!center) return;
      _targetFocus.copy(center).add(new THREE.Vector3(0, 0.55, 0));
      _desiredCamPos.copy(center).add(new THREE.Vector3(0.8, 5.4, 9.2));
      if (instant) {
        controls.target.copy(_targetFocus);
        camera.position.copy(_desiredCamPos);
        controls.update();
        isCameraGliding = false;
      } else {
        isCameraGliding = true;
      }
    };

    cameraFocusTriggerRef.current = focusOnChapter;
    focusOnChapter(getChapterInfo(selectedLevelRef.current).chapter, true);

    const stopGlide = () => {
      isCameraGliding = false;
    };
    controls.addEventListener('start', stopGlide);

    // Pre-compile shaders on real GPU devices
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pointer raycasting with drag guard so touch orbit doesn't misclick
    const raycaster = new THREE.Raycaster();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (dx * dx + dy * dy > 64) return; // Dragged to orbit/pan

      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(_pointerNdc, camera);
      const hits = raycaster.intersectObjects(clickables, false);
      if (hits.length === 0) return;

      const hitData = hits[0].object.userData as {
        clickKind?: 'stage' | 'island';
        level?: number;
        chapter?: number;
      };

      if (hitData.clickKind === 'stage' && typeof hitData.level === 'number') {
        if (unlockedLevelRef.current >= hitData.level) {
          onSelectLevelRef.current(hitData.level);
        }
      } else if (hitData.clickKind === 'island' && typeof hitData.chapter === 'number') {
        const firstLvl = (hitData.chapter - 1) * LEVELS_PER_CHAPTER + 1;
        const lastLvl = hitData.chapter * LEVELS_PER_CHAPTER;
        if (unlockedLevelRef.current >= firstLvl) {
          const targetLvl = Math.min(unlockedLevelRef.current, lastLvl);
          onSelectLevelRef.current(targetLvl);
        } else {
          focusOnChapter(hitData.chapter, false);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ResizeObserver for crisp viewport sizing on mobile rotation / split screen
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(300, container.clientWidth);
      const h = Math.max(240, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    // Animation loop (strictly delta-driven, paced with afterDraw on software WebGL)
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const animate = () => {
      if (disposed) return;
      const nowMs = performance.now();
      const delta = Math.min(0.05, Math.max(0.001, (nowMs - lastTime) / 1000));
      lastTime = nowMs;
      const elapsed = nowMs * 0.001;

      // Gentle floating bob on each island & underside pebbles
      for (let i = 0; i < animatedIslands.length; i++) {
        const isl = animatedIslands[i];
        isl.group.position.y = isl.baseY + Math.sin(elapsed * 1.15 + isl.phase) * 0.16;
        for (let p = 0; p < isl.pebbles.length; p++) {
          isl.pebbles[p].rotation.y += delta * 0.65;
          isl.pebbles[p].position.y = -2.45 - p * 0.42 + Math.sin(elapsed * 1.8 + p + isl.phase) * 0.12;
        }
        if (isl.cosmicHalo) {
          isl.cosmicHalo.rotation.z += delta * 0.55;
        }
      }

      // Highlight & spin stage crystals + active level beacon ring
      const currentSelectedLvl = selectedLevelRef.current;
      for (let i = 0; i < animatedStages.length; i++) {
        const st = animatedStages[i];
        const isActive = st.level === currentSelectedLvl;
        st.crystalMesh.rotation.y += delta * (isActive ? 2.4 : 0.85);
        st.crystalMesh.position.y =
          st.baseY +
          Math.sin(elapsed * 2.2 + st.level) * 0.06 +
          (isActive ? 0.14 : 0);
        st.haloMesh.visible = isActive;
        if (isActive) {
          const pulseScale = 1 + Math.sin(elapsed * 4.0) * 0.09;
          st.haloMesh.scale.setScalar(pulseScale);
        }
      }

      // Smooth damped camera glide toward focused island
      if (isCameraGliding) {
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetFocus.x, 6.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetFocus.y, 6.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetFocus.z, 6.5, delta);

        camera.position.x = THREE.MathUtils.damp(camera.position.x, _desiredCamPos.x, 5.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _desiredCamPos.y, 5.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _desiredCamPos.z, 5.5, delta);

        if (
          controls.target.distanceToSquared(_targetFocus) < 0.002 &&
          camera.position.distanceToSquared(_desiredCamPos) < 0.01
        ) {
          isCameraGliding = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(animate);
    } else {
      frameId = requestAnimationFrame(animate);
    }

    return () => {
      disposed = true;
      cameraFocusTriggerRef.current = null;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObs.disconnect();
      controls.removeEventListener('start', stopGlide);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      envTarget.dispose();
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
      texturesToDispose.forEach((t) => t.dispose());
      renderer.dispose();
    };
  }, [islandPresets]);

  const activeIslandPreset = islandPresets[selectedCfg.chapter - 1] || islandPresets[0];

  if (webglFailed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-200">
        <p className="text-sm font-bold text-amber-300">
          Cihazda 3D WebGL başlatılamadı.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Sağ üstteki 2D Görünüm butonuna dokunarak klasik ada haritasını kullanabilirsin.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-[#071022] select-none">
      {/* Dedicated Three.js WebGL Viewport */}
      <div ref={mountRef} className="w-full h-full touch-none overscroll-contain" />

      {/* Minimal Top-Left Chapter Info Readout (Solid translucent dark surface, zero backdrop-blur) */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-[78%] rounded-xl bg-slate-950/90 border border-slate-800 px-3 py-2 shadow-lg">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
          <Compass className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            Ada {selectedCfg.chapter} · {activeIslandPreset?.shortTitle}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-300">
          <span>{selectedCfg.chapterTitle}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 text-sky-300 font-semibold">
            {selectedCfg.shieldUnlocked ? (
              <>
                <Shield className="w-3 h-3" />
                <span>Kalkan Açık</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 text-slate-400" />
                <span className="text-slate-400">Kalkan 3. Ada+</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Camera Reset Quick Action (Top-Right inside 3D Viewport) */}
      <button
        type="button"
        onClick={() => cameraFocusTriggerRef.current?.(selectedCfg.chapter, false)}
        className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer touch-manipulation shadow-lg"
        title="Seçili adaya odaklan"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Odakla</span>
      </button>

      {/* Collapsible Unified Bottom Dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-24px)] max-w-[820px] flex flex-col items-center pointer-events-none">
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-t-xl bg-slate-950/95 border border-b-0 border-slate-700 text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer touch-manipulation"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Kontrolleri Göster</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Haritayı İncele (Gizle)</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto w-full rounded-2xl bg-slate-950/92 border border-slate-700/90 p-2.5 sm:p-3.5 shadow-2xl flex flex-col gap-2.5">
            {/* Quick Chapter Island Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x pb-0.5 scrollbar-thin">
              {islandPresets.map((isl) => {
                const isSelected = isl.chapter === selectedCfg.chapter;
                return (
                  <button
                    key={isl.chapter}
                    type="button"
                    onClick={() => {
                      if (isl.isUnlocked) {
                        onSelectLevel(Math.min(unlockedLevel, isl.lastLevel));
                      } else {
                        cameraFocusTriggerRef.current?.(isl.chapter, false);
                      }
                    }}
                    className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer touch-manipulation inline-flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-400 border-emerald-300 text-slate-950'
                        : isl.isUnlocked
                          ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-emerald-400/60'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    {!isl.isUnlocked && <Lock className="w-3 h-3 shrink-0" />}
                    <span>Ada {isl.chapter}</span>
                  </button>
                );
              })}
            </div>

            {/* 5 Stage Selector Buttons + Launch CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="grid grid-cols-5 gap-1.5 flex-1">
                {Array.from({ length: LEVELS_PER_CHAPTER }, (_, idx) => {
                  const lvl = (selectedCfg.chapter - 1) * LEVELS_PER_CHAPTER + 1 + idx;
                  const cfg = getLevelConfig(lvl);
                  const stageUnlocked = unlockedLevel >= lvl;
                  const stageCleared = unlockedLevel > lvl;
                  const isCurrent = selectedLevel === lvl;

                  return (
                    <button
                      key={lvl}
                      type="button"
                      disabled={!stageUnlocked}
                      onClick={() => onSelectLevel(lvl)}
                      className={`h-10 rounded-xl font-mono-num text-xs font-extrabold border transition-colors flex items-center justify-center gap-1 cursor-pointer touch-manipulation ${
                        !stageUnlocked
                          ? 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed'
                          : isCurrent
                            ? 'bg-emerald-400 border-emerald-300 text-slate-950 shadow'
                            : stageCleared
                              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/25'
                              : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
                      }`}
                      title={`Sv.${lvl} · ${cfg.title}`}
                    >
                      {!stageUnlocked ? (
                        <Lock className="w-3 h-3" />
                      ) : cfg.bossKind === 'boss' ? (
                        <Crown className="w-3.5 h-3.5 text-rose-500" />
                      ) : cfg.bossKind === 'miniboss' ? (
                        <Skull className="w-3.5 h-3.5 text-amber-400" />
                      ) : null}
                      <span>{lvl}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => onStartLevel(selectedLevel)}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs sm:text-sm font-extrabold shadow-lg cursor-pointer touch-manipulation whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>
                  Sv.{selectedLevel} Uçuşa Başla (+{selectedLevel >= unlockedLevel ? selectedCfg.rewardPeanuts : selectedCfg.replayPeanuts}F)
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
