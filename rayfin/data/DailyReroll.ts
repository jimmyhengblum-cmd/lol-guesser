import { entity, role, uuid, text, date } from '@microsoft/rayfin-core';

/**
 * A manual "reroll" event for a day's quiz. Any authenticated user can read
 * every row (clients poll for the latest one to know a reroll happened), but
 * only the admin account can create one — enforced server-side by email claim,
 * not just by hiding the button client-side.
 */
const ADMIN_EMAIL = 'jheng@datatorii.com';

@entity()
@role('authenticated', 'read')
@role('authenticated', 'create', {
  policy: (claims) => claims.email.eq(ADMIN_EMAIL),
})
export class DailyReroll {
  @uuid() id!: string;
  @text({ max: 32 }) dateKey!: string;
  @text({ max: 40 }) salt!: string;
  @text({ max: 120 }) createdBy!: string;
  @date() createdAt!: Date;
}
