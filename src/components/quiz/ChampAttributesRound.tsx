import { championImg } from '@/ddragon/ddragon';
import type { ChampionSummary, DdragonData } from '@/ddragon/types';
import {
  META_BY_ID,
  GENDER_FR,
  POS_FR,
  RANGE_FR,
  type Cell,
  type Position,
  type RangeType,
} from '@/quiz/championMeta';
import type { RoundState } from '@/quiz/useQuiz';
import { EntityIcon } from '@/components/EntityIcon';
import { EntitySearch, type SearchOption } from '@/components/EntitySearch';
import { GiveUpButton } from './GiveUpButton';
import { RoundReveal } from './RoundReveal';

const UNKNOWN = '?';
const TILE: Record<Cell['status'], string> = {
  match: 'bg-match text-match-ink',
  partial: 'bg-partial text-partial-ink',
  miss: 'bg-miss text-miss-ink',
};
const COLS = '[grid-template-columns:120px_repeat(7,62px)]';
const HEADERS = ['Champion', 'Genre', 'Position', 'Espèce', 'Ressource', 'Portée', 'Région', 'Année'];

/** A display row: curated lore where available, derived resource/range always. */
interface LoreRow {
  id: string;
  name: string;
  gender: string; // FR label or "?"
  positions: Position[]; // [] when unknown
  species: string;
  resource: string;
  range: RangeType;
  region: string;
  year: number | null;
}

function buildRow(s: ChampionSummary): LoreRow {
  const m = META_BY_ID[s.id];
  return {
    id: s.id,
    name: s.name,
    gender: m ? GENDER_FR[m.gender] : UNKNOWN,
    positions: m ? m.positions : [],
    species: m ? m.species : UNKNOWN,
    resource: s.partype && s.partype.trim() ? s.partype : 'Aucune',
    range: s.attackrange >= 300 ? 'Ranged' : 'Melee',
    region: m ? m.region : UNKNOWN,
    year: m ? m.releaseYear : null,
  };
}

const eq = (a: string, b: string): Cell => ({ status: a !== UNKNOWN && a === b ? 'match' : 'miss' });

function cmpPositions(g: Position[], s: Position[]): Cell {
  if (!g.length || !s.length) return { status: 'miss' };
  const same = g.length === s.length && g.every((p) => s.includes(p));
  if (same) return { status: 'match' };
  return { status: g.some((p) => s.includes(p)) ? 'partial' : 'miss' };
}

function cmpYear(g: number | null, s: number | null): Cell {
  if (g == null || s == null) return { status: 'miss' };
  if (g === s) return { status: 'match' };
  return { status: 'miss', hint: s > g ? 'up' : 'down' };
}

function posLabel(p: Position[]): string {
  return p.length ? p.map((x) => POS_FR[x]).join('/') : UNKNOWN;
}

interface Props {
  data: DdragonData;
  version: string;
  targetId: string;
  state: RoundState;
  done: boolean;
  onGuess: (id: string, correct: boolean) => void;
  onGiveUp: () => void;
}

function Tile({ value, cell }: { value: React.ReactNode; cell: Cell }) {
  return (
    <div
      className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-tile px-1 text-center ${TILE[cell.status]}`}
    >
      <span className="text-[10px] font-semibold leading-tight">{value}</span>
      {cell.hint && <span className="text-xs leading-none">{cell.hint === 'up' ? '▲' : '▼'}</span>}
    </div>
  );
}

export function ChampAttributesRound({ data, version, targetId, state, done, onGuess, onGiveUp }: Props) {
  const secretSummary = data.championsById[targetId];
  if (!secretSummary) return null;
  const secret = buildRow(secretSummary);

  const iconOf = (id: string): string =>
    championImg(version, data.championsById[id]?.imageFull ?? `${id}.png`);

  // Full live DDragon roster — every champion is guessable.
  const options: SearchOption[] = data.champions.map((c) => ({
    id: c.id,
    name: c.name,
    iconUrl: championImg(version, c.imageFull),
  }));

  const rows = state.guessedIds
    .map((id) => data.championsById[id])
    .filter(Boolean)
    .map((s) => buildRow(s));

  return (
    <div className="flex flex-col gap-4">
      {!done && (
        <div className="flex flex-col gap-2">
          <EntitySearch
            options={options}
            excludeIds={new Set(state.guessedIds)}
            disabled={false}
            placeholder="Tape un champion…"
            onPick={(o) => onGuess(o.id, o.id === targetId)}
          />
          <GiveUpButton onClick={onGiveUp} />
        </div>
      )}

      {done && <RoundReveal name={secretSummary.name} iconUrl={iconOf(secretSummary.id)} solved={state.solved} />}

      {rows.length > 0 && (
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[554px]">
            <div className={`grid ${COLS} gap-1.5 px-1 pb-1.5`}>
              {HEADERS.map((h, i) => (
                <span
                  key={h}
                  className={`text-[10px] font-semibold uppercase tracking-wide text-ink-faint ${
                    i === 0 ? 'text-left' : 'text-center'
                  }`}
                >
                  {h}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              {rows.map((r) => (
                <div key={r.id} className={`grid ${COLS} gap-1.5`}>
                  <div className="flex h-14 items-center gap-2 rounded-tile bg-surface-2 px-2">
                    <EntityIcon src={iconOf(r.id)} name={r.name} size={34} />
                    <span className="font-display text-xs font-bold leading-tight text-ink">{r.name}</span>
                  </div>
                  <Tile value={r.gender} cell={eq(r.gender, secret.gender)} />
                  <Tile value={posLabel(r.positions)} cell={cmpPositions(r.positions, secret.positions)} />
                  <Tile value={r.species} cell={eq(r.species, secret.species)} />
                  <Tile value={r.resource} cell={eq(r.resource, secret.resource)} />
                  <Tile value={RANGE_FR[r.range]} cell={eq(r.range, secret.range)} />
                  <Tile value={r.region} cell={eq(r.region, secret.region)} />
                  <Tile value={r.year ?? UNKNOWN} cell={cmpYear(r.year, secret.year)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
