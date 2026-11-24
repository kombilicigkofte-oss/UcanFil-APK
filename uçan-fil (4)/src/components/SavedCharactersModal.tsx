import React, { useState } from 'react';
import { BookmarkPlus, Check, RefreshCw, Trash2, X } from 'lucide-react';
import { COSMETIC_BY_ID } from '../data/cosmetics';
import {
  BODY_TYPE_CONFIGS,
  BodyType,
  EquippedCosmetics,
  SavedCharacterPreset,
} from '../types/game';
import { ElephantAvatarCanvas } from './CosmeticPreviewCanvas';
import StyledPlayerName from './StyledPlayerName';

interface SavedCharactersModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: SavedCharacterPreset[];
  currentBodyType: BodyType;
  currentEquipped: EquippedCosmetics;
  currentNameColorId: string;
  previewPlayerName: string;
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: SavedCharacterPreset) => void;
  onOverwritePreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => void;
}

const MAX_PRESETS = 12;

export default function SavedCharactersModal({
  isOpen,
  onClose,
  presets,
  currentBodyType,
  currentEquipped,
  currentNameColorId,
  previewPlayerName,
  onSavePreset,
  onLoadPreset,
  onOverwritePreset,
  onDeletePreset,
}: SavedCharactersModalProps) {
  const [presetName, setPresetName] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSameAsCurrent = (p: SavedCharacterPreset) =>
    p.bodyType === currentBodyType &&
    p.nameColorId === currentNameColorId &&
    p.equipped.hat === currentEquipped.hat &&
    p.equipped.glasses === currentEquipped.glasses &&
    p.equipped.skin === currentEquipped.skin &&
    p.equipped.trail === currentEquipped.trail &&
    (p.equipped.suit || 'suit_none') === (currentEquipped.suit || 'suit_none') &&
    (p.equipped.pet || 'pet_none') === (currentEquipped.pet || 'pet_none');

  const showTempFeedback = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (presets.length >= MAX_PRESETS) return;
    const clean = presetName.trim() || `Kombin #${presets.length + 1}`;
    onSavePreset(clean.slice(0, 24));
    setPresetName('');
    showTempFeedback(`"${clean.slice(0, 24)}" kaydedildi!`);
  };

  const suitItem = COSMETIC_BY_ID[currentEquipped.suit || 'suit_none'];
  const skinItem = COSMETIC_BY_ID[currentEquipped.skin];
  const hatItem = COSMETIC_BY_ID[currentEquipped.hat];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 flex items-end landscape:items-center justify-center landscape:p-3 overscroll-contain"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[500px] landscape:max-w-[min(94vw,660px)] bg-slate-900 border-t border-x landscape:border border-slate-700/80 rounded-t-3xl landscape:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[91dvh] landscape:max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 pt-2 pb-0.5 flex justify-center bg-slate-950/50 landscape:hidden">
          <span className="w-10 h-1 rounded-full bg-slate-600" aria-hidden="true" />
        </div>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/50">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-white tracking-tight truncate">
              Kayıtlı Karakterler ({presets.length}/{MAX_PRESETS})
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              Sevdiğin fil kombinlerini kaydet ve tek dokunuşla giy.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer shrink-0 touch-manipulation"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Save Current Character Box */}
        <form
          onSubmit={handleCreate}
          className="p-4 border-b border-slate-800 bg-slate-800/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="flex items-center gap-3 shrink-0">
            <ElephantAvatarCanvas
              bodyType={currentBodyType}
              skinId={currentEquipped.skin}
              hatId={currentEquipped.hat}
              glassesId={currentEquipped.glasses}
              suitId={currentEquipped.suit || 'suit_none'}
              petId={currentEquipped.pet || 'pet_none'}
              size={58}
              background="savanna"
              className="rounded-xl border border-slate-700"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-amber-300">Şu Anki Karakterin</div>
              <StyledPlayerName
                name={previewPlayerName}
                colorId={currentNameColorId}
                className="text-sm font-extrabold block truncate"
              />
              <div className="text-[11px] text-slate-400 truncate max-w-[190px]">
                {BODY_TYPE_CONFIGS[currentBodyType].label} · {skinItem?.name || 'Klasik'}
                {hatItem && hatItem.id !== 'hat_none' ? ` · ${hatItem.name}` : ''}
                {suitItem && suitItem.id !== 'suit_none' ? ` · ${suitItem.name}` : ''}
              </div>
            </div>
          </div>

          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              maxLength={24}
              placeholder={`Kombin adı (ör. Smokinli Fil)`}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={presets.length >= MAX_PRESETS}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer whitespace-nowrap"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>Kaydet</span>
            </button>
          </div>
        </form>

        {feedback && (
          <div className="px-4 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-xs font-bold text-emerald-300 text-center">
            {feedback}
          </div>
        )}

        {/* Saved Presets Grid */}
        <div className="p-4 overflow-y-auto flex-1">
          {presets.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm font-semibold text-slate-300">Henüz kayıtlı karakterin yok.</p>
              <p className="mt-1 text-xs text-slate-500">
                Yukarıdan isim yazıp &ldquo;Kaydet&rdquo; butonuna basarak ilk kombinini sakla!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((preset) => {
                const active = isSameAsCurrent(preset);
                const pSkin = COSMETIC_BY_ID[preset.equipped.skin]?.name || 'Klasik';
                const pHat = COSMETIC_BY_ID[preset.equipped.hat];
                const pGlasses = COSMETIC_BY_ID[preset.equipped.glasses];
                const pSuit = COSMETIC_BY_ID[preset.equipped.suit || 'suit_none'];
                const pTrail = COSMETIC_BY_ID[preset.equipped.trail];

                return (
                  <div
                    key={preset.id}
                    className={`rounded-xl border p-3 flex items-center gap-3 transition-colors ${
                      active
                        ? 'bg-emerald-950/35 border-emerald-400/60'
                        : 'bg-slate-800/60 border-slate-700/70 hover:border-slate-600'
                    }`}
                  >
                    <ElephantAvatarCanvas
                      bodyType={preset.bodyType}
                      skinId={preset.equipped.skin}
                      hatId={preset.equipped.hat}
                      glassesId={preset.equipped.glasses}
                      suitId={preset.equipped.suit || 'suit_none'}
                      petId={preset.equipped.pet || 'pet_none'}
                      size={64}
                      background="dark"
                      className="rounded-xl border border-slate-700/80"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-white truncate">
                          {preset.name}
                        </span>
                        {active && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                            <Check className="w-3 h-3" />
                            Giyli
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400 truncate">
                        {BODY_TYPE_CONFIGS[preset.bodyType].label} · {pSkin}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400 truncate">
                        {[
                          pHat && pHat.id !== 'hat_none' ? pHat.name : null,
                          pGlasses && pGlasses.id !== 'glasses_none' ? pGlasses.name : null,
                          pSuit && pSuit.id !== 'suit_none' ? pSuit.name : null,
                          pTrail && pTrail.id !== 'trail_none' ? pTrail.name : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Sade stil'}
                      </div>

                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onLoadPreset(preset);
                            showTempFeedback(`"${preset.name}" yüklendi!`);
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold transition-colors cursor-pointer"
                        >
                          Yükle / Giy
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onOverwritePreset(preset.id);
                            showTempFeedback(`"${preset.name}" güncellendi!`);
                          }}
                          title="Şu anki karakteri bunun üzerine kaydet"
                          className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePreset(preset.id)}
                          title="Kayıtlı karakteri sil"
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
