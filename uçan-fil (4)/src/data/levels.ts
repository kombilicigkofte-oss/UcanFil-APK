import { BossKind, CrateTier } from '../types/game';

export const LEVELS_PER_CHAPTER = 5;

export type IslandThemeKind = 'savanna' | 'sakura' | 'frost' | 'volcano' | 'cyber' | 'cosmic';

export interface ChapterDefinition {
  title: string;
  shortTitle: string;
  biomeIndex: number;
  islandThemeKind: IslandThemeKind;
}

// Each chapter (Bölüm 1..30) owns its own dedicated unique biome from BIOME_THEMES
const CHAPTER_DEFINITIONS: ChapterDefinition[] = [
  { title: 'Savan Uyanışı', shortTitle: 'Savan', biomeIndex: 0, islandThemeKind: 'savanna' },
  { title: 'Kiraz Çiçeği Vadisi', shortTitle: 'Kiraz', biomeIndex: 5, islandThemeKind: 'sakura' },
  { title: 'Buzul Dağları', shortTitle: 'Buzul', biomeIndex: 10, islandThemeKind: 'frost' },
  { title: 'Volkanik Cehennem', shortTitle: 'Volkan', biomeIndex: 16, islandThemeKind: 'volcano' },
  { title: 'Siber Neon Şehri', shortTitle: 'Siber', biomeIndex: 20, islandThemeKind: 'cyber' },
  { title: 'Kozmik Galaksi', shortTitle: 'Kozmik', biomeIndex: 28, islandThemeKind: 'cosmic' },
  { title: 'Zümrüt Yağmur Ormanı', shortTitle: 'Zümrüt', biomeIndex: 1, islandThemeKind: 'savanna' },
  { title: 'Mercan Ufukları', shortTitle: 'Mercan', biomeIndex: 6, islandThemeKind: 'cosmic' },
  { title: 'Kızıl Çöl Geçidi', shortTitle: 'Kızıl Çöl', biomeIndex: 3, islandThemeKind: 'volcano' },
  { title: 'Zehirli Kanyon', shortTitle: 'Zehir', biomeIndex: 18, islandThemeKind: 'volcano' },
  { title: 'Kristal Mağara', shortTitle: 'Kristal', biomeIndex: 13, islandThemeKind: 'frost' },
  { title: 'Kanlı Ay Kalesi', shortTitle: 'Kanlı Ay', biomeIndex: 19, islandThemeKind: 'volcano' },
  { title: 'Altın Günbatımı', shortTitle: 'Günbatımı', biomeIndex: 2, islandThemeKind: 'savanna' },
  { title: 'Bambu Vadisi', shortTitle: 'Bambu', biomeIndex: 4, islandThemeKind: 'savanna' },
  { title: 'Sonbahar Korusu', shortTitle: 'Sonbahar', biomeIndex: 7, islandThemeKind: 'sakura' },
  { title: 'Lavanta Bozkırı', shortTitle: 'Lavanta', biomeIndex: 8, islandThemeKind: 'sakura' },
  { title: 'Altın Tapınak', shortTitle: 'Tapınak', biomeIndex: 9, islandThemeKind: 'savanna' },
  { title: 'Karlı Çamlık', shortTitle: 'Çamlık', biomeIndex: 11, islandThemeKind: 'frost' },
  { title: 'Kutup Gecesi', shortTitle: 'Kutup', biomeIndex: 12, islandThemeKind: 'frost' },
  { title: 'Sisli Bataklık', shortTitle: 'Bataklık', biomeIndex: 14, islandThemeKind: 'savanna' },
  { title: 'Fırtına Tepesi', shortTitle: 'Fırtına', biomeIndex: 15, islandThemeKind: 'cyber' },
  { title: 'Kül Çölü', shortTitle: 'Kül Çölü', biomeIndex: 17, islandThemeKind: 'volcano' },
  { title: 'Hologram Bulvarı', shortTitle: 'Hologram', biomeIndex: 21, islandThemeKind: 'cyber' },
  { title: 'Elektro Şebeke', shortTitle: 'Elektro', biomeIndex: 22, islandThemeKind: 'cyber' },
  { title: 'Lazer Hisarı', shortTitle: 'Lazer', biomeIndex: 23, islandThemeKind: 'cyber' },
  { title: 'Gölge Krallığı', shortTitle: 'Gölge', biomeIndex: 24, islandThemeKind: 'cosmic' },
  { title: 'Ametist Bulutsusu', shortTitle: 'Ametist', biomeIndex: 25, islandThemeKind: 'cosmic' },
  { title: 'Güneş Patlaması', shortTitle: 'Güneş', biomeIndex: 26, islandThemeKind: 'volcano' },
  { title: 'Süpernova Limanı', shortTitle: 'Süpernova', biomeIndex: 27, islandThemeKind: 'cosmic' },
  { title: 'Ebedi Sonsuzluk', shortTitle: 'Sonsuzluk', biomeIndex: 29, islandThemeKind: 'cosmic' },
];

