interface SkeletonProps {
  className?: string
}

/** Base skeleton pulse element. Pass className to control width/height/shape. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-black/[0.06] rounded ${className}`}
      aria-hidden="true"
    />
  )
}

/** A full card-shaped skeleton for loading states. */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl bg-app-surface border border-rule p-5 space-y-3" aria-hidden="true">
      <Skeleton className="h-4 w-2/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}

/** Grid of card skeletons — useful for page-level loading states. */
export function SkeletonGrid({ count = 6, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={lines} />
      ))}
    </div>
  )
}

export default Skeleton
