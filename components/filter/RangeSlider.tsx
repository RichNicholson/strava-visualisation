'use client'

import { useState, useRef, useCallback } from 'react'

interface RangeSliderProps {
  min: number
  max: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  formatValue?: (v: number) => string
  step?: number
}

export function RangeSlider({
  min,
  max,
  value,
  onChange,
  formatValue = (v) => String(Math.round(v)),
  step = 1,
}: RangeSliderProps) {
  const [, setDragging] = useState<'min' | 'max' | null>(null)
  const rangeRef = useRef<HTMLDivElement>(null)

  const getPercent = (v: number) => ((v - min) / (max - min)) * 100

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Math.min(Number(e.target.value), value[1] - step)
      onChange([v, value[1]])
    },
    [value, onChange, step]
  )

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Math.max(Number(e.target.value), value[0] + step)
      onChange([value[0], v])
    },
    [value, onChange, step]
  )

  const minPct = getPercent(value[0])
  const maxPct = getPercent(value[1])

  return (
    <div className="w-full" ref={rangeRef}>
      <div className="relative h-6 flex items-center">
        {/* Track */}
        <div className="absolute w-full h-1.5 bg-gray-200 rounded" />
        {/* Active range */}
        <div
          className="absolute h-1.5 bg-orange-500 rounded"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={handleMinChange}
          onMouseDown={() => setDragging('min')}
          onMouseUp={() => setDragging(null)}
          className="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow"
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          onChange={handleMaxChange}
          onMouseDown={() => setDragging('max')}
          onMouseUp={() => setDragging(null)}
          className="absolute w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow"
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{formatValue(value[0])}</span>
        <span>{formatValue(value[1])}</span>
      </div>
    </div>
  )
}
