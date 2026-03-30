'use client';

export function DashboardStatSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-[22px] bg-gray-100 shadow-md h-[120px] animate-pulse">
      <div className="w-10 h-10 bg-gray-300 rounded-lg mb-2"></div>
      <div className="w-16 h-8 bg-gray-300 rounded mb-1"></div>
      <div className="w-20 h-4 bg-gray-300 rounded"></div>
    </div>
  );
}

export function CallCardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm mb-3 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="h-6 w-20 bg-gray-300 rounded-full"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-gray-200 rounded"></div>
        <div className="h-5 w-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="bg-gray-50 pb-24 animate-pulse">
      {/* Header */}
      <div className="bg-white border-b p-4 mb-4">
        <div className="h-8 bg-gray-300 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-48"></div>
      </div>

      {/* Content sections */}
      <div className="px-4 space-y-4">
        {/* Section 1 */}
        <div className="bg-white rounded-lg p-4 border space-y-3">
          <div className="h-5 bg-gray-300 rounded w-24"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>

        {/* Section 2 */}
        <div className="bg-white rounded-lg p-4 border space-y-3">
          <div className="h-5 bg-gray-300 rounded w-24"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>

        {/* Section 3 */}
        <div className="bg-white rounded-lg p-4 border space-y-3">
          <div className="h-5 bg-gray-300 rounded w-24"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <div className="h-12 bg-gray-300 rounded-lg"></div>
          <div className="h-12 bg-gray-300 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 px-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <DashboardStatSkeleton key={i} />
      ))}
    </div>
  );
}

export function CallListSkeleton() {
  return (
    <div className="px-4 space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <CallCardSkeleton key={i} />
      ))}
    </div>
  );
}
