'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import * as d3 from 'd3'
import type { StravaActivity } from '../../lib/strava/types'
import type { UnitSystem } from '../../lib/format'
import { formatPace, formatDistance, paceToDisplayUnit, paceUnit } from '../../lib/format'
import { computeRollingBest } from '../../lib/analysis/longitudinal'

const MARGIN = { top: 20, right: 30, bottom: 50, left: 70 }

// Orange from TABLEAU10 for the rolling best curve
const CURVE_COLOR = '#f28e2c'
const DOT_COLOR = '#9ca3af'  // gray-400

interface LongitudinalPlotProps {
  activities: StravaActivity[]
  units: UnitSystem
}

const DISTANCE_OPTIONS = [
  { label: '5k', value: 5000 },
  { label: '10k', value: 10000 },
  { label: 'HM', value: 21097 },
  { label: 'M', value: 42195 },
] as const

const WINDOW_OPTIONS = [
  { label: '3m', value: 3 },
  { label: '6m', value: 6 },
  { label: '12m', value: 12 },
  { label: 'All', value: 0 },
] as const

export function LongitudinalPlot({ activities, units }: LongitudinalPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [targetDistance, setTargetDistance] = useState(5000)
  const [windowMonths, setWindowMonths] = useState(6)
  const [paceType, setPaceType] = useState<'moving' | 'elapsed'>('moving')
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    activity: StravaActivity
    rollingBestPace: number
  } | null>(null)

  const getSpeed = useMemo(
    () => paceType === 'elapsed'
      ? (a: StravaActivity) => a.distance / a.elapsed_time
      : (a: StravaActivity) => a.average_speed,
    [paceType],
  )

  const rollingData = useMemo(
    () => computeRollingBest(activities, targetDistance, windowMonths, getSpeed),
    [activities, targetDistance, windowMonths, getSpeed],
  )

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return
    if (rollingData.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight
    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = height - MARGIN.top - MARGIN.bottom

    svg.attr('width', width).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    // Convert pace to display units for scale
    const paceValues = rollingData.map((d) => paceToDisplayUnit(d.rollingBestPace, units))
    const dotPaceValues = rollingData.map((d) =>
      paceToDisplayUnit(1000 / d.activity.average_speed, units)
    )
    const allPaceValues = [...paceValues, ...dotPaceValues]

    const dates = rollingData.map((d) => new Date(d.activity.start_date))

    const xScale = d3.scaleTime()
      .domain(d3.extent(dates) as [Date, Date])
      .range([0, innerW])
      .nice()

    // Y-axis inverted: faster pace (lower s/unit) at top
    const yMin = d3.min(allPaceValues)!
    const yMax = d3.max(allPaceValues)!
    const yPad = (yMax - yMin) * 0.1
    const yScale = d3.scaleLinear()
      .domain([yMax + yPad, yMin - yPad])
      .range([innerH, 0])
      .nice()

    // Grid lines
    g.append('g')
      .attr('class', 'grid-x')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(8).tickSize(-innerH).tickFormat(() => ''))
      .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', '#e5e7eb') })

    g.append('g')
      .attr('class', 'grid-y')
      .call(d3.axisLeft(yScale).ticks(8).tickSize(-innerW).tickFormat(() => ''))
      .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', '#e5e7eb') })

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(8))
      .call((ax) =>
        ax.append('text')
          .attr('x', innerW / 2).attr('y', 40)
          .attr('fill', '#6b7280').attr('text-anchor', 'middle').attr('font-size', '12px')
          .text('Date')
      )

    // Y axis — pace format
    const yLabel = `Pace (${paceUnit(units)})`
    const paceFmt = (d: d3.NumberValue) => {
      const s = Number(d)
      return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
    }

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(8).tickFormat(paceFmt as never))
      .call((ax) =>
        ax.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -innerH / 2).attr('y', -55)
          .attr('fill', '#6b7280').attr('text-anchor', 'middle').attr('font-size', '12px')
          .text(yLabel)
      )

    // Individual qualifying run dots
    g.selectAll('circle.dot')
      .data(rollingData)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => xScale(new Date(d.activity.start_date)))
      .attr('cy', (d) => yScale(paceToDisplayUnit(1000 / getSpeed(d.activity), units)))
      .attr('r', 4)
      .attr('fill', DOT_COLOR)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.7)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d) {
        d3.select(this).attr('opacity', 1).attr('r', 6)
        const rect = svgRef.current!.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          activity: d.activity,
          rollingBestPace: d.rollingBestPace,
        })
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 0.7).attr('r', 4)
        setTooltip(null)
      })

    // Rolling best step curve
    const lineGen = d3.line<typeof rollingData[number]>()
      .x((d) => xScale(new Date(d.activity.start_date)))
      .y((d) => yScale(paceToDisplayUnit(d.rollingBestPace, units)))
      .curve(d3.curveLinear)

    g.append('path')
      .datum(rollingData)
      .attr('fill', 'none')
      .attr('stroke', CURVE_COLOR)
      .attr('stroke-width', 2.5)
      .attr('d', lineGen)

    // Rolling best dots — only for runs that actually set the rolling best
    const definingIds = new Set(rollingData.map((d) => d.definingActivity.id))
    const bestSetters = rollingData.filter((d) => definingIds.has(d.activity.id))
    g.selectAll('circle.best')
      .data(bestSetters)
      .join('circle')
      .attr('class', 'best')
      .attr('cx', (d) => xScale(new Date(d.activity.start_date)))
      .attr('cy', (d) => yScale(paceToDisplayUnit(d.rollingBestPace, units)))
      .attr('r', 5)
      .attr('fill', CURVE_COLOR)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.9)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, d) {
        d3.select(this).attr('r', 7)
        const rect = svgRef.current!.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          activity: d.activity,
          rollingBestPace: d.rollingBestPace,
        })
      })
      .on('mouseleave', function () {
        d3.select(this).attr('r', 5)
        setTooltip(null)
      })

  }, [rollingData, units, getSpeed])

  return (
    <div className="flex flex-col h-full select-none">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap p-3 border-b border-gray-100">
        {/* Target distance */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Distance</span>
          <div className="flex rounded border border-gray-200 overflow-hidden">
            {DISTANCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTargetDistance(opt.value)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  targetDistance === opt.value
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rolling window */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Window</span>
          <div className="flex rounded border border-gray-200 overflow-hidden">
            {WINDOW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setWindowMonths(opt.value)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  windowMonths === opt.value
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pace type toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Pace</span>
          <div className="flex rounded border border-gray-200 overflow-hidden">
            {(['moving', 'elapsed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPaceType(t)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                  paceType === t ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-orange-400" />
            rolling best
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" />
            qualifying run
          </span>
        </div>
      </div>

      {/* Plot */}
      <div ref={containerRef} className="flex-1 relative min-h-0">
        <svg ref={svgRef} className="w-full h-full" />

        {tooltip && (
          <div
            className="absolute pointer-events-none bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm z-10"
            style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
          >
            <p className="font-semibold text-gray-800 truncate max-w-48">{tooltip.activity.name}</p>
            <p className="text-gray-500">
              {new Date(tooltip.activity.start_date).toLocaleDateString()}
            </p>
            <p className="text-gray-600">{formatDistance(tooltip.activity.distance, units)}</p>
            <p className="text-gray-600">
              {formatPace(1000 / getSpeed(tooltip.activity), units)} {paceType === 'elapsed' ? 'elapsed' : 'moving'} avg
            </p>
            <p className="text-orange-600 text-xs mt-1">
              Rolling best: {formatPace(tooltip.rollingBestPace, units)}
            </p>
          </div>
        )}

        {rollingData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            No qualifying runs found for this distance
          </div>
        )}
      </div>
    </div>
  )
}
