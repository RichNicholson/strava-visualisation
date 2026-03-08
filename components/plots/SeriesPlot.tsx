'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import * as d3 from 'd3'
import type { StravaActivity, Athlete } from '../../lib/strava/types'
import type { ActivityStream } from '../../lib/strava/types'
import { generateAgeGradeContour, computeAgeGrade, ageAtDate } from '../../lib/wma/ageGrade'

type YMetric = 'cumulative' | 'rolling' | 'heartrate' | 'elevation' | 'cadence'
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
  cumulative: 'Cumulative Pace (min/km)',
  rolling: 'Rolling Pace (min/km)',
  heartrate: 'Heart Rate (bpm)',
  elevation: 'Elevation (m)',
  cadence: 'Cadence (spm)',
}

const ROLLING_WINDOW_M = 500   // rolling pace = mean pace of last 500 m
const MAX_PACE_S_PER_KM = 900  // 15 min/km - clamp y-axis slow end
const MIN_PACE_S_PER_KM = 120  // 2 min/km - discard GPS-jump artefacts

/**
 * Rolling pace: at each point, find the point ~500 m behind and compute
 * (time[i] − time[j]) / (distance[i] − distance[j]) × 1000  →  s/km.
 * For early points where < 500 m has elapsed, use all data from the start.
 */
function rollingPace(time: number[], distance: number[], windowM: number): number[] {
  const result: number[] = new Array(time.length)
  let left = 0

  for (let i = 0; i < distance.length; i++) {
    const target = distance[i] - windowM
    while (left < i && distance[left + 1] <= target) left++

    const dd = distance[i] - distance[left]
    const dt = time[i] - time[left]
    const pace = dd > 0 ? (dt / dd) * 1000 : NaN
    result[i] = pace >= MIN_PACE_S_PER_KM ? pace : NaN
  }

  return result
}

/**
 * Build a moving-time array: only accumulates elapsed time for intervals
 * where the runner is covering ground at a realistic pace.
 */
function buildMovingTime(time: number[], distance: number[]): number[] {
  const result: number[] = new Array(time.length)
  let mt = 0
  for (let i = 0; i < distance.length; i++) {
    if (i > 0) {
      const dd = distance[i] - distance[i - 1]
      const dt = time[i] - time[i - 1]
      if (dd > 0 && dt > 0 && (dd / dt) >= (1000 / MAX_PACE_S_PER_KM)) {
        mt += dt
      }
    }
    result[i] = mt
  }
  return result
}

