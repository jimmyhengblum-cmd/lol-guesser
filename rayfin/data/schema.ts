import { DailyResult } from './DailyResult.js';
import { DailyReroll } from './DailyReroll.js';
import { DailyScore } from './DailyScore.js';

export type BlankAppSchema = {
  DailyResult: DailyResult;
  DailyScore: DailyScore;
  DailyReroll: DailyReroll;
};

export const schema = [DailyResult, DailyScore, DailyReroll];
