'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import * as d3 from 'd3'
import type { StravaActivity, Athlete, Channel, SeriesMetric } from '../../lib/strava/types'
import type { ActivityStream } from '../../lib/strava/types'
import { generateAgeGradeContour, computeAgeGrade, ageAtDate } from '../../lib/wma/ageGrade'
import { computeDeltaSeries } from '../../lib/analysis/timeDelta'
import { computeBestSplitCurve } from '../../lib/analysis/bestSplit'
import { metresToDisplayUnit, paceToDisplayUnit, distanceUnit, paceUnit, type UnitSystem } from '../../lib/format'

// Keep YMetric as a local alias for SeriesMetric so all existing references continue to work
type YMetric = SeriesMetric
type XMetric = 'distance' | 'time'

interface SeriesPlotProps {
  activities: StravaActivity[]
  streams: Map<number, ActivityStream>
  loading?: boolean
  colorMap?: Map<number, string>
  athlete?: Athlete | null
  baselineId?: number | null
  /** When provided, switches to multi-channel rendering instead of the single-metric dropdown. */
  channels?: Channel[]
  onChannelsChange?: (channels: Channel[]) => void
  /** Fired with (activityId, streamIndex) on crosshair hover; (null, null) on leave. */
  onHoverIndex?: (activityId: number | null, streamIndex: number | null) => void
  units?: UnitSystem
}

const MARGIN = { top: 20, right: 30, bottom: 50, left: 70 }

const Y_LABELS: Record<YMetric, string> = {
  cumulative: 'Pace (min/km)',
  rolling: 'Rolling Pace (min/km)',
  raw: 'Raw Pace (min/km)',
  heartrate: 'Heart Rate (bpm)',
  elevation: 'Elevation (m)',
  cadence: 'Cadence (spm)',
  delta: 'Time delta',
  bestsplit: 'Best split pace',
}

const METRIC_SHORT: Record<YMetric, string> = {
  cumulative: 'Pace (cumul.)',
  rolling: 'Pace (rolling)',
  raw: 'Pace (raw)',
  heartrate: 'Heart Rate',
  elevation: 'Elevation',
  cadence: 'Cadence',
  delta: 'Time delta',
  bestsplit: 'Best split',
}

// Per-channel axis colours (orange, blue, purple, green)
const CHANNEL_PALETTE = ['#f97316', '#3b82f6', '#a855f7', '#10b981']

const ROLLING_WINDOW_S = 120   // rolling pace window: 2 minutes
const RAW_WINDOW_S     = 60    // standalone raw pace window: 60 seconds
const ROLLING_SKIP_M   = 200   // skip first 200 m — noisy GPS startup
const MAX_PACE_S_PER_KM = 900  // 15 min/km - clamp y-axis slow end
const MIN_PACE_S_PER_KM = 120  // 2 min/km - discard GPS-jump artefacts

/**
 * Rolling pace: at each point, find the sample ~windowS seconds behind and compute
 * (time[i] − time[j]) / (distance[i] − distance[j]) × 1000  →  s/km.
 * Returns NaN until a full windowS of data has elapsed.
 */
function rollingPace(time: number[], distance: number[], windowS: number): number[] {
  const result: number[] = new Array(time.length)
  let left = 0

  for (let i = 0; i < time.length; i++) {
    const target = time[i] - windowS
    while (left < i && time[left + 1] <= target) left++

    // Require a full window before plotting
    if (time[i] - time[0] < windowS) {
      result[i] = NaN
      continue
    }

    const dd = distance[i] - distance[left]
    const dt = time[i] - time[left]
    const pace = dd > 0 ? (dt / dd) * 1000 : NaN
    result[i] = pace >= MIN_PACE_S_PER_KM ? pace : NaN
  }

  return result
}