export function SeriesPlot({ activities, streams, loading, colorMap, athlete }: SeriesPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef({ isDragging: false, distanceMetres: 0 })
  const yScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null)
  const xScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null)
  const [yMetric, setYMetric] = useState<YMetric>('rolling')
  const [xMetric, setXMetric] = useState<XMetric>('distance')
  const [timeMode, setTimeMode] = useState<'moving' | 'elapsed'>('moving')
  const [yViewDomain, setYViewDomain] = useState<[number, number] | null>(null)
  const [showWMA, setShowWMA] = useState(true)
  // null = not yet seeded; on first render with pace data we compute from median
  const [ageGradePercent, setAgeGradePercent] = useState<number | null>(null)

  // Compute median age grade from the current activities whenever athlete / activities change
  const medianAgeGrade = useMemo(() => {
    if (!athlete?.sex || (!athlete?.dateOfBirth && !athlete?.age)) return null
    const grades = activities
      .filter((a) => a.distance && a.moving_time)
      .map((a) => {
        const age = athlete.dateOfBirth
          ? ageAtDate(athlete.dateOfBirth, a.start_date)
          : athlete.age!
        return computeAgeGrade(athlete.sex!, age, a.distance, a.moving_time)
      })
      .filter((g): g is number => g !== null && isFinite(g))
    if (grades.length === 0) return null
    const sorted = [...grades].sort((a, b) => a - b)
    return Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10
  }, [activities, athlete])

  // Seed ageGradePercent from median whenever it hasn't been set yet (or median changes enough)
  useEffect(() => {
    if (medianAgeGrade !== null) setAgeGradePercent(medianAgeGrade)
  }, [medianAgeGrade])

  // Reset y-axis lock when the metric or time mode changes
  useEffect(() => { setYViewDomain(null) }, [yMetric, xMetric, timeMode])

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    if (activities.length === 0 || streams.size === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight
    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = height - MARGIN.top - MARGIN.bottom
    svg.attr('width', width).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    // Build series data
    interface Point { x: number; y: number }
    const series: { id: number; name: string; points: Point[]; oobPoints: Point[] }[] = []

    for (const activity of activities) {
      const stream = streams.get(activity.id)
      if (!stream) continue

      const xData = xMetric === 'distance' ? stream.distance : stream.time
      let yData: number[] | undefined

      switch (yMetric) {
        case 'cumulative': {
          // Cumulative: time / distance at each point → s/km
          const t = stream.time && stream.distance
            ? (timeMode === 'moving' ? buildMovingTime(stream.time, stream.distance) : stream.time)
            : undefined
          yData = t && stream.distance
            ? stream.distance.map((d, i) => d > 0 ? (t[i] / d) * 1000 : NaN)
            : undefined
          break
        }
        case 'rolling': {
          // Rolling: mean pace over last 500 m
          const t = stream.time && stream.distance
            ? (timeMode === 'moving' ? buildMovingTime(stream.time, stream.distance) : stream.time)
            : undefined
          yData = t && stream.distance
            ? rollingPace(t, stream.distance, ROLLING_WINDOW_M)
            : undefined
          break
        }
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

      // Skip the first 500 m for both pace modes (noisy GPS startup)
      const distData = stream.distance ?? xData
      const minDist = (yMetric === 'rolling' || yMetric === 'cumulative') ? ROLLING_WINDOW_M : 0

      const points: Point[] = xData
        .map((x, i) => ({ x, y: yData![i], dist: distData[i] }))
        .filter((p) => isFinite(p.x) && isFinite(p.y) && p.dist >= minDist)
        .map(({ x, y }) => ({ x, y }))

      // Separate out-of-bounds points (pace slower than 15 min/km)
      const isPaceMetric = yMetric === 'cumulative' || yMetric === 'rolling'
      const oobPoints: Point[] = isPaceMetric
        ? xData
            .map((x, i) => ({ x, y: yData![i], dist: distData[i] }))
            .filter((p) => isFinite(p.x) && isFinite(p.y) && p.dist >= minDist && p.y > MAX_PACE_S_PER_KM)
            .map(({ x }) => ({ x, y: MAX_PACE_S_PER_KM }))
        : []

      if (points.length > 0) {
        series.push({ id: activity.id, name: activity.name, points, oobPoints })
      }
    }

    if (series.length === 0) return

    const allX = series.flatMap((s) => s.points.map((p) => p.x))
    const allY = series.flatMap((s) => s.points.map((p) => p.y))

    const xScale = d3.scaleLinear().domain([0, d3.max(allX)!]).range([0, innerW])
    const isPace = yMetric === 'cumulative' || yMetric === 'rolling'

    // Compute natural y-domain from current data, then lock it (or use locked value)
    const clampedMaxY = isPace ? Math.min(d3.max(allY)!, MAX_PACE_S_PER_KM) : d3.max(allY)!
    const naturalYDomain: [number, number] = isPace
      ? [clampedMaxY * 1.02, d3.min(allY)! * 0.98]
      : [d3.min(allY)! * 0.95, clampedMaxY * 1.05]
    const effectiveYDomain = yViewDomain ?? naturalYDomain
    if (!yViewDomain) setYViewDomain(naturalYDomain)
    const yScale = d3.scaleLinear().domain(effectiveYDomain).range([innerH, 0]).nice()
    
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

    // Line generator — no smoothing, straight point-to-point
    // For pace metrics, skip points that exceed the boundary (leave gap; × markers shown instead)
    const isPaceMetric = yMetric === 'cumulative' || yMetric === 'rolling'
    const lineGen = d3
      .line<Point>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .defined((d) => isFinite(d.y) && (!isPaceMetric || d.y <= MAX_PACE_S_PER_KM))
      .curve(d3.curveLinear)

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
          g.selectAll<SVGPathElement, unknown>('path.series-line')
            .attr('opacity', 0.15)
          g.selectAll<SVGPathElement, unknown>(`path.series-line[data-id="${s.id}"]`)
            .attr('opacity', 1)
            .attr('stroke-width', 2.5)
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

      // Out-of-bounds × markers clamped to slow-pace boundary
      const S = 4  // half-size of the × arms
      const crossPath = `M${-S},${-S}L${S},${S}M${-S},${S}L${S},${-S}`
      s.oobPoints.forEach((p) => {
        const cx = xScale(p.x)
        const cy = yScale(MAX_PACE_S_PER_KM)
        const mk = g.append('g').attr('transform', `translate(${cx},${cy})`)
        mk.append('path').attr('d', crossPath)
          .attr('stroke', color).attr('stroke-width', 1.5).attr('fill', 'none').attr('opacity', 0.8)
      })

      // Visible line
      g.append('path')
        .datum(s.points)
        .attr('class', 'series-line')
        .attr('data-id', String(s.id))
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.8)
        .style('pointer-events', 'none')
        .attr('d', lineGen)
    })

    // ── WMA contour (pace × distance only) ──────────────────────────────────
    const effectiveGrade = ageGradePercent ?? medianAgeGrade ?? 70
    if (
      (yMetric === 'cumulative' || yMetric === 'rolling') &&
      xMetric === 'distance' &&
      showWMA &&
      (athlete?.dateOfBirth || athlete?.age) &&
      athlete?.sex
    ) {
      const contourAge = athlete.dateOfBirth
        ? ageAtDate(athlete.dateOfBirth, new Date().toISOString())
        : athlete.age!
      const contourDistances = d3.range(
        Math.max(100, xScale.domain()[0]),
        xScale.domain()[1],
        500
      )
      const contourData = generateAgeGradeContour(
        athlete.sex,
        contourAge,
        effectiveGrade,
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
          .text(`${effectiveGrade.toFixed(1)}% age grade`)
      }
    }
  }, [activities, streams, yMetric, xMetric, colorMap, showWMA, ageGradePercent, medianAgeGrade, athlete, timeMode, yViewDomain])

  // Handle drag events for WMA contour
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStateRef.current.isDragging) return
      if (!svgRef.current || !yScaleRef.current) return
      if ((!athlete?.age && !athlete?.dateOfBirth) || !athlete?.sex) return

      const rect = svgRef.current.getBoundingClientRect()
      const cursorY = event.clientY - rect.top - MARGIN.top

      // Invert cursor Y to get the pace (s/km) under the cursor
      const paceSecsPerKm = yScaleRef.current.invert(cursorY)
      if (!isFinite(paceSecsPerKm) || paceSecsPerKm <= 0) return

      // Convert pace to time at the fixed grab distance, then compute age grade directly
      const distMetres = dragStateRef.current.distanceMetres
      const timeSeconds = (paceSecsPerKm * distMetres) / 1000
      const dragAge = athlete.dateOfBirth
        ? ageAtDate(athlete.dateOfBirth, new Date().toISOString())
        : athlete.age!
      const grade = computeAgeGrade(athlete.sex, dragAge, distMetres, timeSeconds)

      // Snap to 0.1% and clamp to valid range
      let newPercent = Math.round(grade * 10) / 10
      newPercent = Math.max(1, Math.min(100, newPercent))

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
          {(['cumulative', 'rolling', 'heartrate', 'elevation', 'cadence'] as YMetric[]).map((m) => (
            <button
              key={m}
              onClick={() => setYMetric(m)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                yMetric === m ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 text-gray-500'
              }`}
            >
              {m === 'cumulative' ? 'cumul.' : m === 'rolling' ? 'rolling' : m}
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
        <button
          onClick={() => setYViewDomain(null)}
          className="px-2 py-0.5 text-xs rounded border border-gray-300 text-gray-500 transition-colors hover:border-orange-400 hover:text-orange-500"
        >
          Auto-scale
        </button>
          {(yMetric === 'cumulative' || yMetric === 'rolling') && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">time:</span>
              {(['moving', 'elapsed'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setTimeMode(m)}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    timeMode === m ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          {(yMetric === 'cumulative' || yMetric === 'rolling') && xMetric === 'distance' && athlete?.age && athlete?.sex && (
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
                  {(ageGradePercent ?? medianAgeGrade ?? 70).toFixed(1)}% — drag the line to adjust
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
