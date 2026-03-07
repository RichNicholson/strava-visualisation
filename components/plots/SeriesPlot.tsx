'use client'

import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import type { StravaActivity, Athlete } from '../../lib/strava/types'
import type { ActivityStream } from '../../lib/strava/types'
import { generateAgeGradeContour, computeAgeGrade } from '../../lib/wma/ageGrade'

type YMetric = 'pace' | 'heartrate' | 'elevation' | 'cadence'
type XMetric = 'distance' | 'time'

interface SeriesPlotProps {
  activities: StravaActivity[]
  streams: Map<number, ActivityStream>
  loading?: boolean
  colorMap?: Map<number, string>
  athlete?: Athlete | null
}

const MARGIN = { top: 20, right: 30, bottom: 50, left: 70 }

const Y_LABELS: Record<YMetric, string> = {
  pace: 'Cumulative Pace (min/km)',
  heartrate: 'Heart Rate (bpm)',
  elevation: 'Elevation (m)',
  cadence: 'Cadence (spm)',
}

function rollingAvg(data: number[], windowSize: number): number[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2))
    const end = Math.min(data.length, start + windowSize)
    const slice = data.slice(start, end)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

export function SeriesPlot({ activities, streams, loading, colorMap, athlete }: SeriesPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef({ isDragging: false, distanceMetres: 0 })
  const yScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null)
  const xScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null)
  const [yMetric, setYMetric] = useState<YMetric>('pace')
  const [xMetric, setXMetric] = useState<XMetric>('distance')
  const [showWMA, setShowWMA] = useState(true)
  const [ageGradePercent, setAgeGradePercent] = useState(65)
  const lineMode = 'rolling' as const
  const rollingWindow = 50
  const autoscale = true

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return
    if (activities.length === 0 || streams.size === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight
    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = height - MARGIN.top - MARGIN.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    // Build series data
    interface Point { x: number; y: number }
    const series: { id: number; name: string; points: Point[] }[] = []

    for (const activity of activities) {
      const stream = streams.get(activity.id)
      if (!stream) continue

      const xData = xMetric === 'distance' ? stream.distance : stream.time
      let yData: number[] | undefined

      switch (yMetric) {
        case 'pace':
          // Cumulative pace: elapsed time / distance covered, in s/km
          yData =
            stream.time && stream.distance
              ? stream.distance.map((d, i) =>
                  d > 0 ? (stream.time![i] / d) * 1000 : NaN
                )
              : undefined
          break
        case 'heartrate':
          yData = stream.heartrate
          break
        case 'elevation':
          yData = stream.altitude
          break
        case 'cadence':
          yData = stream.cadence
          break
      }

      if (!yData || !xData || xData.length === 0) continue

      const smoothed = lineMode === 'rolling' ? rollingAvg(yData, rollingWindow) : yData
      const points: Point[] = xData
        .map((x, i) => ({ x, y: smoothed[i] }))
        .filter((p) => isFinite(p.x) && isFinite(p.y))

      if (points.length > 0) {
        series.push({ id: activity.id, name: activity.name, points })
      }
    }

    if (series.length === 0) return

    const allX = series.flatMap((s) => s.points.map((p) => p.x))
    const allY = series.flatMap((s) => s.points.map((p) => p.y))

    const xScale = d3.scaleLinear().domain([0, d3.max(allX)!]).range([0, innerW])
    const isPace = yMetric === 'pace'

    // Pace: invert (faster = lower number = top). When autoscale is off, pin top to 0.
    const yDomain: [number, number] = isPace
      ? autoscale
        ? [d3.max(allY)! * 1.02, d3.min(allY)! * 0.98]
        : [d3.max(allY)!, 0]
      : [d3.min(allY)! * 0.95, d3.max(allY)! * 1.05]
    const yScale = d3.scaleLinear().domain(yDomain).range([innerH, 0]).nice()
    
    // Store scales for drag handler
    yScaleRef.current = yScale
    xScaleRef.current = xScale

    const colorScale = d3.scaleOrdinal(d3.schemeTableau10)

    // Vertical grid lines
    g.append('g')
      .attr('class', 'grid-x')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(16).tickSize(-innerH).tickFormat(() => ''))
      .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', '#e5e7eb') })

    // Horizontal grid lines
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(12).tickSize(-innerW).tickFormat(() => ''))
      .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', '#e5e7eb') })

    // Axes
    const xLabel = xMetric === 'distance' ? 'Distance (km)' : 'Time'
    const xFmtFn = xMetric === 'distance'
      ? (d: d3.NumberValue) => `${(Number(d) / 1000).toFixed(1)}`
      : (d: d3.NumberValue) => {
          const totalMins = Math.round(Number(d) / 60)
          const h = Math.floor(totalMins / 60)
          const m = totalMins % 60
          return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}m`
        }
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(16).tickFormat(xFmtFn as never))
      .call((ax) =>
        ax.append('text')
          .attr('x', innerW / 2).attr('y', 40)
          .attr('fill', '#6b7280').attr('text-anchor', 'middle').attr('font-size', '12px')
          .text(xLabel)
      )

    const yFmtFn = isPace
      ? (d: d3.NumberValue) => {
          const s = Number(d)
          return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
        }
      : undefined

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(12).tickFormat(yFmtFn as never))
      .call((ax) =>
        ax.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -innerH / 2).attr('y', -55)
          .attr('fill', '#6b7280').attr('text-anchor', 'middle').attr('font-size', '12px')
          .text(Y_LABELS[yMetric])
      )

    // Lines
    const lineGen = d3
      .line<Point>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .defined((d) => isFinite(d.y))
      .curve(d3.curveCatmullRom)

    const tooltip = tooltipRef.current

    series.forEach((s, i) => {
      const color = colorMap?.get(s.id) ?? colorScale(String(i))

      // Invisible wide path for easier hover hit area
      g.append('path')
        .datum(s.points)
        .attr('fill', 'none')
        .attr('stroke', 'transparent')
        .attr('stroke-width', 12)
        .attr('d', lineGen)
        .style('cursor', 'pointer')
        .on('mouseenter', function (event) {
          // Dim all other lines
          g.selectAll<SVGPathElement, unknown>('path.series-line')
            .attr('opacity', 0.2)
            .attr('stroke-width', 1.5)
          // Highlight this line
          g.selectAll<SVGPathElement, Point[]>('path.series-line')
            .filter((_, j) => j === i)
            .attr('opacity', 1)
            .attr('stroke-width', 3)
          // Show tooltip
          if (tooltip) {
            tooltip.style.display = 'block'
            tooltip.style.borderColor = color
            tooltip.textContent = s.name
          }
        })
        .on('mousemove', function (event) {
          if (tooltip) {
            const [mx, my] = d3.pointer(event, containerRef.current!)
            tooltip.style.left = `${mx + 14}px`
            tooltip.style.top = `${my - 10}px`
          }
        })
        .on('mouseleave', function () {
          g.selectAll<SVGPathElement, unknown>('path.series-line')
            .attr('opacity', 0.8)
            .attr('stroke-width', 1.5)
          if (tooltip) tooltip.style.display = 'none'
        })

      // Visible line
      g.append('path')
        .datum(s.points)
        .attr('class', 'series-line')
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.8)
        .style('pointer-events', 'none')
        .attr('d', lineGen)
    })

    // ── WMA contour (pace × distance only) ──────────────────────────────────
    if (
      yMetric === 'pace' &&
      xMetric === 'distance' &&
      showWMA &&
      athlete?.age &&
      athlete?.sex
    ) {
      const contourDistances = d3.range(
        Math.max(100, xScale.domain()[0]),
        xScale.domain()[1],
        500
      )
      const contourData = generateAgeGradeContour(
        athlete.sex,
        athlete.age,
        ageGradePercent,
        contourDistances
      )

      const contourLine = d3
        .line<{ distance: number; pace: number }>()
        .x((d) => xScale(d.distance))
        .y((d) => yScale(d.pace))

      const contourPath = g.append('path')
        .datum(contourData)
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.7)
        .attr('class', 'contour-line')
        .attr('d', contourLine)

      // Wider hit area for easier dragging
      g.append('path')
        .datum(contourData)
        .attr('fill', 'none')
        .attr('stroke', 'transparent')
        .attr('stroke-width', 16)
        .attr('class', 'contour-hit-area')
        .attr('d', contourLine)
        .style('cursor', 'ns-resize')
        .on('mousedown', function (event) {
          if (!svgRef.current || !xScaleRef.current) return
          const rect = svgRef.current.getBoundingClientRect()
          const cursorX = event.clientX - rect.left - MARGIN.left
          dragStateRef.current = {
            isDragging: true,
            distanceMetres: xScaleRef.current.invert(cursorX),
          }
          contourPath.attr('opacity', 1).attr('stroke-width', 3)
          event.preventDefault()
        })

      // Label
      const midIdx = Math.floor(contourData.length / 2)
      if (contourData[midIdx]) {
        g.append('text')
          .attr('x', xScale(contourData[midIdx].distance))
          .attr('y', yScale(contourData[midIdx].pace) - 8)
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px')
          .attr('fill', '#10b981')
          .attr('font-weight', '600')
          .text(`${ageGradePercent}% age grade`)
      }
    }
  }, [activities, streams, yMetric, xMetric, colorMap, showWMA, ageGradePercent, athlete])

  // Handle drag events for WMA contour
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStateRef.current.isDragging) return
      if (!svgRef.current || !yScaleRef.current) return
      if (!athlete?.age || !athlete?.sex) return

      const rect = svgRef.current.getBoundingClientRect()
      const cursorY = event.clientY - rect.top - MARGIN.top

      // Invert cursor Y to get the pace (s/km) under the cursor
      const paceSecsPerKm = yScaleRef.current.invert(cursorY)
      if (!isFinite(paceSecsPerKm) || paceSecsPerKm <= 0) return

      // Convert pace to time at the fixed grab distance, then compute age grade directly
      const distMetres = dragStateRef.current.distanceMetres
      const timeSeconds = (paceSecsPerKm * distMetres) / 1000
      const grade = computeAgeGrade(athlete.sex, athlete.age, distMetres, timeSeconds)

      // Snap to 0.1% and clamp
      let newPercent = Math.round(grade * 10) / 10
      newPercent = Math.max(50, Math.min(100, newPercent))

      setAgeGradePercent(newPercent)
    }

    const handleMouseUp = () => {
      if (dragStateRef.current.isDragging) {
        dragStateRef.current.isDragging = false
        // Restore visual state
        const svg = d3.select(svgRef.current)
        svg.selectAll('path.contour-line')
          .attr('opacity', 0.7)
          .attr('stroke-width', 2)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [athlete])

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 p-3 border-b border-gray-100 items-center">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Y:</span>
          {(['pace', 'heartrate', 'elevation', 'cadence'] as YMetric[]).map((m) => (
            <button
              key={m}
              onClick={() => setYMetric(m)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                yMetric === m ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 text-gray-500'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">X:</span>
          {(['distance', 'time'] as XMetric[]).map((m) => (
            <button
              key={m}
              onClick={() => setXMetric(m)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                xMetric === m ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 text-gray-500'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {yMetric === 'pace' && xMetric === 'distance' && athlete?.age && athlete?.sex && (
          <>
            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                id="wma-toggle"
                checked={showWMA}
                onChange={(e) => setShowWMA(e.target.checked)}
                className="accent-green-500"
              />
              <label htmlFor="wma-toggle" className="text-xs text-gray-500 cursor-pointer">
                WMA contour
              </label>
            </div>
            {showWMA && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">
                  {ageGradePercent}% — drag the line to adjust
                </span>
              </div>
            )}
          </>
        )}

      </div>

      {/* Plot */}
      <div ref={containerRef} className="flex-1 relative min-h-0">
        {/* Hover tooltip */}
        <div
          ref={tooltipRef}
          style={{ display: 'none' }}
          className="pointer-events-none absolute z-20 bg-white text-xs text-gray-700 font-medium px-2 py-1 rounded shadow border"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
            <span className="text-gray-500 text-sm">Loading stream data...</span>
          </div>
        )}
        <svg ref={svgRef} className="w-full h-full" />
        {activities.length > 0 && streams.size === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            Stream data not yet loaded — sync activities first
          </div>
        )}
        {activities.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            No activities match the current filters
          </div>
        )}
      </div>
    </div>
  )
}
