interface Props {
  onClick: () => void;
}

/**
 * Prominent "give up this round" action. Full-width + comfortable touch target
 * on mobile, compact and left-aligned from `sm` up.
 */
export function GiveUpButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-pill border border-border bg-surface-2 px-4 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-red-500 hover:bg-red-500/10 hover:text-red-600 active:scale-[0.99] sm:w-auto sm:self-start sm:py-2.5"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 21V4M5 4.5h10.2c1 0 1.5 1.1.9 1.9L15 9l2.1 2.6c.6.8.1 1.9-.9 1.9H5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Abandonner la manche
    </button>
  );
}
