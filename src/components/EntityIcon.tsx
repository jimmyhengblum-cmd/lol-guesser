import { useState } from 'react';

interface EntityIconProps {
  src: string;
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Image with a colored monogram fallback when the asset can't load (offline). */
export function EntityIcon({ src, name, size = 40, className = '', style }: EntityIconProps) {
  const [failed, setFailed] = useState(false);
  const dims = { width: size, height: size, ...style };

  if (failed || !src) {
    return (
      <span
        aria-label={name}
        className={`flex shrink-0 items-center justify-center rounded-tile bg-primary-soft font-display font-bold text-primary ${className}`}
        style={dims}
      >
        {name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      style={dims}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-tile object-cover ${className}`}
    />
  );
}
