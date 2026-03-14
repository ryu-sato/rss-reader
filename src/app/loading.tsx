export default function Loading() {
  return (
    <main className="py-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-20 bg-muted rounded animate-pulse mt-1" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="py-3 px-2 space-y-2">
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </main>
  )
}
