import * as THREE from 'three';

/**
 * Procedural texture generator for the homemade sundial 3D scene.
 * Generates ultra-sharp, realistic canvas textures for paper, wood, tape, grass, and clay.
 */

export function createPaperTexture(): THREE.CanvasTexture {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Off-white poster paper base (papel afiche blanco)
  ctx.fillStyle = '#f7f6f0';
  ctx.fillRect(0, 0, size, size);

  // Subtle paper grain & fibers noise
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 14;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain - 1));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain - 3));
  }
  ctx.putImageData(imgData, 0, 0);

  // Soft faint pencil grid & draft lines (realistic homemade touch)
  ctx.save();
  ctx.strokeStyle = 'rgba(120, 115, 100, 0.18)';
  ctx.lineWidth = 2;
  const cx = size / 2;
  const cy = size / 2;

  // Pencil circles
  ctx.beginPath();
  ctx.arc(cx, cy, 680, 0, Math.PI * 2);
  ctx.arc(cx, cy, 520, 0, Math.PI * 2);
  ctx.stroke();

  // Outer paper border margin
  ctx.strokeStyle = 'rgba(160, 150, 130, 0.22)';
  ctx.strokeRect(60, 60, size - 120, size - 120);

  // Title in marker header: "RELOJ SOLAR"
  ctx.font = 'bold 69px sans-serif';
  ctx.fillStyle = '#1e242b';
  ctx.textAlign = 'center';
  ctx.fillText('Reloj solar casero', cx, 140);

  ctx.font = '45px sans-serif';
  ctx.fillStyle = 'rgba(50, 50, 50, 0.65)';
  ctx.fillText(' ', cx, 175);

  // Fibrón (felt-tip marker) styles
  const markerColor = '#181b20';
  const cardinalMarkerColor = '#111827';
  const redMarkerColor = '#991b1b';

  // 2. Center base circle where plastilina sits
  ctx.lineWidth = 6;
  ctx.strokeStyle = markerColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 110, 0, Math.PI * 2);
  ctx.stroke();

  // Central crosshair for stick position
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy);
  ctx.lineTo(cx + 30, cy);
  ctx.moveTo(cx, cy - 30);
  ctx.lineTo(cx, cy + 30);
  ctx.stroke();

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = 'rgba(30, 30, 30, 0.55)';
  ctx.fillText('BASE (PLASTILINA)', cx, cy + 145);

  // 3. Cardinal Points (N, S, E, O) drawn with fibrón
  // Coordinate system mapping:
  // North (N) is at top of texture (-Y in 2D, -Z in 3D scene)
  // South (S) is at bottom of texture (+Y in 2D, +Z in 3D scene)
  // East (E) is right (+X in 3D)
  // West (O) is left (-X in 3D)

  const drawCardinalArrow = (x1: number, y1: number, x2: number, y2: number, label: string, isNorth = false) => {
    ctx.lineWidth = isNorth ? 8 : 6;
    ctx.strokeStyle = isNorth ? redMarkerColor : cardinalMarkerColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Arrow tip
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLen = 30;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - arrowLen * Math.cos(angle - Math.PI / 6), y2 - arrowLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - arrowLen * Math.cos(angle + Math.PI / 6), y2 - arrowLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = isNorth ? redMarkerColor : cardinalMarkerColor;
    ctx.fill();

    // Label
    ctx.font = isNorth ? 'bold 64px sans-serif' : 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const offset = 55;
    const lx = x2 + offset * Math.cos(angle);
    const ly = y2 + offset * Math.sin(angle);
    ctx.fillText(label, lx, ly);
  };

  // Main axes lines
  drawCardinalArrow(cx, cy - 130, cx, 230, 'N', true);
  drawCardinalArrow(cx, cy + 130, cx, size - 210, 'S');
  drawCardinalArrow(cx + 130, cy, size - 210, cy, 'E');
  drawCardinalArrow(cx - 130, cy, 210, cy, 'O');

  // 4. Hour lines and marker numerals (6:00 to 18:00)
  // En Córdoba, Argentina (latitud φ = -31.42° S) con gnómon vertical:
  // La sombra proyectada sigue con exactitud la ley gnomónica del reloj de sol horizontal:
  // tan(θ) = |sin(φ)| * tan(H), proyectándose sobre el papel hacia el Sur.
  const latCordobaRad = (-31.42 * Math.PI) / 180;
  const absSinLat = Math.abs(Math.sin(latCordobaRad)); // ~0.52126

  for (let hour = 6; hour <= 18; hour++) {
    const H = ((hour - 12) * 15 * Math.PI) / 180;
    // Ángulo en el plano 2D del afiche: X hacia el Este (+X), Y hacia el Sur (+Y hacia abajo)
    const angle = Math.atan2(absSinLat * Math.cos(H), Math.sin(H));

    const rStart = 160;
    const rEnd = 620;

    const xStart = cx + rStart * Math.cos(angle);
    const yStart = cy + rStart * Math.sin(angle);
    const xEnd = cx + rEnd * Math.cos(angle);
    const yEnd = cy + rEnd * Math.sin(angle);

    // Thick marker line for full hours
    ctx.lineWidth = hour === 12 ? 6 : 4.5;
    ctx.strokeStyle = hour === 12 ? '#1e3a8a' : markerColor;
    ctx.beginPath();
    ctx.moveTo(xStart, yStart);
    ctx.lineTo(xEnd, yEnd);
    ctx.stroke();

    // Hour label
    const rLabel = 680;
    const lx = cx + rLabel * Math.cos(angle);
    const ly = cy + rLabel * Math.sin(angle);

    ctx.font = hour === 12 ? 'bold 44px sans-serif' : 'bold 36px sans-serif';
    ctx.fillStyle = hour === 12 ? '#1e3a8a' : '#1f2937';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${hour}:00`, lx, ly);

    // Half-hour tick
    if (hour < 18) {
      const halfH = ((hour + 0.5 - 12) * 15 * Math.PI) / 180;
      const halfAngle = Math.atan2(absSinLat * Math.cos(halfH), Math.sin(halfH));
      const hStart = cx + 380 * Math.cos(halfAngle);
      const hStartY = cy + 380 * Math.sin(halfAngle);
      const hEnd = cx + 580 * Math.cos(halfAngle);
      const hEndY = cy + 580 * Math.sin(halfAngle);

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(40, 45, 55, 0.65)';
      ctx.beginPath();
      ctx.moveTo(hStart, hStartY);
      ctx.lineTo(hEnd, hEndY);
      ctx.stroke();
    }
  }

  // Realistic corner tape guide lines
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  return texture;
}

/**
 * Procedural realistic wood plank texture for the garden table
 */
export function createWoodTexture(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bumpCtx = bumpCanvas.getContext('2d')!;

  // 6 planks running vertically
  const numPlanks = 6;
  const plankWidth = width / numPlanks;

  for (let p = 0; p < numPlanks; p++) {
    const px = p * plankWidth;
    // Vary base wood tone slightly per plank
    const toneVar = (Math.random() - 0.5) * 16;
    const baseR = 175 + toneVar;
    const baseG = 125 + toneVar * 0.8;
    const baseB = 82 + toneVar * 0.6;

    ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
    ctx.fillRect(px, 0, plankWidth, height);

    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(px, 0, plankWidth, height);

    // Fine wood grain streaks along Y
    ctx.lineWidth = 1.2;
    for (let g = 0; g < 140; g++) {
      const gx = px + Math.random() * plankWidth;
      const alpha = 0.08 + Math.random() * 0.12;
      const isDark = Math.random() > 0.4;
      ctx.strokeStyle = isDark ? `rgba(90, 55, 30, ${alpha})` : `rgba(230, 185, 135, ${alpha * 0.7})`;

      ctx.beginPath();
      ctx.moveTo(gx, 0);
      const curve = (Math.random() - 0.5) * 18;
      ctx.bezierCurveTo(gx + curve, height * 0.33, gx - curve, height * 0.66, gx, height);
      ctx.stroke();

      // Bump grain
      bumpCtx.strokeStyle = isDark ? `rgba(0,0,0, ${alpha * 0.6})` : `rgba(255,255,255, ${alpha * 0.5})`;
      bumpCtx.stroke();
    }

    // Occasional subtle wood knot
    if (Math.random() > 0.5) {
      const knotY = 150 + Math.random() * (height - 300);
      const knotX = px + plankWidth * (0.3 + Math.random() * 0.4);
      const knotR = 8 + Math.random() * 12;

      ctx.save();
      ctx.fillStyle = 'rgba(75, 45, 22, 0.45)';
      ctx.beginPath();
      ctx.ellipse(knotX, knotY, knotR, knotR * 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      bumpCtx.save();
      bumpCtx.fillStyle = 'rgba(20, 20, 20, 0.4)';
      bumpCtx.beginPath();
      bumpCtx.ellipse(knotX, knotY, knotR, knotR * 1.8, 0, 0, Math.PI * 2);
      bumpCtx.fill();
      bumpCtx.restore();
    }

    // Dark seam between planks
    ctx.fillStyle = 'rgba(40, 25, 12, 0.85)';
    ctx.fillRect(px + plankWidth - 3, 0, 4, height);

    bumpCtx.fillStyle = '#101010';
    bumpCtx.fillRect(px + plankWidth - 3, 0, 4, height);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;

  return { map, bump };
}

/**
 * Realistic beige/translucent masking tape texture
 */
export function createTapeTexture(): THREE.CanvasTexture {
  const width = 256;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Warm semi-translucent masking tape color
  ctx.fillStyle = 'rgba(238, 228, 205, 0.94)';
  ctx.fillRect(0, 0, width, height);

  // Micro paper tape texture
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n - 2));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n - 6));
  }
  ctx.putImageData(imgData, 0, 0);

  // Faint longitudinal streaks
  ctx.strokeStyle = 'rgba(215, 200, 175, 0.4)';
  ctx.lineWidth = 1;
  for (let y = 0; y < height; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Frayed torn edges
  ctx.fillStyle = 'rgba(220, 210, 190, 0.6)';
  for (let y = 0; y < height; y += 2) {
    if (Math.random() > 0.4) ctx.fillRect(0, y, 2 + Math.random() * 3, 2);
    if (Math.random() > 0.4) ctx.fillRect(width - 3 - Math.random() * 3, y, 4, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Natural garden lawn grass texture
 */
export function createGrassTexture(): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpCtx = bumpCanvas.getContext('2d')!;

  ctx.fillStyle = '#4a7c36';
  ctx.fillRect(0, 0, size, size);

  bumpCtx.fillStyle = '#777777';
  bumpCtx.fillRect(0, 0, size, size);

  // Grass blades specks
  const colors = ['#3f6c2e', '#538b3c', '#5f9d45', '#365e26', '#699f4d', '#2e4e20'];
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 3 + Math.random() * 7;
    const angle = Math.random() * Math.PI;

    ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();

    const isLight = Math.random() > 0.5;
    bumpCtx.strokeStyle = isLight ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
    bumpCtx.lineWidth = 1;
    bumpCtx.beginPath();
    bumpCtx.moveTo(x, y);
    bumpCtx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    bumpCtx.stroke();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(16, 16);
  map.colorSpace = THREE.SRGBColorSpace;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(16, 16);

  return { map, bump };
}

/**
 * Natural dowel wood texture for the stick (varilla de madera)
 */
export function createStickWoodTexture(): THREE.CanvasTexture {
  const width = 256;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#d8b988';
  ctx.fillRect(0, 0, width, height);

  // Longitudinal wood grain
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * width;
    const alpha = 0.08 + Math.random() * 0.15;
    ctx.strokeStyle = Math.random() > 0.5 ? `rgba(140, 95, 55, ${alpha})` : `rgba(245, 215, 175, ${alpha})`;
    ctx.lineWidth = 0.8 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 6, height);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural vibrant solar core texture with limb darkening and solar granulation
 */
export function createSunCoreTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, '#ffffff'); // blinding white center
  grad.addColorStop(0.35, '#fffbeb'); // warm incandescent core
  grad.addColorStop(0.7, '#fbbf24'); // golden yellow photosphere
  grad.addColorStop(0.9, '#f97316'); // fiery orange chromosphere
  grad.addColorStop(1, '#ea580c'); // limb darkening edge

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle solar surface granules
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.7));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Dynamic 360 equirectangular panoramic sky generator.
 * Smoothly updates sky colors from sunrise to midday to sunset.
 */
export class Dynamic360SkyManager {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;
  private width = 1024;
  private height = 512;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.mapping = THREE.EquirectangularReflectionMapping;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    this.update(12.0);
  }

  public update(timeHours: number) {
    const t = Math.max(6.0, Math.min(18.0, timeHours));
    const p = (t - 6.0) / 12.0; // 0 (dawn) to 1 (sunset)
    const midDistance = Math.abs(p - 0.5) * 2; // 0 at noon, 1 at dawn/dusk

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const horizonY = h * 0.5;

    // Helper: interpolate RGB colors
    const lerpColor = (
      c1: [number, number, number],
      c2: [number, number, number],
      factor: number
    ): string => {
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * factor);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * factor);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * factor);
      return `rgb(${r},${g},${b})`;
    };

    // Palette keyframes [R, G, B]
    const dawnZenith: [number, number, number] = [28, 24, 75];
    const middayZenith: [number, number, number] = [18, 110, 225];
    const duskZenith: [number, number, number] = [36, 16, 70];

    const dawnMid: [number, number, number] = [125, 45, 95];
    const middayMid: [number, number, number] = [115, 195, 255];
    const duskMid: [number, number, number] = [160, 48, 70];

    const dawnHorizon: [number, number, number] = [255, 135, 55];
    const middayHorizon: [number, number, number] = [215, 238, 255];
    const duskHorizon: [number, number, number] = [245, 88, 25];

    let zenithRgb: string;
    let midRgb: string;
    let horizonRgb: string;

    if (p <= 0.5) {
      // Dawn to Midday (6 to 12)
      const factor = p / 0.5;
      zenithRgb = lerpColor(dawnZenith, middayZenith, factor);
      midRgb = lerpColor(dawnMid, middayMid, factor);
      horizonRgb = lerpColor(dawnHorizon, middayHorizon, factor);
    } else {
      // Midday to Dusk (12 to 18)
      const factor = (p - 0.5) / 0.5;
      zenithRgb = lerpColor(middayZenith, duskZenith, factor);
      midRgb = lerpColor(middayMid, duskMid, factor);
      horizonRgb = lerpColor(middayHorizon, duskHorizon, factor);
    }

    // 1. Draw Sky Dome Gradient (top to horizon)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, zenithRgb);
    skyGrad.addColorStop(0.65, midRgb);
    skyGrad.addColorStop(1, horizonRgb);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonY);

    // 2. Solar Sunrise / Sunset localized glowing horizon bloom
    // At dawn (p ~ 0), sunrise is on East side (X around w * 0.25)
    // At sunset (p ~ 1), sunset is on West side (X around w * 0.75)
    if (midDistance > 0.3) {
      const bloomIntensity = (midDistance - 0.3) / 0.7;
      const isDawn = p < 0.5;
      const bloomX = isDawn ? w * 0.25 : w * 0.75;
      const bloomColor = isDawn ? 'rgba(255, 160, 60, ' : 'rgba(255, 90, 30, ';

      const bloomGrad = ctx.createRadialGradient(
        bloomX,
        horizonY - 10,
        10,
        bloomX,
        horizonY - 10,
        280
      );
      bloomGrad.addColorStop(0, bloomColor + (bloomIntensity * 0.85) + ')');
      bloomGrad.addColorStop(0.5, bloomColor + (bloomIntensity * 0.35) + ')');
      bloomGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.save();
      ctx.fillStyle = bloomGrad;
      ctx.fillRect(0, 0, w, horizonY + 20);
      ctx.restore();
    }

    // 3. Gentle stylized atmospheric clouds (horizontal 360 wisps)
    ctx.save();
    const cloudColor = lerpColor([255, 255, 255], [255, 170, 110], midDistance * 0.85);
    ctx.fillStyle = cloudColor;
    const cloudAlpha = 0.18 + (1 - midDistance) * 0.12;

    const cloudBands = [
      { y: horizonY * 0.38, h: 22, offset: 0 },
      { y: horizonY * 0.55, h: 18, offset: 200 },
      { y: horizonY * 0.72, h: 26, offset: 450 },
    ];

    cloudBands.forEach((band) => {
      ctx.globalAlpha = cloudAlpha;
      for (let cx = -100; cx < w + 200; cx += 260) {
        const xPos = (cx + band.offset) % w;
        ctx.beginPath();
        ctx.ellipse(xPos, band.y, 90, band.h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(xPos + 50, band.y - 4, 60, band.h * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();

    // 4. Ground / Nadir (horizon to bottom) - Meadow garden landscape
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    // Tint ground slightly warm with sunset/sunrise
    const groundTop = lerpColor([52, 92, 38], [75, 60, 30], midDistance * 0.5);
    const groundBottom = lerpColor([25, 45, 18], [15, 25, 10], midDistance * 0.5);
    groundGrad.addColorStop(0, groundTop);
    groundGrad.addColorStop(1, groundBottom);
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // 5. Distant trees & gentle hills silhouette along horizon line
    ctx.save();
    ctx.fillStyle = lerpColor([35, 65, 25], [20, 25, 15], midDistance * 0.6);
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= w; x += 16) {
      const hillHeight = Math.sin(x * 0.02) * 8 + Math.cos(x * 0.05) * 5;
      ctx.lineTo(x, horizonY - 4 + hillHeight);
    }
    ctx.lineTo(w, horizonY + 20);
    ctx.lineTo(0, horizonY + 20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    this.texture.needsUpdate = true;
  }
}

