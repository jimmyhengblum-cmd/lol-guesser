export type RoundKind =
  | 'champ-attributes'
  | 'champ-spell'
  | 'champ-description'
  | 'champ-passive'
  | 'champ-abilities'
  | 'champ-title'
  | 'champ-blur'
  | 'champ-rebus'
  | 'champ-lore'
  | 'champ-origin'
  | 'champ-splash'
  | 'champ-skin-splash'
  | 'champ-spell-numbers'
  | 'item-effect'
  | 'item-blur'
  | 'item-build'
  | 'qcm';

export type AnswerPool = 'champion' | 'item';

/** Difficulty mode. Hardcore = obscure clues, no easy giveaways. Blur = only
 * the zoomed/blurred-image rounds (skin splash, splash art, spell icon). */
export type QuizMode = 'normal' | 'hardcore' | 'blur' | 'role-rush';

export interface QcmOption {
  label: string;
  iconUrl: string;
}

export interface QcmQuestion {
  prompt: string;
  options: QcmOption[];
  answerIndex: number;
}

export interface DailyRound {
  kind: RoundKind;
  /** Short tab label, e.g. "Sort". */
  label: string;
  /** Instruction shown above the round, e.g. "Devine le champion par un de ses sorts". */
  instruction: string;
  pool: AnswerPool | null; // null for qcm
  targetId: string | null; // champion id or item id; null for qcm
  qcm?: QcmQuestion[];
  /** Hardcore: hide the spell name/slot (icon only). */
  hideName?: boolean;
  /** Hardcore: stronger, slower-revealing blur. */
  hard?: boolean;
  /** Pre-built clue text (rébus, origin line, item build components). */
  clueText?: string;
}

export interface DailyQuiz {
  dateKey: string;
  /** Draw id (the re-roll salt). Progress is keyed by date + draw, so a normal
   * refresh always restores answers; only a deliberate re-roll resets them. */
  drawId: string;
  /** Difficulty mode — separates progress and leaderboards. */
  mode: QuizMode;
  version: string;
  rounds: DailyRound[];
}

export const ROUND_COUNT = 8;
