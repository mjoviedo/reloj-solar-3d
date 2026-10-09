import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createPaperTexture,
  createWoodTexture,
  createTapeTexture,
  createGrassTexture,
  createStickWoodTexture,
  createSunCoreTexture,
  Dynamic360SkyManager,
} from './ProceduralTextures';

export interface SundialSceneProps {
  timeHours: number; // 6.0 to 18.0
  onTimeChange?: (newTime: number) => void;
  cameraPreset?: 'overhead' | 'perspective' | 'closeup';
  showShadowGuide?: boolean;
}

export const SundialScene: React.FC<SundialSceneProps> = ({
  timeHours,
  cameraPreset = 'perspective',
  showShadowGuide = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Dynamic 360 Sky Manager
  const skyManagerRef = useRef<Dynamic360SkyManager | null>(null);
  const skyMeshRef = useRef<THREE.Mesh | null>(null);

  // 3D Sun Object Refs
  const sunGroupRef = useRef<THREE.Group | null>(null);
  const sunCoreRef = useRef<THREE.Mesh | null>(null);
  const sunCoronaRef = useRef<THREE.Sprite | null>(null);
  const sunRaysRef = useRef<THREE.Mesh | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const shadowGuideLineRef = useRef<THREE.Line | null>(null);
  const groundMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Camera animation target
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetCamLookRef = useRef<THREE.Vector3 | null>(null);

  // Dimensions
  const TABLE_HEIGHT = 0.76;
  const STICK_HEIGHT = 0.45; // 45 cm varilla de madera
  const STICK_RADIUS = 0.007;
  const CLAY_RADIUS = 0.052;
  const CLAY_HEIGHT = 0.038;
  const SUN_ORBIT_RADIUS = 18.0; // Distance of the 3D Sun object in the sky

  // Coordenadas astronómicas para Córdoba, Argentina (Latitud 31.42° Sur)
  const LATITUDE_RAD = (-31.42 * Math.PI) / 180;
  const COS_LAT = Math.cos(LATITUDE_RAD); // ~0.85338
  const SIN_LAT = Math.sin(LATITUDE_RAD); // ~-0.52126

  // Cálculo astronómico riguroso de la trayectoria diurna del Sol en la esfera celeste.
  // En mecánica celeste, para cualquier observador en la Tierra a latitud φ,
  // la órbita diurna aparente del Sol es un círculo plano perfecto en la esfera celeste,
  // inclinado respecto al horizonte exactamente por el ángulo de co-latitud (90° - |φ|).
  // La velocidad angular es estrictamente uniforme (15°/hora) a lo largo de todo el día.
  const getSunPositionForTime = useCallback(
    (time: number, radius = SUN_ORBIT_RADIUS) => {
      const clampedTime = Math.max(6.0, Math.min(18.0, time));
      // Ángulo horario solar H: 15° por hora, H = 0 en el mediodía solar (12:00)
      // H va exactamente de -90° (-π/2 rad, amanecer 06:00) a +90° (+π/2 rad, atardecer 18:00)
      const hourAngle = ((clampedTime - 12.0) * 15.0 * Math.PI) / 180;

      const sinH = Math.sin(hourAngle);
      const cosH = Math.cos(hourAngle);

      // Coordenadas topocéntricas cartesianas exactas:
      // X (Este/Oeste): el sol sale por el Este (+X) en la mañana (H < 0), cruza el meridiano en X=0, y se pone por el Oeste (-X)
      // Y (Altura vertical): se eleva suavemente desde el horizonte (Y=0 a las 06:00) hasta su culminación máxima a las 12:00h
      // Z (Sur/Norte): en Córdoba (hemisferio sur), el sol culmina en el Norte celeste (-Z a las 12:00h)
      const x = -radius * sinH;
      const y = TABLE_HEIGHT + Math.max(0.01, radius * cosH * COS_LAT);
      const z = radius * cosH * SIN_LAT;

      return new THREE.Vector3(x, y, z);
    },
    [SUN_ORBIT_RADIUS, TABLE_HEIGHT, COS_LAT, SIN_LAT]
  );

  // Compute lighting colors for given hour
  const calculateSunState = useCallback(
    (time: number) => {
      const clampedTime = Math.max(6.0, Math.min(18.0, time));
      const progress = (clampedTime - 6.0) / 12.0;

      const position = getSunPositionForTime(clampedTime);

      // Light color & sky horizon transitions
      const morningOrange = new THREE.Color('#ff8c42');
      const middaySun = new THREE.Color('#fffbe8');
      const sunsetOrange = new THREE.Color('#ea580c');
      const horizonMidday = new THREE.Color('#bfdbfe');
      const duskHorizon = new THREE.Color('#f97316');

      let sunLightColor: THREE.Color;
      let horizonColor: THREE.Color;
      let lightIntensity = 2.4;

      if (progress < 0.25) {
        const t = progress / 0.25;
        sunLightColor = morningOrange.clone().lerp(middaySun, t);
        horizonColor = duskHorizon.clone().lerp(horizonMidday, t);
        lightIntensity = 1.7 + t * 0.7;
      } else if (progress <= 0.75) {
        sunLightColor = middaySun.clone();
        horizonColor = horizonMidday.clone();
        lightIntensity = 2.4;
      } else {
        const t = (progress - 0.75) / 0.25;
        sunLightColor = middaySun.clone().lerp(sunsetOrange, t);
        horizonColor = horizonMidday.clone().lerp(duskHorizon, t);
        lightIntensity = 2.4 - t * 0.8;
      }

      return {
        position,
        sunColor: sunLightColor,
        horizonColor,
        intensity: lightIntensity,
      };
    },
    [getSunPositionForTime]
  );

  // Set camera preset
  const applyPreset = useCallback(
    (preset: 'overhead' | 'perspective' | 'closeup') => {
      if (!controlsRef.current || !cameraRef.current) return;

      let targetPos: THREE.Vector3;
      let lookTarget: THREE.Vector3;

      switch (preset) {
        case 'overhead':
          targetPos = new THREE.Vector3(0.001, TABLE_HEIGHT + 1.25, 0.001);
          lookTarget = new THREE.Vector3(0, TABLE_HEIGHT, 0);
          break;
        case 'closeup':
          targetPos = new THREE.Vector3(0.38, TABLE_HEIGHT + 0.42, 0.45);
          lookTarget = new THREE.Vector3(0, TABLE_HEIGHT + 0.12, 0);
          break;
        case 'perspective':
        default:
          targetPos = new THREE.Vector3(1.1, TABLE_HEIGHT + 0.8, 1.4);
          lookTarget = new THREE.Vector3(0, TABLE_HEIGHT + 0.15, 0);
          break;
      }

      targetCamPosRef.current = targetPos;
      targetCamLookRef.current = lookTarget;
    },
    [TABLE_HEIGHT]
  );

  // Initial Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      300
    );
    camera.position.set(1.1, TABLE_HEIGHT + 0.8, 1.4);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls: PERMITIR ORBITAR POR COMPLETO EN TODOS LOS EJES SIN LÍMITE
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    // SIN LÍMITES POLARES NI ACIMUTALES: rotación 360° libre en todas direcciones
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI; // Permite pasar por arriba y por abajo del horizonte
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity; // Rotación horizontal infinita
    controls.minDistance = 0.2;
    controls.maxDistance = 50.0;
    controls.screenSpacePanning = true;
    controls.target.set(0, TABLE_HEIGHT + 0.15, 0);
    controlsRef.current = controls;

    // 5. IMAGEN DE FONDO 360 DEL CIELO (PANORÁMICA EQUIRECTANGULAR DINÁMICA)
    const skyManager = new Dynamic360SkyManager();
    skyManagerRef.current = skyManager;
    skyManager.update(timeHours);

    // Skysphere geometry: radio grande envolvente 360
    const skyGeo = new THREE.SphereGeometry(75, 48, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyManager.texture,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);
    skyMeshRef.current = skyMesh;
    scene.background = skyManager.texture;

    // Subtle atmospheric fog matching horizon
    scene.fog = new THREE.FogExp2(0xbfe0fb, 0.008);

    // 6. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight(0xbfdbfe, 0x4a7c36, 0.65);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Main Directional Sun Light (casts shadows)
    const sunLight = new THREE.DirectionalLight(0xfffbe8, 2.4);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    const shadowD = 1.4;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    sunLight.shadow.bias = -0.00015;
    sunLight.shadow.normalBias = 0.002;
    scene.add(sunLight);
    scene.add(sunLight.target);
    sunLight.target.position.set(0, TABLE_HEIGHT, 0);
    sunLightRef.current = sunLight;

    // 7. EL SOL COMO OBJETO EN LA ESCENA 3D
    const sunGroup = new THREE.Group();

    // 7.1 Núcleo solar tridimensional con textura y oscurecimiento de limbo
    const sunCoreGeo = new THREE.SphereGeometry(1.6, 32, 32);
    const sunCoreMat = new THREE.MeshBasicMaterial({
      map: createSunCoreTexture(),
    });
    const sunCoreMesh = new THREE.Mesh(sunCoreGeo, sunCoreMat);
    sunGroup.add(sunCoreMesh);
    sunCoreRef.current = sunCoreMesh;

    // 7.2 Corona y halo solar radiante (Additive Billboard)
    const coronaCanvas = document.createElement('canvas');
    coronaCanvas.width = 256;
    coronaCanvas.height = 256;
    const coronaCtx = coronaCanvas.getContext('2d')!;
    const grad = coronaCtx.createRadialGradient(128, 128, 15, 128, 128, 124);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, 'rgba(255, 240, 160, 0.88)');
    grad.addColorStop(0.5, 'rgba(255, 175, 75, 0.45)');
    grad.addColorStop(0.8, 'rgba(255, 120, 30, 0.12)');
    grad.addColorStop(1, 'rgba(255, 80, 0, 0.0)');
    coronaCtx.fillStyle = grad;
    coronaCtx.fillRect(0, 0, 256, 256);

    const coronaTexture = new THREE.CanvasTexture(coronaCanvas);
    const coronaMat = new THREE.SpriteMaterial({
      map: coronaTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sunCorona = new THREE.Sprite(coronaMat);
    sunCorona.scale.set(16, 16, 1);
    sunGroup.add(sunCorona);
    sunCoronaRef.current = sunCorona;

    // 7.3 Rayos solares geométricos sutiles (disco con puntas de destello)
    const raysCanvas = document.createElement('canvas');
    raysCanvas.width = 256;
    raysCanvas.height = 256;
    const rCtx = raysCanvas.getContext('2d')!;
    rCtx.translate(128, 128);
    const numRays = 16;
    for (let r = 0; r < numRays; r++) {
      const angle = (r / numRays) * Math.PI * 2;
      rCtx.save();
      rCtx.rotate(angle);
      const rGrad = rCtx.createLinearGradient(0, 0, 115, 0);
      rGrad.addColorStop(0, 'rgba(255, 235, 150, 0.55)');
      rGrad.addColorStop(1, 'rgba(255, 140, 30, 0.0)');
      rCtx.fillStyle = rGrad;
      rCtx.beginPath();
      rCtx.moveTo(25, -6);
      rCtx.lineTo(115, 0);
      rCtx.lineTo(25, 6);
      rCtx.closePath();
      rCtx.fill();
      rCtx.restore();
    }
    const raysTexture = new THREE.CanvasTexture(raysCanvas);
    const raysMat = new THREE.MeshBasicMaterial({
      map: raysTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const raysMesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), raysMat);
    sunGroup.add(raysMesh);
    sunRaysRef.current = raysMesh;

    scene.add(sunGroup);
    sunGroupRef.current = sunGroup;

    // 7.4 Trayectoria orbital celeste del sol en el cielo (Arco Solar 3D)
    const arcPoints: THREE.Vector3[] = [];
    for (let h = 6.0; h <= 18.0; h += 0.05) {
      arcPoints.push(getSunPositionForTime(h));
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
    const arcMat = new THREE.LineDashedMaterial({
      color: 0xfbbf24,
      dashSize: 0.4,
      gapSize: 0.3,
      transparent: true,
      opacity: 0.65,
    });
    const solarArcLine = new THREE.Line(arcGeo, arcMat);
    solarArcLine.computeLineDistances();
    scene.add(solarArcLine);

    // Marcadores horarios luminosos a lo largo del arco solar (6h, 9h, 12h, 15h, 18h)
    const markerHours = [6, 9, 12, 15, 18];
    const hourMarkerGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const hourMarkerMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    markerHours.forEach((mh) => {
      const pos = getSunPositionForTime(mh);
      const marker = new THREE.Mesh(hourMarkerGeo, hourMarkerMat);
      marker.position.copy(pos);
      scene.add(marker);
    });

    // 8. Ground (Espacio verde abierto - Césped)
    // Inicialmente 100% opaco por sobre el nivel del piso; se vuelve 80% transparente solo al bajar de Y < 0
    const grassTextures = createGrassTexture();
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      map: grassTextures.map,
      bumpMap: grassTextures.bump,
      bumpScale: 0.03,
      roughness: 0.9,
      metalness: 0.02,
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1.0,
      depthWrite: true,
    });
    groundMatRef.current = groundMat;
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Decorative natural trees/bushes along perimeter
    const gardenGroup = new THREE.Group();
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x3d6e2e,
      roughness: 0.85,
      metalness: 0.05,
    });
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a3525,
      roughness: 0.9,
    });

    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2 + 0.3;
      const dist = 10 + (i % 3) * 3;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;

      const trunkH = 1.6 + (i % 2) * 0.6;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, trunkH, 8),
        trunkMat
      );
      trunk.position.set(tx, trunkH / 2, tz);
      trunk.castShadow = true;
      gardenGroup.add(trunk);

      const canopy = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.6 + (i % 3) * 0.4, 1),
        foliageMat
      );
      canopy.position.set(tx, trunkH + 1.2, tz);
      canopy.castShadow = true;
      gardenGroup.add(canopy);
    }
    scene.add(gardenGroup);

    // 9. Wooden Table (Pequeña mesa de madera con tablones y patas)
    const tableGroup = new THREE.Group();
    const woodTextures = createWoodTexture();
    const woodMat = new THREE.MeshStandardMaterial({
      map: woodTextures.map,
      bumpMap: woodTextures.bump,
      bumpScale: 0.02,
      roughness: 0.72,
      metalness: 0.05,
    });

    const TABLE_WIDTH = 1.15;
    const TABLE_DEPTH = 0.95;
    const TABLE_TOP_THICKNESS = 0.038;

    const numPlanks = 5;
    const plankWidth = TABLE_DEPTH / numPlanks;
    for (let p = 0; p < numPlanks; p++) {
      const plankZ = -TABLE_DEPTH / 2 + plankWidth / 2 + p * plankWidth;
      const plankGeo = new THREE.BoxGeometry(
        TABLE_WIDTH,
        TABLE_TOP_THICKNESS,
        plankWidth - 0.005
      );
      const plankMesh = new THREE.Mesh(plankGeo, woodMat);
      plankMesh.position.set(0, TABLE_HEIGHT - TABLE_TOP_THICKNESS / 2, plankZ);
      plankMesh.castShadow = true;
      plankMesh.receiveShadow = true;
      tableGroup.add(plankMesh);
    }

    // Aprons
    const apronThick = 0.025;
    const apronHeight = 0.07;
    const longApronGeo = new THREE.BoxGeometry(
      TABLE_WIDTH - 0.12,
      apronHeight,
      apronThick
    );
    const apron1 = new THREE.Mesh(longApronGeo, woodMat);
    apron1.position.set(
      0,
      TABLE_HEIGHT - TABLE_TOP_THICKNESS - apronHeight / 2,
      TABLE_DEPTH / 2 - 0.08
    );
    apron1.castShadow = true;
    tableGroup.add(apron1);

    const apron2 = new THREE.Mesh(longApronGeo, woodMat);
    apron2.position.set(
      0,
      TABLE_HEIGHT - TABLE_TOP_THICKNESS - apronHeight / 2,
      -TABLE_DEPTH / 2 + 0.08
    );
    apron2.castShadow = true;
    tableGroup.add(apron2);

    const shortApronGeo = new THREE.BoxGeometry(
      apronThick,
      apronHeight,
      TABLE_DEPTH - 0.16
    );
    const apron3 = new THREE.Mesh(shortApronGeo, woodMat);
    apron3.position.set(
      TABLE_WIDTH / 2 - 0.08,
      TABLE_HEIGHT - TABLE_TOP_THICKNESS - apronHeight / 2,
      0
    );
    apron3.castShadow = true;
    tableGroup.add(apron3);

    const apron4 = new THREE.Mesh(shortApronGeo, woodMat);
    apron4.position.set(
      -TABLE_WIDTH / 2 + 0.08,
      TABLE_HEIGHT - TABLE_TOP_THICKNESS - apronHeight / 2,
      0
    );
    apron4.castShadow = true;
    tableGroup.add(apron4);

    // 4 Wooden Table Legs
    const legThick = 0.055;
    const legHeight = TABLE_HEIGHT - TABLE_TOP_THICKNESS;
    const legGeo = new THREE.BoxGeometry(legThick, legHeight, legThick);

    const legOffsets = [
      [-TABLE_WIDTH / 2 + 0.07, -TABLE_DEPTH / 2 + 0.07],
      [TABLE_WIDTH / 2 - 0.07, -TABLE_DEPTH / 2 + 0.07],
      [-TABLE_WIDTH / 2 + 0.07, TABLE_DEPTH / 2 - 0.07],
      [TABLE_WIDTH / 2 - 0.07, TABLE_DEPTH / 2 - 0.07],
    ];

    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(lx, legHeight / 2, lz);
      leg.castShadow = true;
      leg.receiveShadow = true;
      tableGroup.add(leg);
    });

    scene.add(tableGroup);

    // 10. Papel Afiche Blanco con Marcaciones de Fibrón
    const PAPER_WIDTH = 0.74;
    const PAPER_DEPTH = 0.74;
    const paperTexture = createPaperTexture();

    const paperGeo = new THREE.PlaneGeometry(PAPER_WIDTH, PAPER_DEPTH);
    const paperMat = new THREE.MeshStandardMaterial({
      map: paperTexture,
      roughness: 0.94,
      metalness: 0.0,
      color: 0xffffff,
    });
    const paperMesh = new THREE.Mesh(paperGeo, paperMat);
    paperMesh.rotation.x = -Math.PI / 2;
    paperMesh.position.set(0, TABLE_HEIGHT + 0.001, 0);
    paperMesh.receiveShadow = true;
    scene.add(paperMesh);

    // 11. Cinta Adhesiva en las Esquinas
    const tapeTexture = createTapeTexture();
    const tapeMat = new THREE.MeshStandardMaterial({
      map: tapeTexture,
      transparent: true,
      opacity: 0.9,
      roughness: 0.45,
      metalness: 0.05,
    });

    const tapeLength = 0.09;
    const tapeWidth = 0.032;
    const tapeGeo = new THREE.PlaneGeometry(tapeLength, tapeWidth);

    const cornerOffsets = [
      { x: -PAPER_WIDTH / 2 + 0.02, z: -PAPER_DEPTH / 2 + 0.02, rot: Math.PI / 4 },
      { x: PAPER_WIDTH / 2 - 0.02, z: -PAPER_DEPTH / 2 + 0.02, rot: -Math.PI / 4 },
      { x: -PAPER_WIDTH / 2 + 0.02, z: PAPER_DEPTH / 2 - 0.02, rot: -Math.PI / 4 },
      { x: PAPER_WIDTH / 2 - 0.02, z: PAPER_DEPTH / 2 - 0.02, rot: Math.PI / 4 },
      { x: 0, z: -PAPER_DEPTH / 2 + 0.01, rot: 0 },
      { x: 0, z: PAPER_DEPTH / 2 - 0.01, rot: 0 },
    ];

    cornerOffsets.forEach(({ x, z, rot }) => {
      const tape = new THREE.Mesh(tapeGeo, tapeMat);
      tape.rotation.x = -Math.PI / 2;
      tape.rotation.z = rot;
      tape.position.set(x, TABLE_HEIGHT + 0.002, z);
      tape.receiveShadow = true;
      scene.add(tape);
    });

    // 12. Base de Plastilina (Handmade Playdough Base)
    const clayGeo = new THREE.CylinderGeometry(
      CLAY_RADIUS * 0.7,
      CLAY_RADIUS,
      CLAY_HEIGHT,
      32,
      8
    );
    const posAttr = clayGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const bump = Math.sin(vx * 40) * Math.cos(vz * 40) * 0.003;
      posAttr.setXYZ(i, vx + bump, vy, vz + bump);
    }
    clayGeo.computeVertexNormals();

    const clayMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.95,
      metalness: 0.02,
    });
    const clayMesh = new THREE.Mesh(clayGeo, clayMat);
    clayMesh.position.set(0, TABLE_HEIGHT + CLAY_HEIGHT / 2, 0);
    clayMesh.castShadow = true;
    clayMesh.receiveShadow = true;
    scene.add(clayMesh);

    // 13. Varilla de Madera (Wooden Dowel Stick: 45 cm)
    const stickWoodTexture = createStickWoodTexture();
    const stickGeo = new THREE.CylinderGeometry(
      STICK_RADIUS,
      STICK_RADIUS,
      STICK_HEIGHT,
      24
    );
    const stickMat = new THREE.MeshStandardMaterial({
      map: stickWoodTexture,
      roughness: 0.8,
      metalness: 0.05,
      color: 0xf3d4a0,
    });
    const stickMesh = new THREE.Mesh(stickGeo, stickMat);
    stickMesh.position.set(0, TABLE_HEIGHT + STICK_HEIGHT / 2, 0);
    stickMesh.castShadow = true;
    stickMesh.receiveShadow = true;
    scene.add(stickMesh);

    const capGeo = new THREE.CylinderGeometry(
      STICK_RADIUS * 0.99,
      STICK_RADIUS * 0.99,
      0.003,
      16
    );
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xc49a6c,
      roughness: 0.9,
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, TABLE_HEIGHT + STICK_HEIGHT, 0);
    scene.add(cap);

    // 14. Optional Subtle Real-time Shadow Guide Line
    const guidePoints = [
      new THREE.Vector3(0, TABLE_HEIGHT + 0.003, 0),
      new THREE.Vector3(0, TABLE_HEIGHT + 0.003, 0.3),
    ];
    const guideGeo = new THREE.BufferGeometry().setFromPoints(guidePoints);
    const guideMat = new THREE.LineDashedMaterial({
      color: 0x3b82f6,
      linewidth: 2,
      scale: 1,
      dashSize: 0.02,
      gapSize: 0.015,
      transparent: true,
      opacity: 0.7,
    });
    const guideLine = new THREE.Line(guideGeo, guideMat);
    guideLine.computeLineDistances();
    guideLine.visible = false;
    scene.add(guideLine);
    shadowGuideLineRef.current = guideLine;

    // 15. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotate solar ray disc and solar core gently
      if (sunRaysRef.current) {
        sunRaysRef.current.rotation.z = elapsedTime * 0.15;
      }
      if (sunCoreRef.current) {
        sunCoreRef.current.rotation.y = elapsedTime * 0.08;
      }

      // Smooth camera transition if target preset is set
      if (targetCamPosRef.current && cameraRef.current && controlsRef.current) {
        cameraRef.current.position.lerp(targetCamPosRef.current, 0.07);
        if (targetCamLookRef.current) {
          controlsRef.current.target.lerp(targetCamLookRef.current, 0.07);
        }
        if (
          cameraRef.current.position.distanceTo(targetCamPosRef.current) < 0.005
        ) {
          targetCamPosRef.current = null;
          targetCamLookRef.current = null;
        }
      }

      // Dinámica de transparencia del piso según la altura de la cámara respecto al nivel del piso (Y = 0):
      // - Sobre el nivel del piso (Y >= 0): 100% opaco, sin transparencia.
      // - Por debajo del nivel del piso (Y < 0): se activa el efecto de 80% de transparencia (20% opacidad).
      if (groundMatRef.current && cameraRef.current) {
        const isBelowGround = cameraRef.current.position.y < 0;
        if (isBelowGround) {
          if (!groundMatRef.current.transparent || groundMatRef.current.opacity !== 0.2) {
            groundMatRef.current.transparent = true;
            groundMatRef.current.opacity = 0.2;
            groundMatRef.current.depthWrite = false;
            groundMatRef.current.needsUpdate = true;
          }
        } else {
          if (groundMatRef.current.transparent || groundMatRef.current.opacity !== 1.0) {
            groundMatRef.current.transparent = false;
            groundMatRef.current.opacity = 1.0;
            groundMatRef.current.depthWrite = true;
            groundMatRef.current.needsUpdate = true;
          }
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 16. Window Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    TABLE_HEIGHT,
    STICK_HEIGHT,
    STICK_RADIUS,
    CLAY_RADIUS,
    CLAY_HEIGHT,
    getSunPositionForTime,
  ]);

  // Actualizar el Sol, las luces y la imagen 360 del cielo cuando cambia la hora
  useEffect(() => {
    const sunState = calculateSunState(timeHours);

    // Actualizar la imagen panorámica 360 del cielo con los colores de la hora
    if (skyManagerRef.current) {
      skyManagerRef.current.update(timeHours);
    }

    // Actualizar posición del grupo completo del Sol (núcleo, corona, rayos)
    if (sunGroupRef.current) {
      sunGroupRef.current.position.copy(sunState.position);
      // Orientar los rayos solares hacia la mesa/cámara
      if (cameraRef.current) {
        sunGroupRef.current.lookAt(cameraRef.current.position);
      }
    }

    // Actualizar luz direccional y sombras
    if (sunLightRef.current) {
      sunLightRef.current.position.copy(sunState.position);
      sunLightRef.current.color.copy(sunState.sunColor);
      sunLightRef.current.intensity = sunState.intensity;
    }

    // Actualizar calidez ambiental y hemisferio
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = Math.max(
        0.45,
        sunState.intensity * 0.32
      );
    }
    if (hemiLightRef.current) {
      hemiLightRef.current.color.copy(sunState.horizonColor);
    }

    // Niebla atmosférica adaptada al color del horizonte
    if (sceneRef.current && sceneRef.current.fog instanceof THREE.FogExp2) {
      sceneRef.current.fog.color.copy(sunState.horizonColor);
    }

    // Actualizar guía de sombra si está activa
    if (shadowGuideLineRef.current) {
      shadowGuideLineRef.current.visible = showShadowGuide;
      if (showShadowGuide) {
        const shadowDirX = -sunState.position.x;
        const shadowDirZ = -sunState.position.z;
        const len = Math.hypot(shadowDirX, shadowDirZ);
        if (len > 0.001) {
          const elev = Math.atan2(sunState.position.y - TABLE_HEIGHT, len);
          const shadowLength = Math.min(0.34, STICK_HEIGHT / Math.tan(elev));
          const nx = (shadowDirX / len) * shadowLength;
          const nz = (shadowDirZ / len) * shadowLength;

          const positions =
            shadowGuideLineRef.current.geometry.attributes.position;
          positions.setXYZ(0, 0, TABLE_HEIGHT + 0.003, 0);
          positions.setXYZ(1, nx, TABLE_HEIGHT + 0.003, nz);
          positions.needsUpdate = true;
          shadowGuideLineRef.current.computeLineDistances();
        }
      }
    }
  }, [
    timeHours,
    calculateSunState,
    showShadowGuide,
    TABLE_HEIGHT,
    STICK_HEIGHT,
  ]);

  // Aplicar ajustes predefinidos de cámara al cambiar
  useEffect(() => {
    applyPreset(cameraPreset);
  }, [cameraPreset, applyPreset]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full absolute inset-0 select-none overflow-hidden touch-none"
      style={{ cursor: 'grab' }}
    />
  );
};
