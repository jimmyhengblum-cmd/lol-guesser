/**
 * Emoji-concept hints for the hardcore "Emoji" round (formerly rébus): a few
 * emojis evoking the champion's concept / theme / art-direction / kit — NOT a
 * phonetic word-puzzle. Maps a clue to a DDragon champion id; the build picks
 * one whose id exists in the current roster. Add freely — `id` must match DDragon.
 */
export interface Rebus {
  clue: string;
  id: string;
}

export const REBUS: Rebus[] = [
  { clue: '🦊 💗 🔮', id: 'Ahri' }, // renarde, charme, orbe
  { clue: '⚔️ 🛡️ 🌀', id: 'Garen' }, // épée, bouclier démacien, toupie
  { clue: '✨ 🔆 🌟', id: 'Lux' }, // lumière, dame de clarté
  { clue: '🔥 🌋 💥', id: 'Brand' }, // mage de feu
  { clue: '🥊 👮‍♀️ 💥', id: 'Vi' }, // gantelets, agent de Piltover
  { clue: '🏮 💪 ⚡', id: 'Jax' }, // lampadaire, maître d’armes, étourdit
  { clue: '🧪 ☠️ 🏃', id: 'Singed' }, // chimiste fou, traînée de poison
  { clue: '🐻 ⚡ 🌩️', id: 'Volibear' }, // ours-demi-dieu de la foudre
  { clue: '🎶 🎻 💙', id: 'Sona' }, // virtuose des cordes, auras
  { clue: '⚔️ 💔 🌬️', id: 'Riven' }, // lame brisée, exilée
  { clue: '🥊 👊 🩸', id: 'Sett' }, // le Boss, poings nus
  { clue: '👑 🖤 💔', id: 'Viego' }, // Roi déchu, brume noire, reine perdue
  { clue: '🧘‍♀️ 🪷 ⛓️', id: 'Karma' }, // illuminée, lotus, liens
  { clue: '🛡️ 🔱 ⭐', id: 'Pantheon' }, // Aspect de la guerre, lance, Targon
  { clue: '🌊 🔱 🐟', id: 'Nami' }, // Appel des marées, trident, marai
  { clue: '🪓 🩸 👑', id: 'Darius' }, // guillotine noxienne, saignement
  { clue: '🍄 🎯 🐾', id: 'Teemo' }, // champignons, fléchette, éclaireur
  { clue: '🌪️ ⚔️ 🍃', id: 'Yasuo' }, // vent, lame, errance
];
