import { EntityIcon } from '@/components/EntityIcon';

interface RoundRevealProps {
  name: string;
  iconUrl: string;
  solved: boolean;
}

/** Shown once a round is finished — reveals the answer, win or lose. */
export function RoundReveal({ name, iconUrl, solved }: RoundRevealProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-card border px-4 py-3 ${
        solved ? 'border-match/40 bg-match/10' : 'border-border bg-surface-2'
      }`}
    >
      <EntityIcon src={iconUrl} name={name} size={44} className={solved ? 'ring-2 ring-match' : ''} />
      <div>
        <p className={`font-display font-extrabold ${solved ? 'text-match' : 'text-ink'}`}>
          {solved ? 'Trouvé !' : 'Raté'}
        </p>
        <p className="text-sm font-medium text-ink-soft">{name}</p>
      </div>
    </div>
  );
}
