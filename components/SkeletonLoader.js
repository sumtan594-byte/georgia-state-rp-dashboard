export function SkeletonCard() {
  return (
    <div className="bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-2xl p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl skeleton" />
        <div className="flex-1">
          <div className="h-4 w-3/4 skeleton rounded mb-2" />
          <div className="h-3 w-1/2 skeleton rounded" />
        </div>
      </div>
      <div className="h-3 w-full skeleton rounded mb-2" />
      <div className="h-3 w-2/3 skeleton rounded" />
    </div>
  );
}

export function SkeletonText({ width = 'w-24', height = 'h-4' }) {
  return <div className={`${height} ${width} skeleton rounded`} />;
}

export function SkeletonLine({ className = '' }) {
  return <div className={`h-4 skeleton rounded ${className}`} />;
}

export function SkeletonAvatar({ size = 'w-10 h-10' }) {
  return <div className={`${size} skeleton rounded-full`} />;
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1 h-4 skeleton rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div key={colIdx} className="flex-1 h-3 skeleton rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}
