import { entity, role, uuid, text, int, date } from '@microsoft/rayfin-core';

/**
 * A player's total score for the daily 8-round quiz. Any authenticated user
 * can read every row (daily + general leaderboards); a user can only create
 * rows for themselves (`userId` must equal their JWT `sub`).
 */
@entity()
@role('authenticated', 'read')
@role('authenticated', 'create', {
  policy: (claims, item) => claims.sub.eq(item.userId),
})
export class DailyScore {
  @uuid() id!: string;
  @text({ max: 32 }) dateKey!: string;
  @int() points!: number;
  @int() durationMs!: number;
  @text({ max: 200 }) userId!: string;
  @text({ max: 120 }) userName!: string;
  @date() createdAt!: Date;
}
