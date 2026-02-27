export function SkeletonCard() {
  return (
    <div className="flex bg-gray-800 rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className="w-1.5 shrink-0 bg-gray-700" />
      <div className="flex-1 px-4 py-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-2/5" />
            <div className="h-3 bg-gray-700 rounded w-1/4" />
          </div>
          <div className="space-y-1 text-right">
            <div className="h-4 bg-gray-700 rounded w-10" />
            <div className="h-3 bg-gray-700 rounded w-10" />
          </div>
        </div>
        <div className="mt-3 flex gap-3">
          <div className="h-3 bg-gray-700 rounded w-12" />
          <div className="h-3 bg-gray-700 rounded w-24" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonWeek() {
  return (
    <div className="px-4 pt-5 flex flex-col gap-3">
      {/* Fake day header */}
      <div className="h-3 bg-gray-800 rounded w-40 animate-pulse" />
      <SkeletonCard />
      <SkeletonCard />
      <div className="h-3 bg-gray-800 rounded w-32 animate-pulse mt-2" />
      <SkeletonCard />
    </div>
  )
}

export function EmptyWeek() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="text-4xl mb-4 select-none">📭</div>
      <p className="text-gray-300 font-semibold text-lg">Brak zajęć</p>
      <p className="text-gray-500 text-sm mt-1">W tym tygodniu nie ma żadnych zajęć.</p>
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="text-4xl mb-4 select-none">⚠️</div>
      <p className="text-gray-300 font-semibold text-lg">Nie można pobrać planu</p>
      <p className="text-gray-500 text-sm mt-1 mb-6">{message}</p>
      <button
        onClick={onRetry}
        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                   text-white text-sm font-semibold rounded-full transition-colors"
      >
        Spróbuj ponownie
      </button>
    </div>
  )
}
