export function SkeletonCard() {
  return (
    <div className="card space-y-3 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 bg-brand-blue-strong rounded-lg w-3/4" />
        <div className="h-4 bg-brand-blue-strong rounded w-1/2" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 bg-brand-blue-strong rounded-full w-20" />
        <div className="h-6 bg-brand-blue-strong rounded-full w-24" />
      </div>
      <div className="h-5 bg-brand-blue-strong rounded-lg w-1/3" />
      <div className="h-4 bg-brand-blue-strong rounded w-1/2" />
      <div className="flex justify-between pt-2">
        <div className="h-4 bg-brand-blue-strong rounded w-1/4" />
        <div className="h-8 bg-brand-blue-strong rounded-lg w-24" />
      </div>
    </div>
  );
}

export function SkeletonCardGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-brand-blue-strong rounded animate-pulse"
          style={{ width: `${100 - (i === lines - 1 ? 30 : 0)}%` }}
        />
      ))}
    </div>
  );
}
