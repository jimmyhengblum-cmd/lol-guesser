import { useMemo, useState } from 'react';

import { EntityIcon } from './EntityIcon';

export interface SearchOption {
  id: string;
  name: string;
  /** Alternate searchable name (e.g. the English name) — matched but not shown. */
  altName?: string;
  iconUrl: string;
  sub?: string;
}

interface EntitySearchProps {
  options: SearchOption[];
  disabled: boolean;
  placeholder: string;
  excludeIds?: Set<string>;
  /** Hide option thumbnails — used for blurred-image rounds where the icon
   * would otherwise give the answer away from the dropdown. */
  hideIcons?: boolean;
  onPick: (option: SearchOption) => void;
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-ink-faint">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function EntitySearch({ options, disabled, placeholder, excludeIds, hideIcons, onPick }: EntitySearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = options.filter((o) => !excludeIds?.has(o.id));
    // Empty query → show a default browsable list; typing filters it.
    // Matches the display name OR the alternate (English) name.
    return q
      ? base.filter(
          (o) => o.name.toLowerCase().includes(q) || o.altName?.toLowerCase().includes(q),
        )
      : base;
  }, [query, options, excludeIds]);

  const submit = (option?: SearchOption) => {
    const choice = option ?? matches[0];
    if (!choice) return;
    onPick(choice);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2 rounded-pill border border-border bg-surface px-4 py-3 shadow-sm focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15 sm:gap-3 sm:px-5"
      >
        <SearchIcon />
        <input
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || matches.length === 0}
          className="shrink-0 rounded-pill bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink transition-opacity disabled:opacity-40"
        >
          Valider
        </button>
      </form>

      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-card border border-border bg-surface shadow-xl">
          {matches.map((o) => (
            <li key={o.id} className="border-b border-border last:border-0">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  submit(o);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 sm:px-5"
              >
                {!hideIcons && <EntityIcon src={o.iconUrl} name={o.name} size={34} />}
                <span className="font-display text-base font-semibold text-ink">{o.name}</span>
                {o.sub && <span className="ml-auto text-xs font-medium text-ink-faint">{o.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
