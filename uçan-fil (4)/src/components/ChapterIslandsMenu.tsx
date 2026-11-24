import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Check, Compass, Crown, Grid2X2, Lock, Map, Play, Shield, Skull, X } from 'lucide-react';
import { getChapterInfo, getLevelConfig, IslandThemeKind, LEVELS_PER_CHAPTER } from '../data/levels';
import { BIOME_THEMES } from '../utils/renderer';
import ChapterIslands3DMap from './ChapterIslands3DMap';

interface IslandVisualPreset {
  shortTitle: string;
  biomeName: string;
  skyFrom: string;
  skyTo: string;
  turfColor: string;
  rockDark: string;
  rockMid: string;
  accentColor: string;
  themeKind: IslandThemeKind;
}

function getIslandVisual(chapter: number): IslandVisualPreset {
  const firstLevel = (chapter - 1) * LEVELS_PER_CHAPTER + 1;
  const info = getChapterInfo(firstLevel);
  const biome = BIOME_THEMES[info.biomeIndex % BIOME_THEMES.length];

  return {
    shortTitle: info.shortTitle,
    biomeName: biome.name,
    skyFrom: biome.skyTop,
    skyTo: biome.skyMid,
    turfColor: biome.groundTop,
    rockDark: biome.earthBottom,
    rockMid: biome.earthTop,
    accentColor: biome.sceneryAccent || biome.badgeColor,
    themeKind: info.islandThemeKind,
  };
}