const STAGE_SUFFIXES = ['Girişi', 'Rotası', 'Vadisi', 'Geçidi', 'Zirvesi'];

export interface ChapterInfo {
  chapter: number;
  stageInChapter: number;
  totalStagesInChapter: number;
  isChapterEnd: boolean;
  title: string;
  shortTitle: string;
  biomeIndex: number;
  islandThemeKind: IslandThemeKind;
  shieldUnlocked: boolean;
}

export interface LevelConfig {
  level: number;
  chapter: number;
  stageInChapter: number;
  isChapterEnd: boolean;
  chapterTitle: string;
  shieldUnlocked: boolean;
  title: string;
  targetPipes: number;
  speedMultiplier: number;
  gapReduction: number;
  movingPipeChance: number;
  movingPipeAmplitude: number;
  movingPipeSpeed: number;
  isBoss: boolean;
  bossKind: BossKind;
  difficultyLabel: string;
  difficultyColor: string;
  rewardPeanuts: number;
  replayPeanuts: number;
  rewardCrateTier: CrateTier | null;
  biomeIndex: number;
  biomeScoreHint: number;
}

export function getChapterInfo(rawLevel: number): ChapterInfo {
  const level = Math.max(1, Math.min(9999, Math.floor(rawLevel || 1)));
  const chapter = Math.floor((level - 1) / LEVELS_PER_CHAPTER) + 1;
  const stageInChapter = ((level - 1) % LEVELS_PER_CHAPTER) + 1;
  const isChapterEnd = stageInChapter === LEVELS_PER_CHAPTER;
  const def = CHAPTER_DEFINITIONS[(chapter - 1) % CHAPTER_DEFINITIONS.length];
  const cycle = Math.floor((chapter - 1) / CHAPTER_DEFINITIONS.length);
  const title = cycle === 0 ? def.title : `${def.title} ${cycle + 1}`;
  const shortTitle = cycle === 0 ? `${def.shortTitle} Adası` : `${def.shortTitle} ${chapter}`;
  // Seviyeli modda kalkan 2. bölümden sonra (3. Bölüm = Sv.11+) açılır
  const shieldUnlocked = chapter > 2;

  return {
    chapter,
    stageInChapter,
    totalStagesInChapter: LEVELS_PER_CHAPTER,
    isChapterEnd,
    title,
    shortTitle,
    biomeIndex: def.biomeIndex,
    islandThemeKind: def.islandThemeKind,
    shieldUnlocked,
  };
}

