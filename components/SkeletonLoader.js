function SkeletonBlock({ className = '', ...props }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} {...props} />;
}

export function SkeletonCard({ compact = false }) {
  return (
    <div className={`tac-panel rounded-2xl ${compact ? 'p-4' : 'p-5 md:p-6'}`} aria-hidden="true">
      <div className="flex items-start justify-between gap-4 mb-5">
        <SkeletonBlock className="w-11 h-11 rounded-xl" />
        <SkeletonBlock className="w-16 h-5 rounded-md" />
      </div>
      <SkeletonBlock className="h-4 w-2/3 rounded mb-3" />
      <SkeletonBlock className="h-3 w-full rounded mb-2" />
      <SkeletonBlock className="h-3 w-4/5 rounded" />
    </div>
  );
}

export function SkeletonText({ width = 'w-24', height = 'h-4' }) {
  return <SkeletonBlock className={`${height} ${width} rounded`} />;
}

export function SkeletonLine({ className = '' }) {
  return <SkeletonBlock className={`h-4 rounded ${className}`} />;
}

export function SkeletonAvatar({ size = 'w-10 h-10' }) {
  return <SkeletonBlock className={`${size} rounded-full`} />;
}

export function SkeletonTable({ rows = 6, cols = 4 }) {
  return (
    <div className="tac-panel rounded-2xl overflow-hidden" aria-hidden="true">
      <div className="grid gap-4 px-5 py-4 border-b border-gsrp-dark-border/50" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => <SkeletonBlock key={i} className="h-3 w-2/3 rounded" />)}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="grid gap-4 px-5 py-4 border-b border-gsrp-dark-border/30 last:border-0" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonBlock key={colIdx} className={`h-3 rounded ${colIdx === 0 ? 'w-4/5' : colIdx === cols - 1 ? 'w-1/2' : 'w-2/3'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ variant = 'cards', rows = 6, className = '' }) {
  return (
    <div className={`max-w-6xl mx-auto w-full animate-fade-in-up ${className}`} role="status" aria-label="Loading content">
      <div className="mb-8">
        <SkeletonBlock className="h-8 w-56 max-w-[70vw] rounded-lg mb-3" />
        <SkeletonBlock className="h-3.5 w-80 max-w-[82vw] rounded" />
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <SkeletonBlock className="h-10 w-56 rounded-xl" />
        <SkeletonBlock className="h-10 w-32 rounded-xl" />
        <SkeletonBlock className="h-10 w-24 rounded-xl" />
      </div>
      {variant === 'table' ? (
        <SkeletonTable rows={rows} />
      ) : variant === 'form' ? (
        <div className="tac-panel rounded-2xl p-5 md:p-7 space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <SkeletonBlock className="h-3 w-28 rounded mb-2.5" />
              <SkeletonBlock className={`w-full rounded-xl ${i === 3 ? 'h-28' : 'h-11'}`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}
      <span className="sr-only">Loading content</span>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto w-full" role="status" aria-label="Loading dashboard">
      <div className="mb-8">
        <SkeletonBlock className="h-9 w-80 max-w-[80vw] rounded-lg mb-3" />
        <SkeletonBlock className="h-3.5 w-52 rounded" />
      </div>
      <div className="flex items-center gap-3 mb-7">
        <SkeletonBlock className="h-3 w-28 rounded" />
        <div className="flex -space-x-2">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonAvatar key={i} size="w-8 h-8" />)}
        </div>
        <SkeletonBlock className="h-3 w-32 rounded" />
      </div>
      {Array.from({ length: 2 }).map((_, section) => (
        <div key={section} className="mb-10">
          <SkeletonBlock className="h-5 w-44 rounded mb-5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: section === 0 ? 5 : 3 }).map((_, i) => <SkeletonCard key={i} compact />)}
          </div>
        </div>
      ))}
      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}

export function AuthSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" role="status" aria-label="Loading sign in">
      <div className="card-glass w-full max-w-md rounded-2xl p-7 md:p-8">
        <div className="flex items-center gap-3 mb-8">
          <SkeletonBlock className="h-9 w-9 rounded-xl" />
          <SkeletonBlock className="h-4 w-48 rounded" />
        </div>
        <SkeletonBlock className="h-12 w-12 rounded-xl mb-7" />
        <SkeletonBlock className="h-7 w-52 rounded-md mb-3" />
        <SkeletonBlock className="h-3.5 w-full rounded mb-2" />
        <SkeletonBlock className="h-3.5 w-4/5 rounded mb-8" />
        <SkeletonBlock className="h-12 w-full rounded-xl" />
      </div>
      <span className="sr-only">Loading sign in</span>
    </div>
  );
}

export function MapSkeleton({ label = 'Loading live map' }) {
  return (
    <div className="map-skeleton absolute inset-0 z-[700] overflow-hidden" role="status" aria-label={label}>
      <div className="map-skeleton-grid" aria-hidden="true" />
      <div className="absolute left-3 top-3 flex items-center gap-2">
        <SkeletonBlock className="h-9 w-28 rounded-xl" />
      </div>
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-10 w-10 rounded-xl" />)}
      </div>
      {[
        ['18%', '28%'], ['34%', '61%'], ['58%', '38%'], ['73%', '69%'], ['82%', '22%'],
      ].map(([left, top], i) => (
        <SkeletonBlock key={i} className="absolute h-9 w-9 rounded-full" style={{ left, top }} />
      ))}
      <div className="absolute left-1/2 top-1/2 w-64 max-w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gsrp-dark-border/60 bg-gsrp-dark-card/80 p-4 shadow-tac-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex-1">
            <SkeletonBlock className="h-3.5 w-28 rounded mb-2" />
            <SkeletonBlock className="h-3 w-full rounded" />
          </div>
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div className="h-full flex flex-col" role="status" aria-label="Loading live panel">
      <div className="h-[58px] border-b border-gsrp-dark-border/50 bg-gsrp-dark-card/70 px-4 flex items-center justify-between">
        <SkeletonBlock className="h-4 w-48 rounded" />
        <SkeletonBlock className="h-9 w-24 rounded-lg" />
      </div>
      <div className="hidden md:grid md:grid-cols-[320px_1fr_340px] gap-2 flex-1 p-2 min-h-0">
        <div className="card-glass rounded-lg p-4 space-y-4">
          <SkeletonBlock className="h-10 w-full rounded-xl" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonAvatar size="w-9 h-9" />
              <div className="flex-1"><SkeletonBlock className="h-3 w-3/5 rounded mb-2" /><SkeletonBlock className="h-2.5 w-2/5 rounded" /></div>
            </div>
          ))}
        </div>
        <div className="card-glass rounded-lg relative overflow-hidden"><MapSkeleton /></div>
        <div className="card-glass rounded-lg p-4 space-y-4">
          <SkeletonBlock className="h-5 w-36 rounded" />
          <div className="grid grid-cols-2 gap-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-16 rounded-xl" />)}</div>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} className="h-11 w-full rounded-xl" />)}
        </div>
      </div>
      <div className="md:hidden relative flex-1"><MapSkeleton /></div>
      <span className="sr-only">Loading live panel</span>
    </div>
  );
}

export { SkeletonBlock };