function FloatingIslandSvg({
  visual,
  locked,
  compact = false,
}: {
  visual: IslandVisualPreset;
  locked: boolean;
  compact?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 120 74"
      className={`${compact ? 'w-full h-11' : 'w-full h-24'} overflow-visible select-none ${
        locked ? 'opacity-50 grayscale-[45%]' : ''
      }`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`rock-${visual.themeKind}-${compact ? 'c' : 'f'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={visual.rockMid} />
          <stop offset="100%" stopColor={visual.rockDark} />
        </linearGradient>
      </defs>

      {/* Atmospheric celestial detail */}
      {visual.themeKind === 'savanna' && (
        <circle cx="96" cy="14" r="7.5" fill="#FEF08A" opacity="0.9" />
      )}
      {visual.themeKind === 'sakura' && (
        <>
          <circle cx="96" cy="14" r="6" fill="#FFF1F2" opacity="0.9" />
          <circle cx="99" cy="12" r="5" fill={visual.skyFrom} />
        </>
      )}
      {(visual.themeKind === 'frost' || visual.themeKind === 'cosmic') && (
        <>
          <circle cx="22" cy="12" r="1.4" fill="#FFFFFF" opacity="0.8" />
          <circle cx="94" cy="15" r="2" fill={visual.accentColor} opacity="0.85" />
          <circle cx="76" cy="9" r="1.2" fill="#FFFFFF" opacity="0.7" />
        </>
      )}
      {visual.themeKind === 'cosmic' && (
        <ellipse
          cx="96"
          cy="14"
          rx="11"
          ry="3"
          fill="none"
          stroke="#FDE047"
          strokeWidth="1.3"
          transform="rotate(-14 96 14)"
        />
      )}

      {/* Scenery atop the island */}
      {visual.themeKind === 'savanna' && (
        <g>
          <path d="M38 42 L38 26 M38 32 L30 25 M38 30 L45 24" stroke="#451A03" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="38" cy="23" rx="14" ry="4.5" fill="#15803D" />
          <ellipse cx="74" cy="39" rx="7" ry="4" fill="#22C55E" />
        </g>
      )}
      {visual.themeKind === 'sakura' && (
        <g>
          <path d="M42 42 L42 25 M42 32 L34 25 M42 30 L50 25" stroke="#4C1D95" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="42" cy="22" rx="13" ry="5.5" fill="#F9A8D4" />
          <ellipse cx="32" cy="24" rx="7" ry="4" fill="#F472B6" />
          <circle cx="77" cy="37" r="4.5" fill="#F472B6" />
        </g>
      )}
      {visual.themeKind === 'frost' && (
        <g>
          <polygon points="30,42 42,16 54,42" fill="#0C4A6E" />
          <polygon points="36,29 42,16 48,29" fill="#F0F9FF" />
          <polygon points="56,42 66,22 76,42" fill="#0369A1" />
          <polygon points="61,32 66,22 71,32" fill="#E0F2FE" />
        </g>
      )}
      {visual.themeKind === 'volcano' && (
        <g>
          <polygon points="34,42 50,16 64,16 80,42" fill="#292524" />
          <rect x="50" y="16" width="14" height="3.5" rx="1.5" fill="#F97316" />
          <circle cx="54" cy="10" r="2.2" fill="#FB7185" opacity="0.85" />
          <circle cx="60" cy="7" r="1.6" fill="#FDE047" opacity="0.85" />
        </g>
      )}
      {visual.themeKind === 'cyber' && (
        <g>
          <rect x="30" y="20" width="11" height="22" rx="1.5" fill="#0F172A" stroke="#22D3EE" strokeWidth="1.2" />
          <rect x="46" y="14" width="13" height="28" rx="1.5" fill="#1E293B" stroke="#E879F9" strokeWidth="1.2" />
          <rect x="65" y="24" width="10" height="18" rx="1.5" fill="#0F172A" stroke="#22D3EE" strokeWidth="1.2" />
          <rect x="49" y="19" width="7" height="2" fill="#22D3EE" />
          <rect x="49" y="24" width="7" height="2" fill="#E879F9" />
        </g>
      )}
      {visual.themeKind === 'cosmic' && (
        <g>
          <polygon points="34,42 42,17 50,42" fill="#E879F9" opacity="0.9" />
          <polygon points="54,42 62,13 70,42" fill="#38BDF8" opacity="0.9" />
          <polygon points="73,42 79,24 85,42" fill="#FDE047" opacity="0.9" />
        </g>
      )}

      {/* Floating Island Cliff Underside */}
      <polygon
        points="16,44 104,44 92,58 70,69 54,66 36,70 24,57"
        fill={`url(#rock-${visual.themeKind}-${compact ? 'c' : 'f'})`}
        stroke="#0F172A"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Subtle rock facet */}
      <polygon points="36,46 68,46 54,65 36,68" fill="#000000" opacity="0.18" />

      {/* Biome Crust / Turf Cap */}
      <rect
        x="12"
        y="39"
        width="96"
        height="8"
        rx="4"
        fill={visual.turfColor}
        stroke="#0F172A"
        strokeWidth="2"
      />

      {/* Tiny drifting underside pebble */}
      <polygon points="22,64 28,64 25,69" fill={visual.rockMid} stroke="#0F172A" strokeWidth="1.2" />
      <polygon points="94,61 99,61 97,66" fill={visual.rockMid} stroke="#0F172A" strokeWidth="1.2" />
    </svg>
  );
}

interface ChapterIslandsStripProps {
  selectedLevel: number;
  unlockedLevel: number;
  onSelectLevel: (level: number) => void;
  onOpenFullMap: () => void;
}

export function ChapterIslandsStrip({
  selectedLevel,
  unlockedLevel,
  onSelectLevel,
  onOpenFullMap,
}: ChapterIslandsStripProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const selectedChapter = getChapterInfo(selectedLevel).chapter;
  const unlockedChapter = getChapterInfo(unlockedLevel).chapter;
  const totalDisplayedChapters = Math.max(6, unlockedChapter + 1);

  const chapters = useMemo(
    () => Array.from({ length: totalDisplayedChapters }, (_, idx) => idx + 1),
    [totalDisplayedChapters]
  );

  // Scroll currently selected island card inside the local horizontal strip without calling scrollIntoView
  // (scrollIntoView can scroll parent mobile iframe containers / switch away from Preview on phones)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>(
      `[data-island-chapter="${selectedChapter}"]`
    );
    if (activeEl) {
      const targetLeft = Math.max(
        0,
        activeEl.offsetLeft - container.clientWidth / 2 + activeEl.offsetWidth / 2
      );
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  }, [selectedChapter]);

  const activeChapterStartLevel = (selectedChapter - 1) * LEVELS_PER_CHAPTER + 1;

  return (
    <div className="rounded-xl bg-slate-950/80 border border-emerald-400/35 p-2 flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Compass className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span className="text-[11px] font-extrabold text-emerald-200 truncate">
            Bölüm Adaları
          </span>
          <span className="text-[10px] font-mono-num text-slate-400 shrink-0">
            {unlockedChapter}/{totalDisplayedChapters} Açık
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenFullMap}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-400/15 hover:bg-emerald-400/25 border border-emerald-400/40 text-[10px] font-bold text-emerald-200 transition-colors cursor-pointer shrink-0"
        >
          <Map className="w-3 h-3" />
          <span>Ada Haritası</span>
        </button>
      </div>

      {/* Horizontal Floating Islands Track */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-1.5 overflow-x-auto overscroll-x-contain touch-pan-x pb-1 scrollbar-thin"
      >
        {chapters.map((chapterNum, idx) => {
          const firstLevel = (chapterNum - 1) * LEVELS_PER_CHAPTER + 1;
          const lastLevel = chapterNum * LEVELS_PER_CHAPTER;
          const isUnlocked = unlockedLevel >= firstLevel;
          const isCleared = unlockedLevel > lastLevel;
          const isSelected = selectedChapter === chapterNum;
          const visual = getIslandVisual(chapterNum);

          const handleClickIsland = () => {
            if (!isUnlocked) return;
            const targetInChapter = Math.min(unlockedLevel, lastLevel);
            onSelectLevel(targetInChapter);
          };

          return (
            <React.Fragment key={chapterNum}>
              <button
                type="button"
                data-island-chapter={chapterNum}
                disabled={!isUnlocked}
                onClick={handleClickIsland}
                className={`relative shrink-0 w-[108px] rounded-xl border p-1.5 text-left transition-transform duration-150 flex flex-col gap-1 ${
                  !isUnlocked
                    ? 'bg-slate-900/60 border-slate-800 cursor-not-allowed opacity-70'
                    : isSelected
                      ? 'bg-slate-900 border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.45)] cursor-pointer -translate-y-0.5'
                      : 'bg-slate-900/90 border-slate-700/80 hover:border-emerald-400/60 cursor-pointer'
                }`}
              >
                {/* Sky card backdrop + floating island SVG */}
                <div
                  className="relative rounded-lg px-1 pt-1 pb-0.5 overflow-hidden border border-slate-800/80"
                  style={{
                    background: `linear-gradient(180deg, ${visual.skyFrom} 0%, ${visual.skyTo} 100%)`,
                  }}
                >
                  <div className="flex items-center justify-between text-[9px] font-mono-num font-extrabold mb-0.5">
                    <span className="px-1 py-0.2 rounded bg-slate-950/75 text-white">
                      B{chapterNum}
                    </span>
                    {!isUnlocked ? (
                      <Lock className="w-3 h-3 text-slate-300 drop-shadow" />
                    ) : isCleared ? (
                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-400 text-slate-950">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="px-1 rounded bg-amber-400 text-slate-950 text-[8px] font-extrabold">
                        Aktif
                      </span>
                    )}
                  </div>
                  <FloatingIslandSvg visual={visual} locked={!isUnlocked} compact />
                </div>

                {/* Island name + 5 stage pips */}
                <div className="px-0.5">
                  <div className="text-[10px] font-extrabold text-white truncate">
                    {visual.shortTitle}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-0.5">
                    {Array.from({ length: LEVELS_PER_CHAPTER }, (_, stageIdx) => {
                      const stageLvl = firstLevel + stageIdx;
                      const stageUnlocked = unlockedLevel >= stageLvl;
                      const stageCleared = unlockedLevel > stageLvl;
                      const stageActive = selectedLevel === stageLvl;
                      const isBigBoss = stageLvl % 10 === 0;
                      const isMiniBoss = !isBigBoss && stageLvl % 5 === 0;
                      return (
                        <span
                          key={stageLvl}
                          className={`h-1.5 flex-1 rounded-full ${
                            stageActive
                              ? 'bg-amber-400'
                              : stageCleared
                                ? 'bg-emerald-400'
                                : stageUnlocked
                                  ? 'bg-sky-400'
                                  : isBigBoss || isMiniBoss
                                    ? 'bg-rose-900/70'
                                    : 'bg-slate-700'
                          }`}
                          title={`Sv.${stageLvl}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </button>

              {/* Dashed bridge connector between islands */}
              {idx < chapters.length - 1 && (
                <div className="shrink-0 flex items-center self-center px-0.5" aria-hidden="true">
                  <div className="w-2.5 border-t-2 border-dashed border-slate-600" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Quick 5-Stage Island Sub-selector for the Active Island */}
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: LEVELS_PER_CHAPTER }, (_, idx) => {
          const lvl = activeChapterStartLevel + idx;
          const stageUnlocked = unlockedLevel >= lvl;
          const stageCleared = unlockedLevel > lvl;
          const isCurrent = selectedLevel === lvl;
          const isBigBoss = lvl % 10 === 0;
          const isMiniBoss = !isBigBoss && lvl % 5 === 0;

          return (
            <button
              key={lvl}
              type="button"
              disabled={!stageUnlocked}
              onClick={() => onSelectLevel(lvl)}
              className={`h-8 rounded-lg font-mono-num text-[11px] font-extrabold transition-colors flex items-center justify-center gap-1 border ${
                !stageUnlocked
                  ? 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
                  : isCurrent
                    ? 'bg-emerald-400 border-emerald-300 text-slate-950 shadow-sm cursor-pointer'
                    : stageCleared
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/25 cursor-pointer'
                      : 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700 cursor-pointer'
              }`}
              title={`Bölüm ${selectedChapter} · Sv.${lvl}`}
            >
              {!stageUnlocked ? (
                <Lock className="w-3 h-3" />
              ) : isBigBoss ? (
                <Crown className="w-3 h-3 shrink-0 text-rose-500" />
              ) : isMiniBoss ? (
                <Skull className="w-3 h-3 shrink-0 text-amber-400" />
              ) : null}
              <span>{lvl}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ChapterIslandsModalProps {
  isOpen: boolean;
  selectedLevel: number;
  unlockedLevel: number;
  onSelectLevel: (level: number) => void;
  onStartLevel: (level: number) => void;
  onClose: () => void;
}

export function ChapterIslandsModal({
  isOpen,
  selectedLevel,
  unlockedLevel,
  onSelectLevel,
  onStartLevel,
  onClose,
}: ChapterIslandsModalProps) {
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  if (!isOpen) return null;

  const unlockedChapter = getChapterInfo(unlockedLevel).chapter;
  const totalDisplayedChapters = Math.max(6, unlockedChapter + 1);
  const chapters = Array.from({ length: totalDisplayedChapters }, (_, i) => i + 1);
  const selectedCfg = getLevelConfig(selectedLevel);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 flex items-end landscape:items-center justify-center landscape:p-3 overscroll-contain"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-[500px] landscape:max-w-[min(96vw,880px)] bg-slate-900 border-t border-x landscape:border border-emerald-400/45 rounded-t-3xl landscape:rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
          viewMode === '3d' ? 'h-[93dvh]' : 'max-h-[93dvh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 pt-2 pb-0.5 flex justify-center bg-slate-950 landscape:hidden">
          <span className="w-10 h-1 rounded-full bg-slate-600" aria-hidden="true" />
        </div>
        {/* Header */}
        <div className="shrink-0 px-3.5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-400/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
              <Map className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-white truncate">
                {viewMode === '3d' ? '3D Bölüm Adaları' : 'Bölüm Adaları'}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {viewMode === '3d'
                  ? 'Döndür & adalara dokunarak bölüm seç'
                  : 'Aşama seçerek istediğin bölüme uç'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 3D / 2D View Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer touch-manipulation ${
                  viewMode === '3d'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('2d')}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer touch-manipulation ${
                  viewMode === '2d'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Grid2X2 className="w-3.5 h-3.5" />
                <span>2D</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer touch-manipulation"
              aria-label="Haritayı Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {viewMode === '3d' ? (
          <ChapterIslands3DMap
            selectedLevel={selectedLevel}
            unlockedLevel={unlockedLevel}
            onSelectLevel={onSelectLevel}
            onStartLevel={(lvl) => {
              onClose();
              onStartLevel(lvl);
            }}
          />
        ) : (
          <>
            {/* Archipelago Map Grid (2D Fallback / Classic View) */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-3.5 grid grid-cols-1 landscape:grid-cols-2 gap-3.5"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 15%, rgba(56, 189, 248, 0.10), transparent 45%), radial-gradient(circle at 80% 75%, rgba(16, 185, 129, 0.10), transparent 50%)',
              }}
            >
          {chapters.map((chapterNum) => {
            const firstLevel = (chapterNum - 1) * LEVELS_PER_CHAPTER + 1;
            const lastLevel = chapterNum * LEVELS_PER_CHAPTER;
            const chapterInfo = getChapterInfo(firstLevel);
            const visual = getIslandVisual(chapterNum);
            const isUnlocked = unlockedLevel >= firstLevel;
            const isCleared = unlockedLevel > lastLevel;
            const isSelectedChapter = selectedCfg.chapter === chapterNum;

            return (
              <div
                key={chapterNum}
                className={`rounded-2xl border p-4 flex flex-col gap-3 transition-colors ${
                  !isUnlocked
                    ? 'bg-slate-950/60 border-slate-800 opacity-75'
                    : isSelectedChapter
                      ? 'bg-slate-900 border-emerald-400 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/90 border-slate-700/80'
                }`}
              >
                {/* Illustrated Sky Backdrop + Island */}
                <div
                  className="relative rounded-xl p-3 border border-slate-800/80 overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, ${visual.skyFrom} 0%, ${visual.skyTo} 100%)`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-950/80 text-white font-mono-num text-xs font-extrabold">
                      Ada {chapterNum} · Sv.{firstLevel}-{lastLevel}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {chapterInfo.shieldUnlocked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/25 border border-sky-300/40 text-sky-100 text-[10px] font-bold">
                          <Shield className="w-3 h-3" />
                          <span>Kalkan Açık</span>
                        </span>
                      )}
                      {!isUnlocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/80 text-slate-300 text-[10px] font-bold">
                          <Lock className="w-3 h-3" />
                          <span>Kilitli</span>
                        </span>
                      ) : isCleared ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-400 text-slate-950 text-[10px] font-extrabold">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Tamamlandı</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-extrabold">
                          Açık
                        </span>
                      )}
                    </div>
                  </div>

                  <FloatingIslandSvg visual={visual} locked={!isUnlocked} />

                  <div className="mt-1 flex items-center justify-between text-xs font-extrabold text-white drop-shadow">
                    <span>{visual.shortTitle}</span>
                    <span className="text-[11px] font-semibold text-slate-100/90">
                      {chapterInfo.title}
                    </span>
                  </div>
                </div>

                {/* 5 Island Stages */}
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: LEVELS_PER_CHAPTER }, (_, idx) => {
                    const lvl = firstLevel + idx;
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
                        className={`min-h-[54px] rounded-xl p-1.5 border flex flex-col items-center justify-center gap-0.5 transition-colors ${
                          !stageUnlocked
                            ? 'bg-slate-950/60 border-slate-800 text-slate-600 cursor-not-allowed'
                            : isCurrent
                              ? 'bg-emerald-400 border-emerald-300 text-slate-950 shadow-sm cursor-pointer'
                              : stageCleared
                                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/25 cursor-pointer'
                                : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700 cursor-pointer'
                        }`}
                        title={`Sv.${lvl} · ${cfg.title}`}
                      >
                        <div className="flex items-center gap-0.5 text-xs font-mono-num font-extrabold">
                          {!stageUnlocked ? (
                            <Lock className="w-3 h-3" />
                          ) : cfg.bossKind === 'boss' ? (
                            <Crown className="w-3.5 h-3.5 text-rose-500" />
                          ) : cfg.bossKind === 'miniboss' ? (
                            <Skull className="w-3.5 h-3.5 text-amber-400" />
                          ) : null}
                          <span>{lvl}</span>
                        </div>
                        <span
                          className={`text-[9px] font-bold truncate max-w-full ${
                            isCurrent
                              ? 'text-slate-900'
                              : cfg.bossKind === 'boss'
                                ? 'text-rose-300'
                                : cfg.bossKind === 'miniboss'
                                  ? 'text-amber-300'
                                  : 'text-slate-400'
                          }`}
                        >
                          {cfg.bossKind === 'boss'
                            ? 'Patron'
                            : cfg.bossKind === 'miniboss'
                              ? 'Mini'
                              : `${idx + 1}/5`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

            {/* Bottom Selected Stage Bar & Play CTA */}
            <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-slate-400 font-semibold">
                  Seçili Ada · Bölüm {selectedCfg.chapter} ({selectedCfg.stageInChapter}/5)
                </div>
                <div className="text-sm sm:text-base font-extrabold text-white truncate">
                  Sv.{selectedLevel} · {selectedCfg.title}{' '}
                  <span className="text-xs font-mono-num text-yellow-300 ml-1">
                    +{selectedLevel >= unlockedLevel ? selectedCfg.rewardPeanuts : selectedCfg.replayPeanuts}F
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Tamam
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartLevel(selectedLevel);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs sm:text-sm font-extrabold shadow-lg cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Sv.{selectedLevel} Uçuşa Başla</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
