import { entity, role, uuid, text, int, date } from '@microsoft/rayfin-core';

/**
 * One player's result for the daily champion. Any authenticated user can read
 * every row (that powers the cross-user leaderboard), but can only create rows
 * for themselves (`userId` must equal their JWT `sub` claim).
 */
@entity()
@role('authenticated', 'read')
@role('authenticated', 'create', {
  policy: (claims, item) => claims.sub.eq(item.userId),
})
export class DailyResult {
  @uuid() id!: string;
  @text({ max: 10 }) dateKey!: string;
  @text({ max: 64 }) championId!: string;
  @int() tries!: number;
  @int() durationMs!: number;
  @text({ max: 200 }) userId!: string;
  @text({ max: 120 }) userName!: string;
  @date() createdAt!: Date;
}
