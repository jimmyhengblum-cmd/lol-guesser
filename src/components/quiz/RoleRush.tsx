import { useEffect, useMemo, useRef, useState } from 'react';

import { championImg } from '@/ddragon/ddragon';
import type { DdragonData } from '@/ddragon/types';
import type { Position } from '@/quiz/championMeta';
import {
  ROLE_RUSH_DEFAULT_DURATION_MIN,
  ROLE_RUSH_DURATIONS_MIN,
  ROLE_RUSH_LABELS,
  ROLE_RUSH_ROLES,
  championsForRole,
  normalizeGuess,
} from '@/quiz/roleRush';
import { EntityIcon } from '@/components/EntityIcon';

type Phase = 'pick' | 'playing' | 'paused' | 'ended';

const TICK_MS = 200;

function formatClock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function DurationPicker({
  minutes,
  onChange,
}: {
  minutes: number;
  onChange: (m: number) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {ROLE_RUSH_DURATIONS_MIN.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded-pill border px-3 py-1.5 text-xs font-bold transition-colors ${
            m === minutes
              ? 'border-primary bg-primary text-primary-ink'
              : 'border-border bg-surface text-ink-soft hover:text-ink'
          }`}
        >
          {m} min
        </button>
      ))}
    </div>
  );
}

function RolePicker({
  minutes,
  onChangeMinutes,
  onPick,
}: {
  minutes: number;
  onChangeMinutes: (m: number) => void;
  onPick: (role: Position) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <p className="text-sm text-ink-soft">Choisis un rôle : trouve tous les champions qui le jouent avant la fin du chrono.</p>
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Durée</p>
        <DurationPicker minutes={minutes} onChange={onChangeMinutes} />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {ROLE_RUSH_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onPick(role)}
            className="rounded-pill border border-border bg-surface px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            {ROLE_RUSH_LABELS[role]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RoleRush({ data, version }: { data: DdragonData; version: string }) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [role, setRole] = useState<Position | null>(null);
  const [minutes, setMinutes] = useState(ROLE_RUSH_DEFAULT_DURATION_MIN);
  const [remainingMs, setRemainingMs] = useState(0);
  const [foundIds, setFoundIds] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const targets = useMemo(() => (role ? championsForRole(data, role) : []), [data, role]);
  const foundSet = useMemo(() => new Set(foundIds), [foundIds]);
  const allFound = role != null && targets.length > 0 && foundIds.length === targets.length;

  // Countdown — only ticks while actively playing, so pause just stops the interval.
  useEffect(() => {
    if (phase !== 'playing') return;
    const iv = window.setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - TICK_MS));
    }, TICK_MS);
    return () => window.clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    if (phase === 'playing' && (remainingMs <= 0 || allFound)) setPhase('ended');
  }, [phase, remainingMs, allFound]);

  const beginRun = (r: Position) => {
    setRole(r);
    setFoundIds([]);
    setInput('');
    setRemainingMs(minutes * 60_000);
    setPhase('playing');
  };

  const reset = () => {
    if (!role) return;
    setFoundIds([]);
    setInput('');
    setRemainingMs(minutes * 60_000);
    setPhase('playing');
  };

  const changeRole = () => {
    setPhase('pick');
    setRole(null);
    setFoundIds([]);
    setInput('');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phase !== 'playing') return;
    const q = normalizeGuess(input);
    if (!q) return;
    const hit = targets.find((c) => normalizeGuess(c.name) === q);
    if (hit && !foundSet.has(hit.id)) {
      setFoundIds((prev) => [hit.id, ...prev]);
      setFlash('ok');
    } else {
      setFlash('bad');
    }
    setInput('');
    window.setTimeout(() => setFlash(null), 300);
    inputRef.current?.focus();
  };

  if (phase === 'pick' || !role) {
    return <RolePicker minutes={minutes} onChangeMinutes={setMinutes} onPick={beginRun} />;
  }

  const missed = targets.filter((c) => !foundSet.has(c.id));
  const playing = phase === 'playing';
  const paused = phase === 'paused';
  const ended = phase === 'ended';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-lg font-extrabold text-ink">
          {ROLE_RUSH_LABELS[role]} · {foundIds.length}/{targets.length}
        </p>
        <div className="flex items-center gap-2">
          <p className={`font-display text-lg font-extrabold tabular-nums ${remainingMs < 30_000 ? 'text-red-600' : 'text-ink'}`}>
            {formatClock(remainingMs)}
          </p>
          {!ended && (
            <button
              type="button"
              onClick={() => setPhase(playing ? 'paused' : 'playing')}
              aria-label={playing ? 'Mettre en pause' : 'Reprendre'}
              className="flex size-8 shrink-0 items-center justify-center rounded-pill border border-border bg-surface text-ink-soft transition-colors hover:border-primary hover:text-primary"
            >
              {playing ? '⏸' : '▶'}
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            aria-label="Réinitialiser la manche"
            title="Réinitialiser la manche"
            className="flex size-8 shrink-0 items-center justify-center rounded-pill border border-border bg-surface text-ink-soft transition-colors hover:border-primary hover:text-primary"
          >
            ↺
          </button>
        </div>
      </div>

      {playing && (
        <form
          onSubmit={submit}
          className={`flex items-center gap-2 rounded-pill border bg-surface px-4 py-3 shadow-sm transition-colors sm:gap-3 sm:px-5 ${
            flash === 'ok' ? 'border-match' : flash === 'bad' ? 'border-red-500' : 'border-border focus-within:border-primary'
          }`}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            autoComplete="off"
            placeholder="Tape un nom de champion…"
            aria-label="Tape un nom de champion"
            className="w-full bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="shrink-0 rounded-pill bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink transition-opacity disabled:opacity-40"
          >
            Valider
          </button>
        </form>
      )}

      {paused && (
        <div className="flex items-center justify-center rounded-pill border border-border bg-surface-2 px-4 py-3 text-sm font-semibold text-ink-faint">
          En pause
        </div>
      )}

      {ended && (
        <p className="text-center text-sm font-semibold text-ink-soft">
          {allFound ? 'Bravo, tous trouvés ! 🎉' : 'Temps écoulé.'}
        </p>
      )}

      {foundIds.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {targets
            .filter((c) => foundSet.has(c.id))
            .map((c) => (
              <li key={c.id} className="flex items-center gap-1.5 rounded-tile bg-match/15 px-2 py-1.5">
                <EntityIcon src={championImg(version, c.imageFull)} name={c.name} size={24} />
                <span className="text-sm font-semibold text-ink">{c.name}</span>
              </li>
            ))}
        </ul>
      )}

      {ended && missed.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Ratés</p>
          <ul className="flex flex-wrap gap-2">
            {missed.map((c) => (
              <li key={c.id} className="flex items-center gap-1.5 rounded-tile bg-surface-2 px-2 py-1.5">
                <EntityIcon src={championImg(version, c.imageFull)} name={c.name} size={24} />
                <span className="text-sm font-semibold text-ink-soft">{c.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ended && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-pill border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary"
          >
            Rejouer
          </button>
          <button
            type="button"
            onClick={changeRole}
            className="rounded-pill border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary"
          >
            Changer de rôle
          </button>
        </div>
      )}
    </div>
  );
}
