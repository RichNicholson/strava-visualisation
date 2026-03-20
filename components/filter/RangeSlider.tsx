'use client'

import { useState, useRef, useCallback } from 'react'

interface RangeSliderProps {
  min: number
  max: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  formatValue?: (v: number) => string
  parseValue?: (raw: string) => number | null
  step?: number
}

export function RangeSlider({
  min,
  max,
  value,
  onChange,
  formatValue = (v) => String(Math.round(v)),
  parseValue,
  step = 1,
}: RangeSliderProps) {
  const [, setDragging] = useState<'min' | 'max' | null>(null)
  const [minText, setMinText] = useState<string | null>(null)
  const [maxText, setMaxText] = useState<string | null>(null)
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

  function commitMin(raw: string) {
    if (!parseValue) return
    const v = parseValue(raw)
    if (v === null) { setMinText(null); return }
    const clamped = Math.min(Math.max(v, min), value[1] - step)
    onChange([clamped, value[1]])
    setMinText(null)
  }

  function commitMax(raw: string) {
    if (!parseValue) return
    const v = parseValue(raw)
    if (v === null) { setMaxText(null); return }
    const clamped = Math.max(Math.min(v, max), value[0] + step)
    onChange([value[0], clamped])
    setMaxText(null)
  }

  const minPct = getPercent(value[0])
  const maxPct = getPercent(value[1])

  return (
    <div className="w-full" ref={rangeRef}>
      <div className="relative h-6 flex items-center">
        {/* Track */}
        <div className="absolute w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded" />
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
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        {parseValue ? (
          <input
            type="text"
            value={minText ?? formatValue(value[0])}
            onChange={(e) => setMinText(e.target.value)}
            onFocus={(e) => { setMinText(formatValue(value[0])); e.target.select() }}
            onBlur={(e) => commitMin(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitMin((e.target as HTMLInputElement).value) }}
            className="w-20 bg-transparent border-b border-gray-300 dark:border-gray-500 focus:border-orange-400 outline-none text-gray-500 dark:text-gray-400 text-xs"
          />
        ) : (
          <span>{formatValue(value[0])}</span>
        )}
        {parseValue ? (
          <input
            type="text"
            value={maxText ?? formatValue(value[1])}
            onChange={(e) => setMaxText(e.target.value)}
            onFocus={(e) => { setMaxText(formatValue(value[1])); e.target.select() }}
            onBlur={(e) => commitMax(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitMax((e.target as HTMLInputElement).value) }}
            className="w-20 text-right bg-transparent border-b border-gray-300 dark:border-gray-500 focus:border-orange-400 outline-none text-gray-500 dark:text-gray-400 text-xs"
          />
        ) : (
          <span>{formatValue(value[1])}</span>
        )}
      </div>
    </div>
  )
}
