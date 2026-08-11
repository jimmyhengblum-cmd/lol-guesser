export const ROUND_BASE = 100;
export const WRONG_PENALTY = 20;
export const MIN_POINTS = 20;
export const QCM_PER_QUESTION = 20;

/** Points for a guess round: full marks minus a penalty per wrong guess. */
export function guessRoundPoints(wrongGuesses: number, solved: boolean): number {
  if (!solved) return 0;
  return Math.max(MIN_POINTS, ROUND_BASE - wrongGuesses * WRONG_PENALTY);
}

/** Points for the QCM round: fixed value per correct answer. */
export function qcmPoints(correctCount: number): number {
  return correctCount * QCM_PER_QUESTION;
}