export function getLevelConfig(rawLevel: number): LevelConfig {
  const level = Math.max(1, Math.min(9999, Math.floor(rawLevel || 1)));
  const chapterInfo = getChapterInfo(level);
  const bossKind: BossKind = level % 10 === 0 ? 'boss' : level % 5 === 0 ? 'miniboss' : 'none';
  const isBoss = bossKind !== 'none';

  // Boss stages have a crisp approach run before entering the Boss Arena
  const targetPipes =
    bossKind === 'boss'
      ? Math.min(24, 6 + level)
      : bossKind === 'miniboss'
        ? Math.min(26, 6 + level)
        : Math.min(44, 5 + level * 2);

  // Noticeable non-linear difficulty curve: gentle start, steady climb, tense boss peaks
  const progression = Math.pow(level - 1, 0.92);
  const speedMultiplier = Math.min(
    1.9,
    1 + progression * 0.036 + (bossKind === 'boss' ? 0.08 : bossKind === 'miniboss' ? 0.05 : 0)
  );
  const gapReduction = Math.min(
    46,
    Math.round(progression * 2.4 + (bossKind === 'boss' ? 5 : bossKind === 'miniboss' ? 3 : 0))
  );

  // Moving pipes introduce at level 2 lightly, ramp aggressively afterward
  const movingPipeChance =
    level === 1 ? 0 : Math.min(0.85, 0.14 + (level - 2) * 0.075 + (isBoss ? 0.1 : 0));
  const movingPipeAmplitude =
    level === 1 ? 0 : Math.min(54, 14 + (level - 2) * 3.4 + (isBoss ? 6 : 0));
  const movingPipeSpeed =
    level === 1 ? 0 : Math.min(3.4, 1.55 + (level - 2) * 0.11 + (isBoss ? 0.25 : 0));

  const rewardPeanuts =
    12 + level * 4 + (bossKind === 'boss' ? 60 : bossKind === 'miniboss' ? 28 : 0);
  const replayPeanuts =
    5 + Math.min(30, Math.floor(level * 0.9) + (bossKind === 'boss' ? 12 : bossKind === 'miniboss' ? 6 : 0));

  let rewardCrateTier: CrateTier | null = null;
  if (level % 20 === 0) {
    rewardCrateTier = 'mythic';
  } else if (level % 10 === 0) {
    rewardCrateTier = 'epic';
  } else if (level === 2 || level % 5 === 0 || level % 8 === 0) {
    // Players earn Seviyeli Kıyafet Kasası regularly on milestones & chapter bosses
    rewardCrateTier = 'leveled_outfit';
  } else if (level % 4 === 0) {
    rewardCrateTier = 'standard';
  }

  let difficultyLabel = 'Başlangıç';
  let difficultyColor = '#34D399';
  if (bossKind === 'boss') {
    difficultyLabel = 'Büyük Patron';
    difficultyColor = '#F43F5E';
  } else if (bossKind === 'miniboss') {
    difficultyLabel = 'Mini Patron';
    difficultyColor = '#FB923C';
  } else if (level >= 16) {
    difficultyLabel = 'Kabus';
    difficultyColor = '#FB7185';
  } else if (level >= 10) {
    difficultyLabel = 'Uzman';
    difficultyColor = '#A855F7';
  } else if (level >= 5) {
    difficultyLabel = 'Zor';
    difficultyColor = '#F59E0B';
  } else if (level >= 2) {
    difficultyLabel = 'Orta';
    difficultyColor = '#38BDF8';
  }

  const def = CHAPTER_DEFINITIONS[(chapterInfo.chapter - 1) % CHAPTER_DEFINITIONS.length];
  const stageSuffix = STAGE_SUFFIXES[(chapterInfo.stageInChapter - 1) % STAGE_SUFFIXES.length];
  const baseTitle = `${def.shortTitle} ${stageSuffix}`;
  const title =
    bossKind === 'boss'
      ? `${baseTitle} (Patron)`
      : bossKind === 'miniboss'
        ? `${baseTitle} (Mini Patron)`
        : baseTitle;

  const biomeIndex = chapterInfo.biomeIndex;
  const biomeScoreHint = biomeIndex * 6;

  return {
    level,
    chapter: chapterInfo.chapter,
    stageInChapter: chapterInfo.stageInChapter,
    isChapterEnd: chapterInfo.isChapterEnd,
    chapterTitle: chapterInfo.title,
    shieldUnlocked: chapterInfo.shieldUnlocked,
    title,
    targetPipes,
    speedMultiplier,
    gapReduction,
    movingPipeChance,
    movingPipeAmplitude,
    movingPipeSpeed,
    isBoss,
    bossKind,
    difficultyLabel,
    difficultyColor,
    rewardPeanuts,
    replayPeanuts,
    rewardCrateTier,
    biomeIndex,
    biomeScoreHint,
  };
}
