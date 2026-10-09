/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Sun,
  Sunrise,
  Sunset,
  RotateCcw,
  Maximize2,
  Minimize2,
  Info,
  X,
  Eye,
  ZoomIn,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SundialScene } from './components/SundialScene';

export default function App() {
  // Time of day in decimal hours (6.0 to 18.0)
  const [timeHours, setTimeHours] = useState<number>(12.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [cameraPreset, setCameraPreset] = useState<'overhead' | 'perspective' | 'closeup'>('perspective');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [showShadowGuide, setShowShadowGuide] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Animation frame loop for continuous timelapse playback
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    let animId: number;

    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isPlaying) {
        setTimeHours((prev) => {
          // 12 hours from 6 to 18 takes 24 seconds at 1x speed (0.5 hour per second)
          const delta = dt * 0.6 * playbackSpeed;
          let next = prev + delta;
          if (next > 18.0) {
            next = 6.0; // loop back to sunrise
          }
          return next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed]);

  // Format decimal hour to HH:MM format
  const formatTime = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Get current sun icon based on hour
  const getSunIcon = () => {
    if (timeHours <= 7.5) return <Sunrise className="w-5 h-5 text-amber-400 animate-pulse" />;
    if (timeHours >= 16.5) return <Sunset className="w-5 h-5 text-orange-500 animate-pulse" />;
    return <Sun className="w-5 h-5 text-yellow-400" />;
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Scene */}
      <SundialScene
        timeHours={timeHours}
        cameraPreset={cameraPreset}
        showShadowGuide={showShadowGuide}
      />

      {/* Top Right: Action Buttons (Fullscreen & Info) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          title="Pantalla completa"
          className="p-2.5 bg-neutral-900/60 hover:bg-neutral-900/90 active:scale-95 backdrop-blur-md border border-white/10 rounded-xl text-neutral-300 hover:text-white transition-all shadow-lg"
          aria-label="Pantalla completa"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Info / Help Dialog */}
        <button
          onClick={() => setShowInfo(true)}
          title="Información"
          className="p-2.5 bg-neutral-900/60 hover:bg-neutral-900/90 active:scale-95 backdrop-blur-md border border-white/10 rounded-xl text-neutral-300 hover:text-white transition-all shadow-lg"
          aria-label="Información del reloj solar"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Camera View Presets Bar (Right floating) */}
      <div className="absolute top-16 right-4 z-20 flex flex-col gap-1.5 p-1 bg-neutral-900/60 backdrop-blur-md border border-white/10 rounded-xl shadow-xl">
        <button
          onClick={() => setCameraPreset('perspective')}
          title="Vista general"
          className={`p-2.5 rounded-lg transition-all ${
            cameraPreset === 'perspective'
              ? 'bg-white/20 text-white shadow'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          aria-label="Vista perspectiva"
        >
          <Eye className="w-4 h-4" />
        </button>

        <button
          onClick={() => setCameraPreset('overhead')}
          title="Vista superior (cenital)"
          className={`p-2.5 rounded-lg transition-all ${
            cameraPreset === 'overhead'
              ? 'bg-white/20 text-white shadow'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          aria-label="Vista cenital"
        >
          <div className="w-4 h-4 border-2 border-current rounded-sm flex items-center justify-center text-[9px] font-bold">
            90°
          </div>
        </button>

        <button
          onClick={() => setCameraPreset('closeup')}
          title="Primer plano (varilla y plastilina)"
          className={`p-2.5 rounded-lg transition-all ${
            cameraPreset === 'closeup'
              ? 'bg-white/20 text-white shadow'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          aria-label="Primer plano"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Bottom Minimalist Control Deck */}
      <div className={`absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 ${
        isCollapsed ? 'w-auto max-w-[280px] sm:max-w-xs' : 'w-[94%] max-w-xl'
      }`}>
        <div className={`bg-neutral-900/80 hover:bg-neutral-900/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl transition-all duration-300 flex flex-col ${
          isCollapsed ? 'p-1.5 sm:p-2 gap-0' : 'p-3 md:p-4 gap-2.5 md:gap-3'
        }`}>
          {/* Top Row: Playback, Current Time Display, Shortcuts, Collapse Toggle */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 md:gap-3">
            {/* Play / Pause Button */}
            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 md:p-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center cursor-pointer ${
                  isPlaying
                    ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400 font-semibold'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isPlaying ? 'Pausar' : 'Reproducir ciclo'}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              {/* Speed selector (visible when expanded) */}
              {!isCollapsed && (
                <button
                  onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                  className="px-2 md:px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-neutral-300 transition-colors cursor-pointer"
                  title="Velocidad de reproducción"
                >
                  {playbackSpeed}x
                </button>
              )}
            </div>

            {/* Time Readout Badge (Clickable to toggle collapse/expand) */}
            <div
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl cursor-pointer transition-colors select-none"
              title={isCollapsed ? 'Expandir panel de control' : 'Colapsar panel'}
            >
              {getSunIcon()}
              <span className="font-mono text-base sm:text-xl md:text-2xl font-bold tracking-wider text-white">
                {formatTime(timeHours)}
              </span>
            </div>

            {/* Right side: Collapse / Expand Button */}
            <div className="flex items-center gap-1">
              {/* Botón para colapsar / expandir el panel */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-neutral-300 hover:text-white transition-all shadow cursor-pointer"
                title={isCollapsed ? 'Expandir controles' : 'Colapsar panel'}
                aria-label={isCollapsed ? 'Expandir controles' : 'Colapsar panel'}
              >
                {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Bottom Row: Sun Position Slider with Hour Ticks (Oculto al colapsar) */}
          {!isCollapsed && (
            <div className="flex flex-col gap-1.5 pt-1 animate-in fade-in duration-200">
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="6.0"
                  max="18.0"
                  step="0.02"
                  value={timeHours}
                  onChange={(e) => {
                    setTimeHours(parseFloat(e.target.value));
                    if (isPlaying) setIsPlaying(false);
                  }}
                  className="w-full h-2.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  aria-label="Posición del sol por hora"
                />
              </div>

              {/* Hour markers row */}
              <div className="flex justify-between items-center text-[10px] md:text-xs font-mono text-neutral-400 px-1">
                {[6, 8, 10, 12, 14, 16, 18].map((h) => (
                  <button
                    key={h}
                    onClick={() => {
                      setTimeHours(h);
                      setIsPlaying(false);
                    }}
                    className={`hover:text-amber-300 transition-colors cursor-pointer ${
                      Math.round(timeHours) === h ? 'text-amber-400 font-bold' : ''
                    }`}
                  >
                    {h}:00
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Minimalist Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-neutral-900 border border-white/15 rounded-2xl p-5 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowInfo(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <Sun className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold">El lado B de una varilla</h2>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-300 leading-relaxed">
              <p className="border-l-2 border-amber-400/80 pl-2 text-neutral-200">
                ¿Y si se pudiera saber la hora sin mirar el celular ni un reloj? Con una simple varilla o un palo, es posible orientarse en el transcurso del día aprovechando la posición del Sol.
              </p>
              <p className="pl-2 text-neutral-200">
               Te proponemos un desafío para llevar al aula: descubrir cómo, a partir de un recurso sencillo como una varilla o un palo, se puede construir un reloj solar. La clave está en aprovechar la posición del Sol en el cielo.               
              </p>
              
              <a
                href="https://innovafuturo.cba.gov.ar/el-lado-b-de-una-varilla/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-center bg-amber-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-colors cursor-pointer"
              >
                Más información
              </a>

              <div className="pt-2 border-t border-white/10 text-[11px] text-neutral-400 space-y-1">
                <div>🖱️ <strong>Click y arrastre:</strong> Rotar vista 3D</div>
                <div>🔄 <strong>Rueda:</strong> Zoom acercar / alejar</div>
                <div>☀️ <strong>Deslizador:</strong> Mover el sol de 06:00 a 18:00</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