/** Format seconds as m:ss or h:mm:ss */
function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.round(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Speed (m/s) below which a sample is considered stationary when
 * velocity_smooth is available.  0.5 m/s ≈ a very slow shuffle — anything
 * below that is a genuine stop.
 */
const MOVING_SPEED_THRESHOLD = 0.5

/**
 * Fallback gap threshold (seconds) used when no velocity stream is present.
 * A value of 60 s safely handles both 1-second and smart-recording (Garmin
 * event-based) streams: genuine watch pauses are at least a minute long,
 * whereas smart-recording gaps between active movement samples are typically
 * 5–30 s and must not be excluded.
 */
const PAUSE_GAP_FALLBACK_S = 60

/**
 * Build a moving-time array from the raw time stream.
 *
 * Priority:
 * 1. moving[] (Strava MovingStream boolean) — the authoritative source;
 *    Strava itself uses this to compute moving time.
 * 2. velocitySmooth[] — heuristic fallback: sample is moving when speed
 *    exceeds MOVING_SPEED_THRESHOLD (0.5 m/s).  Works well for both 1-second
 *    and smart-recording (event-based Garmin) streams.
 * 3. Gap threshold — last resort when neither stream is present: gaps
 *    ≤ PAUSE_GAP_FALLBACK_S are counted as moving.
 *
 * Elapsed time is just stream.time directly (seconds since activity start,
 * including any pause gaps).
 */
function buildMovingTime(time: number[], moving?: boolean[], velocitySmooth?: number[]): number[] {
  const result: number[] = new Array(time.length)
  let mt = 0
  result[0] = 0
  for (let i = 1; i < time.length; i++) {
    const dt = time[i] - time[i - 1]
    if (dt > 0) {
      if (moving && moving.length > 0) {
        if (moving[i]) mt += dt
      } else if (velocitySmooth && velocitySmooth.length > 0) {
        if (velocitySmooth[i] > MOVING_SPEED_THRESHOLD) mt += dt
      } else {
        if (dt <= PAUSE_GAP_FALLBACK_S) mt += dt
      }
    }
    result[i] = mt
  }
  return result
}

/** Extract y-values for a single metric from one stream. */
function computeYDataForChannel(
  metric: YMetric,
  stream: ActivityStream,
  timeMode: 'moving' | 'elapsed',
): number[] | undefined {
  switch (metric) {
    case 'cumulative': {
      const t = stream.time && stream.distance
        ? (timeMode === 'moving' ? buildMovingTime(stream.time, stream.moving, stream.velocity_smooth) : stream.time)
        : undefined
      return t && stream.distance
        ? stream.distance.map((d, i) => d > 0 ? (t[i] / d) * 1000 : NaN)
        : undefined
    }
    case 'rolling': {
      if (!stream.time || !stream.distance) return undefined
      const t = timeMode === 'moving'
        ? buildMovingTime(stream.time, stream.moving, stream.velocity_smooth) : stream.time
      return rollingPace(t, stream.distance, ROLLING_WINDOW_S)
    }
    case 'raw': {
      if (!stream.distance || !stream.time) return undefined
      const t = timeMode === 'moving'
        ? buildMovingTime(stream.time, stream.moving, stream.velocity_smooth) : stream.time
      return rollingPace(t, stream.distance, RAW_WINDOW_S)
    }
    case 'heartrate': return stream.heartrate
    case 'elevation': return stream.altitude
    case 'cadence': return stream.cadence
    case 'delta': return undefined  // handled by dedicated delta rendering path
    case 'bestsplit': return undefined  // handled by dedicated bestsplit rendering path
  }
}

function orderChannelsForStack(channels: Channel[]): Channel[] {
  return [
    ...channels.filter(ch => ch.side === 'left'),
    ...channels.filter(ch => ch.side === 'right'),
  ]
}

export function SeriesPlot({ activities, streams, loading, colorMap, athlete, baselineId, channels, onChannelsChange, onHoverIndex, units = 'metric' }: SeriesPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef({ isDragging: false, distanceMetres: 0 })
  const yScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null)
  const xScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null)
  // Keep latest onHoverIndex in a ref so the D3 effect closure always calls the current version
  const onHoverIndexRef = useRef(onHoverIndex)
  useEffect(() => { onHoverIndexRef.current = onHoverIndex }, [onHoverIndex])
  const [yMetric, setYMetric] = useState<YMetric>('cumulative')
  const [xMetric, setXMetric] = useState<XMetric>('distance')
  const [timeMode, setTimeMode] = useState<'moving' | 'elapsed'>('moving')
  const [yViewDomain, setYViewDomain] = useState<[number, number] | null>(null)
  const [yScaleMode, setYScaleMode] = useState<'auto' | '1min' | '2min'>('auto')
  const [showWMA, setShowWMA] = useState(true)
  // null = not yet seeded; on first render with pace data we compute from median
  const [ageGradePercent, setAgeGradePercent] = useState<number | null>(null)
  const [editingChannelIdx, setEditingChannelIdx] = useState<number | null>(null)
  const axisDragRef = useRef<{ chIdx: number; edge: 'top' | 'bottom'; startY: number; startPercent: number; innerH: number } | null>(null)
  /** Track whether channels are currently stacked or overlaid */
  const channelLayout = useMemo(() => {
    if (!channels || channels.length <= 1) return 'overlay' as const
    const allOverlap = channels.every(ch => ch.yTop === 0 && ch.yBottom === 100)
    if (allOverlap) return 'overlay' as const
    return 'stack' as const
  }, [channels])

  // Restore series axis selections after OAuth redirect
  useEffect(() => {
    const y = sessionStorage.getItem('series:yMetric') as YMetric | null
    const x = sessionStorage.getItem('series:xMetric') as XMetric | null
    const t = sessionStorage.getItem('series:timeMode') as 'moving' | 'elapsed' | null
    if (y) setYMetric(y)
    if (x) setXMetric(x)
    if (t) setTimeMode(t)
  }, [])

  // Persist series axis selections to sessionStorage
  useEffect(() => { sessionStorage.setItem('series:yMetric', yMetric) }, [yMetric])
  useEffect(() => { sessionStorage.setItem('series:xMetric', xMetric) }, [xMetric])
  useEffect(() => { sessionStorage.setItem('series:timeMode', timeMode) }, [timeMode])
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

  // Reset locked domain whenever the axes or time mode change — stale domains from
  // a previous metric would otherwise produce completely wrong scales.
  useEffect(() => {
    setYViewDomain(null)
  }, [yMetric, xMetric, timeMode])

  // Hide editing panel when channels array changes
  useEffect(() => { setEditingChannelIdx(null) }, [channels])

  // Determine whether we're in multi-channel mode
  const multiChannel = channels && channels.length > 0
  // Delta mode is only active in single-metric mode; in multi-channel mode delta is
  // rendered as a normal channel inside the per-channel forEach loop.
  const isDeltaMode = !multiChannel && yMetric === 'delta'
  // Best split mode is only active in single-metric mode
  const isBestSplitMode = !multiChannel && yMetric === 'bestsplit'

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    if (activities.length === 0) return
    // In delta mode we still want to render (even if streams=0) to show the baseline prompt
    if (!isDeltaMode && streams.size === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight
    svg.attr('width', width).attr('height', height)

    // ── Helper: build moving-time or elapsed-time array from a stream ──────
    function getEffectiveTime(stream: ActivityStream): number[] | undefined {
      if (!stream.time) return undefined
      return timeMode === 'moving'
        ? buildMovingTime(stream.time, stream.moving, stream.velocity_smooth)
        : stream.time
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Delta rendering path — runs before multi-channel to honour isDeltaMode
    // regardless of the current channel configuration
    // ═══════════════════════════════════════════════════════════════════════
    if (isDeltaMode) {
      const innerW = width - MARGIN.left - MARGIN.right
      const innerH = height - MARGIN.top - MARGIN.bottom

      svg.append('defs')
        .append('clipPath').attr('id', 'series-clip')
        .append('rect').attr('width', innerW).attr('height', innerH)

      const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

      const baselineStream = baselineId != null ? streams.get(baselineId) : undefined

      if (!baselineStream || !baselineId) {
        // Prompt — no baseline designated yet
        g.append('text')
          .attr('x', innerW / 2).attr('y', innerH / 2)
          .attr('text-anchor', 'middle').attr('fill', '#6b7280').attr('font-size', '13px')
          .text('Δ delta mode — select a baseline in the roster ★')
        return
      }

      // Build baseline arrays
      let baselineXArr: number[]
      let baselineYArr: number[]
      if (xMetric === 'distance') {
        baselineXArr = baselineStream.distance ?? []
        baselineYArr = getEffectiveTime(baselineStream) ?? []
      } else {
        baselineXArr = getEffectiveTime(baselineStream) ?? []
        baselineYArr = baselineStream.distance ?? []
      }

      if (baselineXArr.length < 2) {
        g.append('text')
          .attr('x', innerW / 2).attr('y', innerH / 2)
          .attr('text-anchor', 'middle').attr('fill', '#6b7280').attr('font-size', '13px')
          .text('Baseline stream has insufficient data')
        return
      }

      // Build delta series for each non-baseline activity
      const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
      const tooltip = tooltipRef.current

      const deltaSeriesData: { id: number; name: string; points: { x: number; delta: number }[] }[] = []

      for (const activity of activities) {
        if (activity.id === baselineId) continue
        const stream = streams.get(activity.id)
        if (!stream) continue

        let compXArr: number[]
        let compYArr: number[]
        if (xMetric === 'distance') {
          compXArr = stream.distance ?? []
          compYArr = getEffectiveTime(stream) ?? []
        } else {
          compXArr = getEffectiveTime(stream) ?? []
          compYArr = stream.distance ?? []
        }

        const rawPoints = computeDeltaSeries(baselineXArr, baselineYArr, compXArr, compYArr)
        // Negate for x=distance so faster (less time) plots above zero
        const points = xMetric === 'distance'
          ? rawPoints.map(p => ({ ...p, delta: -p.delta }))
          : rawPoints
        if (points.length > 0) {
          deltaSeriesData.push({ id: activity.id, name: activity.name, points })
        }
      }

      // Scales
      const xMax = d3.max(baselineXArr) ?? 10000
      const xDeltaScale = d3.scaleLinear().domain([0, xMax]).range([0, innerW])
      xScaleRef.current = xDeltaScale

      const allDeltas = deltaSeriesData.flatMap((s) => s.points.map((p) => p.delta))
      const minDelta = allDeltas.length > 0 ? d3.min(allDeltas)! : -60
      const maxDelta = allDeltas.length > 0 ? d3.max(allDeltas)! : 60
      const pad = Math.max(5, (maxDelta - minDelta) * 0.1)
      const yDeltaScale = d3.scaleLinear()
        .domain([minDelta - pad, maxDelta + pad])
        .range([innerH, 0])
        .nice()
      yScaleRef.current = yDeltaScale

      // Grid
      g.append('g')
        .attr('class', 'grid-x')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xDeltaScale).ticks(16).tickSize(-innerH).tickFormat(() => ''))
        .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', '#e5e7eb') })
      g.append('g')
        .call(d3.axisLeft(yDeltaScale).ticks(8).tickSize(-innerW).tickFormat(() => ''))
        .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', '#e5e7eb') })

      // Zero reference line
      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', yDeltaScale(0)).attr('y2', yDeltaScale(0))
        .attr('stroke', '#9ca3af').attr('stroke-dasharray', '4,4').attr('stroke-width', 1.5)

      // X-axis (delta mode): reuse same unit-aware formatter as main rendering
      const xFmtDelta = xMetric === 'distance'
        ? (d: d3.NumberValue) => `${metresToDisplayUnit(Number(d), units).toFixed(1)}`
        : (d: d3.NumberValue) => {
            const totalMins = Math.round(Number(d) / 60)
            const h = Math.floor(totalMins / 60)
            const m = totalMins % 60
            return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}m`
          }
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xDeltaScale).ticks(16).tickFormat(xFmtDelta as never))
        .call((ax) =>
          ax.append('text')
            .attr('x', innerW / 2).attr('y', 40)
            .attr('fill', '#6b7280').attr('text-anchor', 'middle').attr('font-size', '12px')
            .text(xMetric === 'distance' ? `Distance (${distanceUnit(units)})` : 'Time')
        )
      const yDeltaLabel = xMetric === 'distance' ? 'Time delta (s)' : 'Distance delta (m)'
      g.append('g')
        .call(d3.axisLeft(yDeltaScale).ticks(8))
        .call((ax) =>
          ax.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerH / 2).attr('y', -55)
            .attr('fill', '#6b7280').attr('text-anchor', 'middle').attr('font-size', '12px')
            .text(yDeltaLabel)
        )

      // Delta lines
      const plotGroup = g.append('g').attr('clip-path', 'url(#series-clip)')
      const deltaLineGen = d3.line<{ x: number; delta: number }>()
        .x((d) => xDeltaScale(d.x))
        .y((d) => yDeltaScale(d.delta))
        .defined((d) => isFinite(d.delta))
        .curve(d3.curveLinear)

      deltaSeriesData.forEach((s, i) => {
        const color = colorMap?.get(s.id) ?? colorScale(String(i))

        // Hit area for hover
        plotGroup.append('path')
          .datum(s.points)
          .attr('fill', 'none')
          .attr('stroke', 'transparent')
          .attr('stroke-width', 12)
          .attr('d', deltaLineGen)
          .style('cursor', 'pointer')
          .on('mouseenter', function () {
            if (tooltip) {
              tooltip.style.display = 'block'
              tooltip.style.borderColor = color
              tooltip.textContent = s.name
            }
          })
          .on('mousemove', function (event) {
            if (!tooltip) return
            const [mx, my] = d3.pointer(event, containerRef.current!)
            const xVal = xDeltaScale.invert(mx - MARGIN.left)
            if (s.points.length > 0) {
              const closest = s.points.reduce((best, p) =>
                Math.abs(p.x - xVal) < Math.abs(best.x - xVal) ? p : best
              )
              const sign = closest.delta >= 0 ? '+' : ''
              const unit = xMetric === 'distance' ? 's' : 'm'
              tooltip.textContent = `${s.name}: ${sign}${closest.delta.toFixed(0)} ${unit}`
            }
            tooltip.style.left = `${mx + 14}px`
            tooltip.style.top = `${my - 10}px`
          })
          .on('mouseleave', function () {
            if (tooltip) tooltip.style.display = 'none'
          })

        // Visible delta line
        plotGroup.append('path')
          .datum(s.points)
          .attr('class', 'series-line')
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.8)
          .style('pointer-events', 'none')
          .attr('d', deltaLineGen)
      })

      return
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Best split rendering path
    // ═══════════════════════════════════════════════════════════════════════
    if (isBestSplitMode) {
      const innerW = width - MARGIN.left - MARGIN.right
      const innerH = height - MARGIN.top - MARGIN.bottom

      svg.append('defs')
        .append('clipPath').attr('id', 'series-clip')
        .append('rect').attr('width', innerW).attr('height', innerH)

      const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

      // Compute best split curves for each rostered run
      const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
      const tooltip = tooltipRef.current

      const splitSeries: { id: number; name: string; color: string; points: { windowDist: number; bestPace: number }[] }[] = []

      for (const [idx, activity] of activities.entries()) {
        const stream = streams.get(activity.id)
        if (!stream || !stream.distance || !stream.time) continue
        const points = computeBestSplitCurve(stream.distance, stream.time)
        if (points.length > 0) {
          const color = colorMap?.get(activity.id) ?? colorScale(String(idx))
          splitSeries.push({ id: activity.id, name: activity.name, color, points })
        }
      }

      if (splitSeries.length === 0) {
        g.append('text')
          .attr('x', innerW / 2).attr('y', innerH / 2)
          .attr('text-anchor', 'middle').attr('fill', '#6b7280').attr('font-size', '13px')
          .text('No stream data available for best split computation')
        return
      }

      // X-axis: window size up to the shortest run distance
      const shortestDist = Math.min(...splitSeries.map(s => s.points[s.points.length - 1].windowDist))
      const xScale = d3.scaleLinear().domain([0, shortestDist]).range([0, innerW])
      xScaleRef.current = xScale

      // Y-axis: pace (inverted: faster = lower value = higher on chart)
      const allPaces = splitSeries.flatMap(s => s.points.map(p => p.bestPace))
      const minPace = d3.min(allPaces)!
      const maxPace = d3.max(allPaces)!
      const yScale = d3.scaleLinear()
        .domain([maxPace * 1.02, minPace * 0.98])
        .range([innerH, 0])
        .nice()
      yScaleRef.current = yScale

      // Grid
      g.append('g')
        .attr('class', 'grid-x')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(16).tickSize(-innerH).tickFormat(() => ''))
        .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', '#e5e7eb') })
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(12).tickSize(-innerW).tickFormat(() => ''))
        .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', '#e5e7eb') })

      // X-axis labels (window distance)
      const xFmtBs = (d: d3.NumberValue) => `${metresToDisplayUnit(Number(d), units).toFixed(1)}`
      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(16).tickFormat(xFmtBs as never))
        .call((ax) =>
          ax.append('text')
            .attr('x', innerW / 2).attr('y', 40)
            .attr('fill', '#6b7280').attr('text-anchor', 'middle').attr('font-size', '12px')
            .text(`Window size (${distanceUnit(units)})`)
        )

      // Y-axis labels (pace)
      const yFmtBs = (d: d3.NumberValue) => {
        const s = paceToDisplayUnit(Number(d), units)
        return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
      }
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(12).tickFormat(yFmtBs as never))
        .call((ax) =>
          ax.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerH / 2).attr('y', -55)
            .attr('fill', '#6b7280').attr('text-anchor', 'middle').attr('font-size', '12px')
            .text(`Best split pace (${paceUnit(units)})`)
        )

      const plotGroup = g.append('g').attr('clip-path', 'url(#series-clip)')

      const lineGen = d3.line<{ windowDist: number; bestPace: number }>()
        .x((d) => xScale(d.windowDist))
        .y((d) => yScale(d.bestPace))
        .defined((d) => isFinite(d.bestPace))
        .curve(d3.curveLinear)

      splitSeries.forEach((s) => {
        // Hit area
        plotGroup.append('path')
          .datum(s.points)
          .attr('fill', 'none')
          .attr('stroke', 'transparent')
          .attr('stroke-width', 12)
          .attr('d', lineGen)
          .style('cursor', 'pointer')
          .on('mouseenter', function () {
            if (tooltip) {
              tooltip.style.display = 'block'
              tooltip.style.borderColor = s.color
              tooltip.textContent = s.name
            }
          })
          .on('mousemove', function (event) {
            if (!tooltip) return
            const [mx, my] = d3.pointer(event, containerRef.current!)
            const xVal = xScale.invert(mx - MARGIN.left)
            if (s.points.length > 0) {
              const closest = s.points.reduce((best, p) =>
                Math.abs(p.windowDist - xVal) < Math.abs(best.windowDist - xVal) ? p : best
              )
              const distFmt = `${metresToDisplayUnit(closest.windowDist, units).toFixed(2)} ${distanceUnit(units)}`
              const { bestPace } = closest
              const paceDisplay = paceToDisplayUnit(bestPace, units)
              const paceFmt = `${Math.floor(paceDisplay / 60)}:${String(Math.round(paceDisplay % 60)).padStart(2, '0')} /${paceUnit(units).replace('min/', '')}`
              tooltip.textContent = `${s.name} | ${distFmt} | ${paceFmt}`
            }
            tooltip.style.left = `${mx + 14}px`
            tooltip.style.top = `${my - 10}px`
          })
          .on('mouseleave', function () {
            if (tooltip) tooltip.style.display = 'none'
          })

        // Visible line
        plotGroup.append('path')
          .datum(s.points)
          .attr('class', 'series-line')
          .attr('data-id', String(s.id))
          .attr('fill', 'none')
          .attr('stroke', s.color)
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.8)
          .style('pointer-events', 'none')
          .attr('d', lineGen)
      })

      return
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Multi-channel rendering path
    // ═══════════════════════════════════════════════════════════════════════
    if (multiChannel) {
      const activeChannels = channels!

      // ── Partition channels by side ────────────────────────────────
      const leftChs = activeChannels.map((ch, i) => ({ ch, idx: i })).filter(({ ch }) => ch.side === 'left')
      const rightChs = activeChannels.map((ch, i) => ({ ch, idx: i })).filter(({ ch }) => ch.side === 'right')

      // ── Dynamic margins: one axis strip per channel per side ──────────
      const AXIS_STRIP_W = 55
      const dynMargin = {
        top: 20,
        right: rightChs.length > 0 ? 10 + rightChs.length * AXIS_STRIP_W : 30,
        bottom: 50,
        left: leftChs.length > 0 ? 10 + leftChs.length * AXIS_STRIP_W : 30,
      }
      dynMargin.left = Math.max(30, dynMargin.left)
      dynMargin.right = Math.max(30, dynMargin.right)

      const innerW = width - dynMargin.left - dynMargin.right
      const innerH = height - dynMargin.top - dynMargin.bottom
      if (innerW <= 0 || innerH <= 0) return

      svg.append('defs')
        .append('clipPath').attr('id', 'series-clip')
        .append('rect').attr('width', innerW).attr('height', innerH)

      const g = svg.append('g').attr('transform', `translate(${dynMargin.left},${dynMargin.top})`)

      // ── Helper: compute X data respecting time mode ────────────────────
      function getXData(stream: ActivityStream): number[] | undefined {
        if (xMetric === 'distance') return stream.distance
        if (!stream.time) return undefined
        return timeMode === 'moving'
          ? buildMovingTime(stream.time, stream.moving, stream.velocity_smooth)
          : stream.time
      }

      // ── X-axis (shared across all channels) ────────────────────────────
      const allXValues: number[] = []
      for (const activity of activities) {
        const stream = streams.get(activity.id)
        if (!stream) continue
        const xData = getXData(stream)
        if (xData) allXValues.push(...xData)
      }
      if (allXValues.length === 0) return

      const xScale = d3.scaleLinear().domain([0, d3.max(allXValues)!]).range([0, innerW])
      xScaleRef.current = xScale

      // X-axis grid + labels
      g.append('g')
        .attr('class', 'grid-x')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).ticks(16).tickSize(-innerH).tickFormat(() => ''))
        .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', '#e5e7eb') })

      const xLabel = xMetric === 'distance' ? `Distance (${distanceUnit(units)})` : 'Time'
      const xFmtFn = xMetric === 'distance'
        ? (d: d3.NumberValue) => `${metresToDisplayUnit(Number(d), units).toFixed(1)}`
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

      const plotGroup = g.append('g').attr('clip-path', 'url(#series-clip)')
      const colorScale = d3.scaleOrdinal(d3.schemeTableau10)
      const tooltip = tooltipRef.current

      // ── Per-channel rendering ──────────────────────────────────────────
      let firstPaceYScale: d3.ScaleLinear<number, number> | undefined
      activeChannels.forEach((channel, chIdx) => {
        const bandTopPx = (channel.yTop / 100) * innerH
        const bandBottomPx = (channel.yBottom / 100) * innerH
        const bandHeight = bandBottomPx - bandTopPx
        if (bandHeight <= 0) return

        const channelColor = CHANNEL_PALETTE[(channel.colorIndex ?? chIdx) % CHANNEL_PALETTE.length]

        // ── Delta channel: rendered inline like any other channel ─────────
        if (channel.metric === 'delta') {
          const baselineStream = baselineId != null ? streams.get(baselineId) : undefined

          if (!baselineStream || !baselineId) {
            g.append('text')
              .attr('x', innerW / 2).attr('y', bandTopPx + bandHeight / 2)
              .attr('text-anchor', 'middle').attr('fill', '#6b7280').attr('font-size', '13px')
              .text('Δ delta — select a baseline in the roster ★')
            return
          }

          let baselineXArr: number[]
          let baselineYArr: number[]
          if (xMetric === 'distance') {
            baselineXArr = baselineStream.distance ?? []
            baselineYArr = getEffectiveTime(baselineStream) ?? []
          } else {
            baselineXArr = getEffectiveTime(baselineStream) ?? []
            baselineYArr = baselineStream.distance ?? []
          }

          if (baselineXArr.length < 2) return

          const deltaSeriesData: { id: number; name: string; points: { x: number; delta: number }[] }[] = []
          for (const activity of activities) {
            if (activity.id === baselineId) continue
            const stream = streams.get(activity.id)
            if (!stream) continue
            let compXArr: number[]
            let compYArr: number[]
            if (xMetric === 'distance') {
              compXArr = stream.distance ?? []
              compYArr = getEffectiveTime(stream) ?? []
            } else {
              compXArr = getEffectiveTime(stream) ?? []
              compYArr = stream.distance ?? []
            }
            const rawPoints = computeDeltaSeries(baselineXArr, baselineYArr, compXArr, compYArr)
            const points = xMetric === 'distance'
              ? rawPoints.map(p => ({ ...p, delta: -p.delta }))
              : rawPoints
            if (points.length > 0) deltaSeriesData.push({ id: activity.id, name: activity.name, points })
          }

          const allDeltas = deltaSeriesData.flatMap(s => s.points.map(p => p.delta))
          let deltaDomain: [number, number]
          if (channel.scaleMode === '1min' || channel.scaleMode === '2min') {
            const halfWindow = channel.scaleMode === '1min' ? 30 : 60
            deltaDomain = [-halfWindow, halfWindow]
          } else {
            const minDelta = allDeltas.length > 0 ? d3.min(allDeltas)! : -60
            const maxDelta = allDeltas.length > 0 ? d3.max(allDeltas)! : 60
            const pad = Math.max(5, (maxDelta - minDelta) * 0.1)
            deltaDomain = [minDelta - pad, maxDelta + pad]
          }
          const channelYScale = d3.scaleLinear()
            .domain(deltaDomain)
            .range([bandTopPx + bandHeight, bandTopPx])
            .nice()

          if (chIdx === 0) yScaleRef.current = channelYScale

          const HANDLE_H = 8
          const nTicks = Math.max(3, Math.round(bandHeight / 40))
          const side = channel.side
          const sideGroup = side === 'left' ? leftChs : rightChs
          const sideIdx = sideGroup.findIndex(({ idx }) => idx === chIdx)

          if (side === 'left') {
            const axisX = -(leftChs.length - 1 - sideIdx) * AXIS_STRIP_W
            g.append('rect')
              .attr('x', axisX - AXIS_STRIP_W + 2).attr('y', bandTopPx)
              .attr('width', AXIS_STRIP_W - 4).attr('height', bandHeight)
              .attr('fill', channelColor).attr('opacity', 0.1).attr('rx', 3)
              .style('cursor', 'pointer')
              .on('click', () => setEditingChannelIdx(prev => prev === chIdx ? null : chIdx))
            g.append('g')
              .attr('transform', `translate(${axisX},0)`)
              .call(d3.axisLeft(channelYScale).ticks(nTicks))
              .call((ax) => {
                ax.selectAll('text').attr('fill', channelColor).attr('font-size', '10px')
                ax.selectAll('line').attr('stroke', channelColor).attr('opacity', 0.4)
                ax.select('.domain').attr('stroke', channelColor).attr('opacity', 0.4)
              })
          } else {
            const axisX = innerW + sideIdx * AXIS_STRIP_W
            g.append('rect')
              .attr('x', axisX + 2).attr('y', bandTopPx)
              .attr('width', AXIS_STRIP_W - 4).attr('height', bandHeight)
              .attr('fill', channelColor).attr('opacity', 0.1).attr('rx', 3)
              .style('cursor', 'pointer')
              .on('click', () => setEditingChannelIdx(prev => prev === chIdx ? null : chIdx))
            g.append('g')
              .attr('transform', `translate(${axisX},0)`)
              .call(d3.axisRight(channelYScale).ticks(nTicks))
              .call((ax) => {
                ax.selectAll('text').attr('fill', channelColor).attr('font-size', '10px')
                ax.selectAll('line').attr('stroke', channelColor).attr('opacity', 0.4)
                ax.select('.domain').attr('stroke', channelColor).attr('opacity', 0.4)
              })
          }

          const handleX = side === 'left'
            ? -(leftChs.length - 1 - sideIdx) * AXIS_STRIP_W - AXIS_STRIP_W + 2
            : innerW + sideIdx * AXIS_STRIP_W + 2
          const handleW = AXIS_STRIP_W - 4

          g.append('rect')
            .attr('x', handleX).attr('y', bandTopPx - HANDLE_H / 2)
            .attr('width', handleW).attr('height', HANDLE_H)
            .attr('fill', channelColor).attr('opacity', 0.35).attr('rx', 2)
            .style('cursor', 'ns-resize')
            .on('mousedown', function (event: MouseEvent) {
              event.preventDefault(); event.stopPropagation()
              axisDragRef.current = { chIdx, edge: 'top', startY: event.clientY, startPercent: channel.yTop, innerH }
            })
          g.append('rect')
            .attr('x', handleX).attr('y', bandTopPx + bandHeight - HANDLE_H / 2)
            .attr('width', handleW).attr('height', HANDLE_H)
            .attr('fill', channelColor).attr('opacity', 0.35).attr('rx', 2)
            .style('cursor', 'ns-resize')
            .on('mousedown', function (event: MouseEvent) {
              event.preventDefault(); event.stopPropagation()
              axisDragRef.current = { chIdx, edge: 'bottom', startY: event.clientY, startPercent: channel.yBottom, innerH }
            })

          if (chIdx > 0) {
            const prevCh = activeChannels[chIdx - 1]
            if (channel.yTop >= prevCh.yBottom - 5) {
              g.append('line')
                .attr('x1', 0).attr('x2', innerW).attr('y1', bandTopPx).attr('y2', bandTopPx)
                .attr('stroke', '#d1d5db').attr('stroke-dasharray', '4,4')
            }
          }

          // Horizontal grid lines within the band
          g.append('g')
            .call(d3.axisLeft(channelYScale).ticks(nTicks).tickSize(-innerW).tickFormat(() => ''))
            .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', '#e5e7eb').attr('opacity', 0.5) })

          // Zero reference line
          g.append('line')
            .attr('x1', 0).attr('x2', innerW)
            .attr('y1', channelYScale(0)).attr('y2', channelYScale(0))
            .attr('stroke', '#9ca3af').attr('stroke-dasharray', '4,4').attr('stroke-width', 1.5)

          // Delta lines
          const deltaLineGen = d3.line<{ x: number; delta: number }>()
            .x(d => xScale(d.x))
            .y(d => channelYScale(d.delta))
            .defined(d => isFinite(d.delta))
            .curve(d3.curveLinear)

          deltaSeriesData.forEach((s, actIdx) => {
            const actColor = colorMap?.get(s.id) ?? colorScale(String(actIdx))
            plotGroup.append('path')
              .datum(s.points)
              .attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 12)
              .attr('d', deltaLineGen).style('cursor', 'pointer')
              .on('mouseenter', function () {
                if (tooltip) { tooltip.style.display = 'block'; tooltip.style.borderColor = actColor; tooltip.textContent = s.name }
              })
              .on('mousemove', function (event) {
                if (!tooltip) return
                const [mx, my] = d3.pointer(event, containerRef.current!)
                const xVal = xScale.invert(mx - dynMargin.left)
                if (s.points.length > 0) {
                  const closest = s.points.reduce((best, p) => Math.abs(p.x - xVal) < Math.abs(best.x - xVal) ? p : best)
                  const sign = closest.delta >= 0 ? '+' : ''
                  const unit = xMetric === 'distance' ? 's' : 'm'
                  tooltip.textContent = `${s.name}: ${sign}${closest.delta.toFixed(0)} ${unit}`
                }
                tooltip.style.left = `${mx + 14}px`; tooltip.style.top = `${my - 10}px`
              })
              .on('mouseleave', function () { if (tooltip) tooltip.style.display = 'none' })
            plotGroup.append('path')
              .datum(s.points)
              .attr('class', 'series-line').attr('data-id', String(s.id))
              .attr('fill', 'none').attr('stroke', actColor).attr('stroke-width', 1.5).attr('opacity', 0.8)
              .style('pointer-events', 'none').attr('d', deltaLineGen)
          })

          return // skip normal channel processing
        }

        const isPace = channel.metric === 'cumulative' || channel.metric === 'rolling' || channel.metric === 'raw'

        // Collect y-data across all activities for this channel's metric
        interface ChPoint { x: number; y: number }
        const channelSeries: { id: number; name: string; points: ChPoint[] }[] = []
        const allChY: number[] = []

        for (const activity of activities) {
          const stream = streams.get(activity.id)
          if (!stream) continue
          const xData = getXData(stream)
          const yData = computeYDataForChannel(channel.metric, stream, timeMode)
          if (!xData || !yData) continue

          const distData = stream.distance ?? xData
          const minDist = (channel.metric === 'rolling' || channel.metric === 'cumulative') ? ROLLING_SKIP_M : 0

          const points: ChPoint[] = []
          for (let i = 0; i < xData.length; i++) {
            const x = xData[i], y = yData[i], dist = distData[i]
            if (!isFinite(x) || !isFinite(y) || dist < minDist) continue
            if (isPace && (y < MIN_PACE_S_PER_KM || y > MAX_PACE_S_PER_KM)) continue
            points.push({ x, y })
            allChY.push(y)
          }
          if (points.length > 0) {
            channelSeries.push({ id: activity.id, name: activity.name, points })
          }
        }

        if (allChY.length === 0 || channelSeries.length === 0) return

        // Build y-scale for this channel's band
        let yDomain: [number, number]
        if (channel.scaleMode === 'fixed' && channel.scaleMin != null && channel.scaleMax != null) {
          yDomain = isPace ? [channel.scaleMax, channel.scaleMin] : [channel.scaleMin, channel.scaleMax]
        } else if (isPace && (channel.scaleMode === '1min' || channel.scaleMode === '2min')) {
          const seriesMeans = channelSeries
            .map((s) => {
              const validY = s.points.map(p => p.y).filter(y => isFinite(y) && y >= MIN_PACE_S_PER_KM && y <= MAX_PACE_S_PER_KM)
              return validY.length > 0 ? (d3.mean(validY) ?? null) : null
            })
            .filter((m): m is number => m !== null)
          const meanPace = seriesMeans.length > 0 ? d3.mean(seriesMeans)! : null
          const halfWindow = channel.scaleMode === '1min' ? 30 : 60
          if (meanPace !== null) {
            yDomain = [meanPace + halfWindow, meanPace - halfWindow]
          } else {
            const minY = d3.min(allChY)!
            const maxY = d3.max(allChY)!
            yDomain = [maxY * 1.02, minY * 0.98]
          }
        } else {
          const minY = d3.min(allChY)!
          const maxY = d3.max(allChY)!
          yDomain = isPace
            ? [maxY * 1.02, minY * 0.98]
            : [minY * 0.95, maxY * 1.05]
        }
        const channelYScale = d3.scaleLinear()
          .domain(yDomain)
          .range([bandTopPx + bandHeight, bandTopPx])
          .nice()

        if (chIdx === 0) yScaleRef.current = channelYScale
        if (isPace && !firstPaceYScale) firstPaceYScale = channelYScale

        // ── Y-axis with colored background, offset per side ─────────────
        const HANDLE_H = 8
        const nTicks = Math.max(3, Math.round(bandHeight / 40))
        const yFmtFn = isPace
          ? (d: d3.NumberValue) => {
              const s = paceToDisplayUnit(Number(d), units)
              return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
            }
          : undefined

        const side = channel.side
        const sideGroup = side === 'left' ? leftChs : rightChs
        const sideIdx = sideGroup.findIndex(({ idx }) => idx === chIdx)

        if (side === 'left') {
          // Left axes: outermost (sideIdx=0) furthest from plot
          const axisX = -(leftChs.length - 1 - sideIdx) * AXIS_STRIP_W
          const axisGen = d3.axisLeft(channelYScale).ticks(nTicks).tickFormat(yFmtFn as never)

          // Colored background behind axis area
          g.append('rect')
            .attr('x', axisX - AXIS_STRIP_W + 2)
            .attr('y', bandTopPx)
            .attr('width', AXIS_STRIP_W - 4)
            .attr('height', bandHeight)
            .attr('fill', channelColor)
            .attr('opacity', 0.1)
            .attr('rx', 3)
            .style('cursor', 'pointer')
            .on('click', () => setEditingChannelIdx(prev => prev === chIdx ? null : chIdx))

          g.append('g')
            .attr('transform', `translate(${axisX},0)`)
            .call(axisGen)
            .call((ax) => {
              ax.selectAll('text').attr('fill', channelColor).attr('font-size', '10px')
              ax.selectAll('line').attr('stroke', channelColor).attr('opacity', 0.4)
              ax.select('.domain').attr('stroke', channelColor).attr('opacity', 0.4)
            })
        } else {
          // Right axes: innermost (sideIdx=0) next to plot
          const axisX = innerW + sideIdx * AXIS_STRIP_W
          const axisGen = d3.axisRight(channelYScale).ticks(nTicks).tickFormat(yFmtFn as never)

          g.append('rect')
            .attr('x', axisX + 2)
            .attr('y', bandTopPx)
            .attr('width', AXIS_STRIP_W - 4)
            .attr('height', bandHeight)
            .attr('fill', channelColor)
            .attr('opacity', 0.1)
            .attr('rx', 3)
            .style('cursor', 'pointer')
            .on('click', () => setEditingChannelIdx(prev => prev === chIdx ? null : chIdx))

          g.append('g')
            .attr('transform', `translate(${axisX},0)`)
            .call(axisGen)
            .call((ax) => {
              ax.selectAll('text').attr('fill', channelColor).attr('font-size', '10px')
              ax.selectAll('line').attr('stroke', channelColor).attr('opacity', 0.4)
              ax.select('.domain').attr('stroke', channelColor).attr('opacity', 0.4)
            })
        }

        // ── Drag handles at top and bottom of each axis strip ───────────
        const handleX = side === 'left'
          ? -(leftChs.length - 1 - sideIdx) * AXIS_STRIP_W - AXIS_STRIP_W + 2
          : innerW + sideIdx * AXIS_STRIP_W + 2
        const handleW = AXIS_STRIP_W - 4

        // Top handle (drag to reposition the band top)
        g.append('rect')
          .attr('x', handleX).attr('y', bandTopPx - HANDLE_H / 2)
          .attr('width', handleW).attr('height', HANDLE_H)
          .attr('fill', channelColor).attr('opacity', 0.35).attr('rx', 2)
          .style('cursor', 'ns-resize')
          .on('mousedown', function (event: MouseEvent) {
            event.preventDefault()
            event.stopPropagation()
            axisDragRef.current = {
              chIdx,
              edge: 'top',
              startY: event.clientY,
              startPercent: channel.yTop,
              innerH,
            }
          })

        // Bottom handle (drag to reposition the band bottom)
        g.append('rect')
          .attr('x', handleX).attr('y', bandTopPx + bandHeight - HANDLE_H / 2)
          .attr('width', handleW).attr('height', HANDLE_H)
          .attr('fill', channelColor).attr('opacity', 0.35).attr('rx', 2)
          .style('cursor', 'ns-resize')
          .on('mousedown', function (event: MouseEvent) {
            event.preventDefault()
            event.stopPropagation()
            axisDragRef.current = {
              chIdx,
              edge: 'bottom',
              startY: event.clientY,
              startPercent: channel.yBottom,
              innerH,
            }
          })

        // Band separator (between non-overlapping adjacent channels)
        if (chIdx > 0) {
          const prevCh = activeChannels[chIdx - 1]
          if (channel.yTop >= prevCh.yBottom - 5) {
            g.append('line')
              .attr('x1', 0).attr('x2', innerW)
              .attr('y1', bandTopPx).attr('y2', bandTopPx)
              .attr('stroke', '#d1d5db').attr('stroke-dasharray', '4,4')
          }
        }

        // Horizontal grid lines within the band
        g.append('g')
          .call(d3.axisLeft(channelYScale).ticks(nTicks).tickSize(-innerW).tickFormat(() => ''))
          .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', '#e5e7eb').attr('opacity', 0.5) })

        // Line generator for this channel
        const lineGen = d3.line<ChPoint>()
          .x((d) => xScale(d.x))
          .y((d) => channelYScale(d.y))
          .defined((d) => isFinite(d.y))
          .curve(d3.curveLinear)

        // Render each activity's line for this channel
        channelSeries.forEach((s, actIdx) => {
          const actColor = colorMap?.get(s.id) ?? colorScale(String(actIdx))
          const isBaseline = baselineId != null && s.id === baselineId
          const hasBaseline = baselineId != null
          const opacity = hasBaseline ? (isBaseline ? 1 : 0.35) : 0.8
          const strokeWidth = isBaseline ? 2.5 : 1.5

          // Hit area
          plotGroup.append('path')
            .datum(s.points)
            .attr('fill', 'none')
            .attr('stroke', 'transparent')
            .attr('stroke-width', 12)
            .attr('d', lineGen)
            .style('cursor', 'pointer')
            .on('mouseenter', function () {
              g.selectAll<SVGPathElement, unknown>('path.series-line')
                .attr('opacity', 0.15)
              g.selectAll<SVGPathElement, unknown>(`path.series-line[data-id="${s.id}"]`)
                .attr('opacity', 1)
                .attr('stroke-width', 2.5)
              if (tooltip) {
                tooltip.style.display = 'block'
                tooltip.style.borderColor = actColor
                tooltip.textContent = `${s.name} — ${METRIC_SHORT[channel.metric]}`
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
              g.selectAll<SVGPathElement, unknown>('path.series-line[data-baseline="true"]')
                .attr('opacity', 1)
                .attr('stroke-width', 2.5)
              g.selectAll<SVGPathElement, unknown>('path.series-line:not([data-baseline="true"])')
                .attr('opacity', hasBaseline ? 0.35 : 0.8)
                .attr('stroke-width', 1.5)
              if (tooltip) tooltip.style.display = 'none'
            })

          // Visible line
          plotGroup.append('path')
            .datum(s.points)
            .attr('class', 'series-line')
            .attr('data-id', String(s.id))
            .attr('data-baseline', isBaseline ? 'true' : 'false')
            .attr('fill', 'none')
            .attr('stroke', actColor)
            .attr('stroke-width', strokeWidth)
            .attr('opacity', opacity)
            .style('pointer-events', 'none')
            .attr('d', lineGen)

          // Run-time label at the end of the baseline line for pace channels
          if (isPace && isBaseline) {
            const activity = activities.find((a) => a.id === s.id)
            const runTimeSecs = timeMode === 'moving'
              ? activity?.moving_time
              : activity?.elapsed_time
            const lastPt = [...s.points].reverse().find((p) => xScale(p.x) <= innerW)
            if (runTimeSecs && lastPt) {
              g.append('text')
                .attr('x', Math.min(xScale(lastPt.x), innerW) - 4)
                .attr('y', channelYScale(lastPt.y) - 25)
                .attr('text-anchor', 'end')
                .attr('font-size', '22px')
                .attr('fill', actColor)
                .attr('font-weight', '700')
                .text(fmtTime(runTimeSecs))
            }
          }
        })
      })

      // ── WMA contour (pace channels × distance only) ────────────────────
      const hasPaceChannel = activeChannels.some(ch =>
        ch.metric === 'cumulative' || ch.metric === 'rolling'
      )
      const effectiveGrade = ageGradePercent ?? medianAgeGrade ?? 70
      if (
        hasPaceChannel &&
        firstPaceYScale &&
        xMetric === 'distance' &&
        showWMA &&
        (athlete?.dateOfBirth || athlete?.age) &&
        athlete?.sex
      ) {
        const paceYScale = firstPaceYScale!
        yScaleRef.current = paceYScale

        const contourAge = athlete.dateOfBirth
          ? ageAtDate(athlete.dateOfBirth, new Date().toISOString())
          : athlete.age!
        const contourDistances = d3.range(
          Math.max(100, xScale.domain()[0]),
          xScale.domain()[1] + 500,
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
          .y((d) => paceYScale(d.pace))

        const contourPath = plotGroup.append('path')
          .datum(contourData)
          .attr('fill', 'none')
          .attr('stroke', '#10b981')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5')
          .attr('opacity', 0.7)
          .attr('class', 'contour-line')
          .attr('d', contourLine)

        // Wider hit area for easier dragging
        plotGroup.append('path')
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
            const cursorX = event.clientX - rect.left - dynMargin.left
            dragStateRef.current = {
              isDragging: true,
              distanceMetres: xScaleRef.current.invert(cursorX),
            }
            contourPath.attr('opacity', 1).attr('stroke-width', 3)
            event.preventDefault()
          })

        // Label — grade + predicted time
        const labelIdx = Math.floor(contourData.length / 2)
        if (contourData[labelIdx]) {
          const labelX = xScale(contourData[labelIdx].distance)
          const labelY = paceYScale(contourData[labelIdx].pace) - 14

          const baselineActivity = baselineId != null ? activities.find((a) => a.id === baselineId) : null
          const baselineDist = baselineActivity?.distance ?? null
          let predictedTimeStr = ''
          if (baselineDist != null && contourData.length > 0) {
            const closest = contourData.reduce((best, pt) =>
              Math.abs(pt.distance - baselineDist) < Math.abs(best.distance - baselineDist) ? pt : best
            )
            predictedTimeStr = fmtTime(closest.pace * (baselineDist / 1000))
          }

          const labelEl = g.append('text')
            .attr('x', labelX)
            .attr('y', labelY)
            .attr('text-anchor', 'middle')
            .attr('font-size', '22px')
            .attr('fill', '#10b981')
            .attr('font-weight', '600')

          labelEl.append('tspan').text(`${effectiveGrade.toFixed(1)}% age grade`)
          if (predictedTimeStr) {
            labelEl.append('tspan')
              .attr('dx', '1em')
              .text(predictedTimeStr)
          }
        }
      }

      return // exit early — skip single-metric rendering
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Single-metric rendering path (legacy — used when channels is empty)
    // ═══════════════════════════════════════════════════════════════════════

    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = height - MARGIN.top - MARGIN.bottom

    svg.append('defs')
      .append('clipPath').attr('id', 'series-clip')
      .append('rect').attr('width', innerW).attr('height', innerH)

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    // ─── normal single-metric rendering ───
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
            ? (timeMode === 'moving' ? buildMovingTime(stream.time, stream.moving, stream.velocity_smooth) : stream.time)
            : undefined
          yData = t && stream.distance
            ? stream.distance.map((d, i) => d > 0 ? (t[i] / d) * 1000 : NaN)
            : undefined
          break
        }
        case 'rolling': {
          // Rolling: mean pace over last 1000 m.
          //
          // moving mode — use moving time within the 1000 m window so that
          //   stops don't inflate pace; the line naturally has a gap during
          //   stopped samples because the moving-time clock doesn't advance.
          // elapsed mode — use wall-clock time; pace inflates (goes slow)
          //   while the watch is paused, showing the full time cost of stops.
          if (!stream.time || !stream.distance) break
          const t = timeMode === 'moving'
            ? buildMovingTime(stream.time, stream.moving, stream.velocity_smooth)
            : stream.time
          yData = rollingPace(t, stream.distance, ROLLING_WINDOW_S)
          break
        }
        case 'raw': {
          // Raw pace: same Δt/Δd formula as rolling but over a shorter 30-second
          // window for finer resolution, using GPS distance to match Strava's figures.
          if (!stream.distance || !stream.time) break
          const t = timeMode === 'moving'
            ? buildMovingTime(stream.time, stream.moving, stream.velocity_smooth)
            : stream.time
          yData = rollingPace(t, stream.distance, RAW_WINDOW_S)
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

      // Skip the first N metres for pace modes (noisy GPS startup)
      const distData = stream.distance ?? xData
      const minDist = (yMetric === 'rolling' || yMetric === 'cumulative') ? ROLLING_SKIP_M : 0

      const points: Point[] = xData
        .map((x, i) => ({ x, y: yData![i], dist: distData[i] }))
        .filter((p) => isFinite(p.x) && isFinite(p.y) && p.dist >= minDist)
        .map(({ x, y }) => ({ x, y }))

      // Separate out-of-bounds points (pace slower than 15 min/km)
      const isPaceMetric = yMetric === 'cumulative' || yMetric === 'rolling' || yMetric === 'raw'
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
    const isPace = yMetric === 'cumulative' || yMetric === 'rolling' || yMetric === 'raw'

    // Compute natural y-domain from current data, then lock it (or use locked value).
    // For pace, filter allY to the valid range before computing the fast-end bound so
    // that near-zero cumulative pace samples at run-start don't blow out the scale.
    const allYValid = isPace
      ? allY.filter((y) => y >= MIN_PACE_S_PER_KM && y <= MAX_PACE_S_PER_KM)
      : allY
    const clampedMaxY = isPace ? Math.min(d3.max(allYValid)!, MAX_PACE_S_PER_KM) : d3.max(allY)!
    const fastEndY = isPace ? Math.max(d3.min(allYValid)!, MIN_PACE_S_PER_KM) : d3.min(allY)!
    const naturalYDomain: [number, number] = isPace
      ? [clampedMaxY * 1.02, fastEndY * 0.98]
      : [d3.min(allY)! * 0.95, clampedMaxY * 1.05]

    let effectiveYDomain: [number, number]
    if (isPace && (yScaleMode === '1min' || yScaleMode === '2min')) {
      // Mean of per-series means, excluding out-of-bounds values
      const seriesMeans = series
        .map((s) => {
          const validY = s.points.map((p) => p.y).filter((y) => isFinite(y) && y >= MIN_PACE_S_PER_KM && y <= MAX_PACE_S_PER_KM)
          return validY.length > 0 ? (d3.mean(validY) ?? null) : null
        })
        .filter((m): m is number => m !== null)
      const meanPace = seriesMeans.length > 0 ? d3.mean(seriesMeans)! : null
      const halfWindow = yScaleMode === '1min' ? 30 : 60
      effectiveYDomain = meanPace !== null
        ? [meanPace + halfWindow, meanPace - halfWindow]
        : naturalYDomain
    } else {
      effectiveYDomain = yViewDomain ?? naturalYDomain
      if (!yViewDomain) setYViewDomain(naturalYDomain)
    }

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
    const xLabel = xMetric === 'distance' ? `Distance (${distanceUnit(units)})` : 'Time'
    const xFmtFn = xMetric === 'distance'
      ? (d: d3.NumberValue) => `${metresToDisplayUnit(Number(d), units).toFixed(1)}`
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
          const s = paceToDisplayUnit(Number(d), units)
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
          .text(isPace
            ? (units === 'imperial' ? Y_LABELS[yMetric].replace('min/km', 'min/mi') : Y_LABELS[yMetric])
            : Y_LABELS[yMetric]
          )
      )

    // Line generator — no smoothing, straight point-to-point
    // For pace metrics, skip points that exceed the boundary (leave gap; × markers shown instead)
    const isPaceMetric = yMetric === 'cumulative' || yMetric === 'rolling' || yMetric === 'raw'
    const lineGen = d3
      .line<Point>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .defined((d) => isFinite(d.y) && (!isPaceMetric || d.y <= MAX_PACE_S_PER_KM))
      .curve(d3.curveLinear)

    const tooltip = tooltipRef.current

    // Clipped group for all series lines and WMA contour — prevents overflow past axes
    const plotGroup = g.append('g').attr('clip-path', 'url(#series-clip)')

    // Overlay group for crosshair — rendered on top, not clipped, pointer-events disabled
    const crosshairGroup = g.append('g').attr('class', 'crosshair-overlay').style('pointer-events', 'none')

    series.forEach((s, i) => {
      const color = colorMap?.get(s.id) ?? colorScale(String(i))
      const isBaseline = baselineId != null && s.id === baselineId
      const hasBaseline = baselineId != null
      const defaultOpacity = hasBaseline ? (isBaseline ? 1 : 0.35) : 0.8
      const defaultStrokeWidth = isBaseline ? 2.5 : 1.5

      // Invisible wide path for easier hover hit area
      plotGroup.append('path')
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
          const [mx, my] = d3.pointer(event, containerRef.current!)
          if (tooltip) {
            tooltip.style.left = `${mx + 14}px`
            tooltip.style.top = `${my - 10}px`
          }
          // ── Crosshair ───────────────────────────────────────────────────
          const plotX = mx - MARGIN.left
          const xDataVal = xScale.invert(plotX)
          const clampedX = Math.max(0, Math.min(innerW, plotX))

          // Find closest stream index for map link
          const stream = streams.get(s.id)
          const xArr = xMetric === 'distance' ? stream?.distance : stream?.time
          if (stream && xArr) {
            let closestIdx = 0, minDiff = Infinity
            for (let ii = 0; ii < xArr.length; ii++) {
              const diff = Math.abs((xArr[ii] ?? 0) - xDataVal)
              if (diff < minDiff) { minDiff = diff; closestIdx = ii }
            }
            onHoverIndexRef.current?.(s.id, closestIdx)
          }

          crosshairGroup.selectAll('*').remove()
          // Vertical dashed line
          crosshairGroup.append('line')
            .attr('x1', clampedX).attr('x2', clampedX)
            .attr('y1', 0).attr('y2', innerH)
            .attr('stroke', '#9ca3af').attr('stroke-dasharray', '3,3').attr('stroke-width', 1)

          if (s.points.length > 0) {
            const closestPt = s.points.reduce((best, p) =>
              Math.abs(p.x - xDataVal) < Math.abs(best.x - xDataVal) ? p : best
            )
            const dotY = yScale(closestPt.y)
            // Dot on the hovered line
            crosshairGroup.append('circle')
              .attr('cx', clampedX).attr('cy', dotY)
              .attr('r', 4).attr('fill', color)
              .attr('stroke', 'white').attr('stroke-width', 1.5)
            // Label: x · y
            const xFmt = xMetric === 'distance'
              ? `${metresToDisplayUnit(xDataVal, units).toFixed(2)} ${distanceUnit(units)}`
              : fmtTime(xDataVal)
            const yFmt = isPace
              ? `${(() => { const s = paceToDisplayUnit(closestPt.y, units); return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` })()} /${paceUnit(units).replace('min/', '')}`
              : yMetric === 'heartrate' ? `${Math.round(closestPt.y)} bpm`
              : yMetric === 'elevation' ? `${Math.round(closestPt.y)} m`
              : yMetric === 'cadence'   ? `${Math.round(closestPt.y)} spm`
              : `${closestPt.y.toFixed(1)}`
            const labelAnchor = clampedX > innerW * 0.7 ? 'end' : 'start'
            const labelX = clampedX > innerW * 0.7 ? clampedX - 6 : clampedX + 6
            const labelY = dotY > innerH * 0.15 ? dotY - 8 : dotY + 16
            crosshairGroup.append('text')
              .attr('x', labelX).attr('y', labelY)
              .attr('text-anchor', labelAnchor)
              .attr('font-size', '11px').attr('fill', '#374151').attr('font-weight', '500')
              .text(`${xFmt} · ${yFmt}`)
          }
        })
        .on('mouseleave', function () {
          // Restore baseline-aware default opacities
          g.selectAll<SVGPathElement, unknown>('path.series-line[data-baseline="true"]')
            .attr('opacity', 1)
            .attr('stroke-width', 2.5)
          g.selectAll<SVGPathElement, unknown>('path.series-line:not([data-baseline="true"])')
            .attr('opacity', hasBaseline ? 0.35 : 0.8)
            .attr('stroke-width', 1.5)
          crosshairGroup.selectAll('*').remove()
          onHoverIndexRef.current?.(null, null)
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
      plotGroup.append('path')
        .datum(s.points)
        .attr('class', 'series-line')
        .attr('data-id', String(s.id))
        .attr('data-baseline', isBaseline ? 'true' : 'false')
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', defaultStrokeWidth)
        .attr('opacity', defaultOpacity)
        .style('pointer-events', 'none')
        .attr('d', lineGen)

      // Actual run time label near right boundary — baseline only
      if (isPace && isBaseline) {
        const activity = activities.find((a) => a.id === s.id)
        const runTimeSecs = timeMode === 'moving'
          ? activity?.moving_time
          : activity?.elapsed_time
        // Last point whose screen x is within the plot area
        const lastPt = [...s.points].reverse().find((p) => xScale(p.x) <= innerW)
        if (runTimeSecs && lastPt) {
          g.append('text')
            .attr('x', Math.min(xScale(lastPt.x), innerW) - 4)
            .attr('y', yScale(lastPt.y) - 25)
            .attr('text-anchor', 'end')
            .attr('font-size', '22px')
            .attr('fill', color)
            .attr('font-weight', '700')
            .text(fmtTime(runTimeSecs))
        }
      }
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
        xScale.domain()[1] + 500,
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

      const contourPath = plotGroup.append('path')
        .datum(contourData)
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.7)
        .attr('class', 'contour-line')
        .attr('d', contourLine)

      // Wider hit area for easier dragging
      plotGroup.append('path')
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

      // Label — grade + predicted time on the same line, to the right of the grade text
      const labelIdx = Math.floor(contourData.length / 2)
      if (contourData[labelIdx]) {
        const labelX = xScale(contourData[labelIdx].distance)
        const labelY = yScale(contourData[labelIdx].pace) - 14

        const baselineActivity = baselineId != null ? activities.find((a) => a.id === baselineId) : null
        const baselineDist = baselineActivity?.distance ?? null  // metres
        let predictedTimeStr = ''
        if (baselineDist != null && contourData.length > 0) {
          const closest = contourData.reduce((best, pt) =>
            Math.abs(pt.distance - baselineDist) < Math.abs(best.distance - baselineDist) ? pt : best
          )
          predictedTimeStr = fmtTime(closest.pace * (baselineDist / 1000))
        }

        const labelEl = g.append('text')
          .attr('x', labelX)
          .attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('font-size', '22px')
          .attr('fill', '#10b981')
          .attr('font-weight', '600')

        labelEl.append('tspan').text(`${effectiveGrade.toFixed(1)}% age grade`)
        if (predictedTimeStr) {
          labelEl.append('tspan')
            .attr('dx', '1em')
            .text(predictedTimeStr)
        }
      }
    }
  }, [activities, streams, yMetric, xMetric, colorMap, showWMA, ageGradePercent, medianAgeGrade, athlete, timeMode, yViewDomain, yScaleMode, baselineId, multiChannel, isBestSplitMode, channels, units])

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

  // Handle drag events for axis band repositioning
  useEffect(() => {
    const handleAxisDragMove = (event: MouseEvent) => {
      const drag = axisDragRef.current
      if (!drag || !onChannelsChange || !channels) return

      const deltaY = event.clientY - drag.startY
      const deltaPct = (deltaY / drag.innerH) * 100
      let newPct = Math.round(drag.startPercent + deltaPct)
      newPct = Math.max(0, Math.min(100, newPct))

      const ch = channels[drag.chIdx]
      if (!ch) return

      const next = [...channels]
      if (drag.edge === 'top') {
        if (newPct >= ch.yBottom) return
        next[drag.chIdx] = { ...ch, yTop: newPct }
      } else {
        if (newPct <= ch.yTop) return
        next[drag.chIdx] = { ...ch, yBottom: newPct }
      }
      onChannelsChange(next)
    }

    const handleAxisDragEnd = () => {
      axisDragRef.current = null
    }

    document.addEventListener('mousemove', handleAxisDragMove)
    document.addEventListener('mouseup', handleAxisDragEnd)

    return () => {
      document.removeEventListener('mousemove', handleAxisDragMove)
      document.removeEventListener('mouseup', handleAxisDragEnd)
    }
  }, [channels, onChannelsChange])

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 p-3 border-b border-gray-100 items-center">
        {multiChannel ? (
          /* ── Multi-channel controls ──────────────────────────────────── */
          <>
            {/* Channel pills inline */}
            {channels!.map((ch, chIdx) => {
              const chColor = CHANNEL_PALETTE[(ch.colorIndex ?? chIdx) % CHANNEL_PALETTE.length]
              const isEditing = editingChannelIdx === chIdx
              return (
                <button
                  key={chIdx}
                  onClick={() => setEditingChannelIdx(prev => prev === chIdx ? null : chIdx)}
                  className="px-2 py-0.5 text-xs font-semibold rounded border-2 transition-all"
                  style={{
                    borderColor: chColor,
                    backgroundColor: isEditing ? chColor : `${chColor}18`,
                    color: isEditing ? 'white' : chColor,
                  }}
                >
                  {METRIC_SHORT[ch.metric]}
                  <span className="ml-1 opacity-60 text-[10px]">{(ch.side ?? 'left') === 'left' ? '◂' : '▸'}</span>
                </button>
              )
            })}
            {channels!.length < 4 && (
              <button
                onClick={() => {
                  if (!onChannelsChange) return
                  const used = new Set(channels!.map(c => c.metric))
                  const available: SeriesMetric[] = ['heartrate', 'elevation', 'cadence', 'cumulative', 'rolling', 'raw']
                  const next = available.find(m => !used.has(m)) ?? 'heartrate'
                  const count = channels!.length + 1
                  const isStacked = channelLayout === 'stack'
                  const bandSize = isStacked ? 100 / count : 100
                  const nLeft = channels!.filter(c => c.side === 'left').length
                  const newSide: 'left' | 'right' = nLeft < 2 ? 'left' : 'right'
                  // Assign stable colorIndex: lowest unused 0-3
                  const usedColors = new Set(channels!.map(c => c.colorIndex ?? 0))
                  let newColorIndex = 0
                  while (usedColors.has(newColorIndex)) newColorIndex++
                  const nextChannels = orderChannelsForStack([
                    ...channels!,
                    {
                      metric: next,
                      side: newSide,
                      yTop: 0,
                      yBottom: 100,
                      scaleMode: 'auto' as const,
                      colorIndex: newColorIndex,
                    },
                  ])
                  const updated = isStacked
                    ? nextChannels.map((ch, i) => ({
                        ...ch,
                        yTop: Math.round(i * bandSize),
                        yBottom: Math.round((i + 1) * bandSize),
                      }))
                    : nextChannels.map(ch => ({ ...ch, yTop: 0, yBottom: 100 }))
                  onChannelsChange(updated)
                }}
                className="px-2 py-0.5 text-xs rounded border border-dashed border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
                title="Add channel"
              >+ Add</button>
            )}
            {/* Stack / Overlay toggle */}
            {channels!.length > 1 && (
              <div className="flex items-center gap-1 ml-1">
                {(['stack', 'overlay'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      if (!onChannelsChange) return
                      if (mode === 'stack') {
                        const bandSize = 100 / channels!.length
                        const sorted = orderChannelsForStack(channels!)
                        onChannelsChange(sorted.map((ch, i) => ({
                          ...ch,
                          yTop: Math.round(i * bandSize),
                          yBottom: Math.round((i + 1) * bandSize),
                        })))
                      } else {
                        onChannelsChange(channels!.map(ch => ({ ...ch, yTop: 0, yBottom: 100 })))
                      }
                    }}
                    className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                      channelLayout === mode
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-500'
                    }`}
                  >{mode}</button>
                ))}
              </div>
            )}
            {channels!.some(ch => ch.metric === 'cumulative' || ch.metric === 'rolling') && xMetric === 'distance' && (athlete?.age || athlete?.dateOfBirth) && athlete?.sex && (
              <>
                <div className="flex items-center gap-1 ml-2">
                  <input
                    type="checkbox"
                    id="wma-toggle-mc"
                    checked={showWMA}
                    onChange={(e) => setShowWMA(e.target.checked)}
                    className="accent-green-500"
                  />
                  <label htmlFor="wma-toggle-mc" className="text-xs text-gray-500 cursor-pointer">
                    WMA contour
                  </label>
                </div>
                {showWMA && (
                  <span className="text-xs text-gray-400">
                    {(ageGradePercent ?? medianAgeGrade ?? 70).toFixed(1)}% — drag to adjust
                  </span>
                )}
              </>
            )}
          </>
        ) : (
          /* ── Single-metric controls (legacy) ─────────────────────────── */
          <>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Y:</span>
          {(['cumulative', 'rolling', 'raw', 'heartrate', 'elevation', 'cadence', 'delta', 'bestsplit'] as YMetric[]).map((m) => (
            <button
              key={m}
              onClick={() => setYMetric(m)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                yMetric === m ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 text-gray-500'
              }`}
            >
              {m === 'cumulative' ? 'cumul.' : m === 'delta' ? 'Δ delta' : m === 'bestsplit' ? 'best split' : m}
            </button>
          ))}
        </div>
          </>
        )}

        {/* ── Shared controls (X-axis, time mode) — hidden in best split mode ── */}
        {!isBestSplitMode && (
          <>
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
          </>
        )}

        {!multiChannel && !isBestSplitMode && (
          /* ── Single-metric-only controls (scale, WMA) ─────────────────── */
          <>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">scale:</span>
          {(['auto', '1min', '2min'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                if (mode === 'auto') setYViewDomain(null)
                setYScaleMode(mode)
              }}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                yScaleMode === mode ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-500'
              }`}
            >
              {mode === 'auto' ? 'auto' : mode === '1min' ? '1 min' : '2 min'}
            </button>
          ))}
        </div>
          {yMetric === 'cumulative' && (
            <span className="text-xs text-gray-400 ml-1">
              cumulative average pace
            </span>
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
          </>
        )}

      </div>

      {/* Plot */}
      <div ref={containerRef} className="flex-1 relative min-h-0">
        {/* Channel editing panel */}
        {multiChannel && editingChannelIdx != null && channels![editingChannelIdx] && (() => {
          const ch = channels![editingChannelIdx]
          const chColor = CHANNEL_PALETTE[(ch.colorIndex ?? editingChannelIdx) % CHANNEL_PALETTE.length]
          const chIsPace = ch.metric === 'cumulative' || ch.metric === 'rolling' || ch.metric === 'raw'
          const chIsDelta = ch.metric === 'delta'
          return (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-2 px-3 py-2 bg-white rounded-lg border shadow-lg"
              style={{ borderColor: chColor }}>
              {/* Metric */}
              <select
                value={ch.metric}
                onChange={(e) => {
                  if (!onChannelsChange) return
                  const next = [...channels!]
                  next[editingChannelIdx] = { ...ch, metric: e.target.value as SeriesMetric }
                  onChannelsChange(next)
                }}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                style={{ color: chColor }}
              >
                {(['cumulative', 'rolling', 'raw', 'heartrate', 'elevation', 'cadence', 'delta'] as SeriesMetric[]).map((m) => (
                  <option key={m} value={m}>{METRIC_SHORT[m]}</option>
                ))}
              </select>
              {/* Side toggle */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">axis:</span>
                {(['left', 'right'] as const).map((s) => {
                  const countOnSide = channels!.filter((c, i) => c.side === s && i !== editingChannelIdx).length
                  const disabled = countOnSide >= 2 && ch.side !== s
                  return (
                  <button
                    key={s}
                    disabled={disabled}
                    onClick={() => {
                      if (!onChannelsChange || disabled) return
                      const next = [...channels!]
                      next[editingChannelIdx] = { ...ch, side: s }
                      onChannelsChange(next)
                    }}
                    className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                      ch.side === s
                        ? 'bg-orange-500 text-white border-orange-500'
                        : disabled
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-gray-300 text-gray-500 hover:border-orange-400'
                    }`}
                  >{s}</button>
                  )
                })}
              </div>
              {/* Scale mode */}
              {(chIsPace || chIsDelta) && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">scale:</span>
                  {(['auto', '1min', '2min'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        if (!onChannelsChange) return
                        const next = [...channels!]
                        next[editingChannelIdx] = { ...ch, scaleMode: mode }
                        onChannelsChange(next)
                      }}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                        ch.scaleMode === mode
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'border-gray-300 text-gray-500 hover:border-orange-400'
                      }`}
                    >{mode === 'auto' ? 'auto' : mode === '1min' ? '±1m' : '±2m'}</button>
                  ))}
                </div>
              )}
              {/* Band position */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">band:</span>
                <input
                  type="number"
                  min={0} max={100}
                  value={ch.yTop}
                  onChange={(e) => {
                    if (!onChannelsChange) return
                    const next = [...channels!]
                    next[editingChannelIdx] = { ...ch, yTop: Number(e.target.value) }
                    onChannelsChange(next)
                  }}
                  className="w-12 text-xs border border-gray-200 rounded px-1 py-0.5 text-center"
                />
                <span className="text-xs text-gray-400">–</span>
                <input
                  type="number"
                  min={0} max={100}
                  value={ch.yBottom}
                  onChange={(e) => {
                    if (!onChannelsChange) return
                    const next = [...channels!]
                    next[editingChannelIdx] = { ...ch, yBottom: Number(e.target.value) }
                    onChannelsChange(next)
                  }}
                  className="w-12 text-xs border border-gray-200 rounded px-1 py-0.5 text-center"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
              {/* Remove */}
              {channels!.length > 1 && (
                <button
                  onClick={() => {
                    if (!onChannelsChange) return
                    onChannelsChange(channels!.filter((_, i) => i !== editingChannelIdx))
                    setEditingChannelIdx(null)
                  }}
                  className="text-xs text-red-400 hover:text-red-600 ml-1"
                >remove</button>
              )}
              {/* Close */}
              <button
                onClick={() => setEditingChannelIdx(null)}
                className="text-gray-400 hover:text-gray-600 ml-1 text-sm"
              >✕</button>
            </div>
          )
        })()}
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
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10 text-gray-400 text-sm">
            Stream data not yet loaded — sync activities first
          </div>
        )}
        {activities.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10 text-gray-400 text-sm">
            Add runs to the roster to compare them here
          </div>
        )}
      </div>
    </div>
  )
}
