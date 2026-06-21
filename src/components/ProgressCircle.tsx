'use client'

interface Props {
  done: number
  total: number
  voters: number
}

export default function ProgressCircle({ done, total, voters }: Props) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const r = 56
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-4 md:gap-6 bg-white border border-amber-200 rounded-xl p-4 md:p-5 shadow-sm">
      <div className="relative w-20 h-20 md:w-24 md:h-24 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64" cy="64" r={r}
            fill="none"
            stroke="#f5f0eb"
            strokeWidth="10"
          />
          <circle
            cx="64" cy="64" r={r}
            fill="none"
            stroke="#d97706"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg md:text-xl font-bold text-amber-700">{pct}%</span>
        </div>
      </div>

      <div className="flex-1 min-w-0 items-center justify-center text-center">
        <p className="text-xs md:text-sm font-medium text-gray-800">
          Fetching polling stations...
        </p>
        <p className="text-xl md:text-2xl font-bold text-amber-700 mt-0.5 tabular-nums">
          {done} <span className="text-sm md:text-base font-normal text-gray-400">/ {total}</span>
        </p>
        <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">
          {voters.toLocaleString()} voters found so far
        </p>
      </div>
    </div>
  )
}
