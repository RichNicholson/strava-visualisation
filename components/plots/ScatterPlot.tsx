'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import * as d3 from 'd3'
import type { StravaActivity, MetricKey, Athlete } from '../../lib/strava/types'
import { getMetricValue, METRIC_LABELS } from '../../lib/strava/types'
import { generateAgeGradeContour, computeAgeGrade, ageAtDate } from '../../lib/wma/ageGrade'
import { formatDistance, formatPace, metresToDisplayUnit, type UnitSystem } from '../../lib/format'
import { computeParetoFront } from '../../lib/analysis/pareto'

type YAxis = MetricKey
type ColorMetric = MetricKey | 'index'
type ColorScheme = 'Oranges' | 'Viridis' | 'Cool' | 'Plasma'

const COLOR_SCHEMES: Record<ColorScheme, (t: number) => string> = {
  Oranges: d3.interpolateOranges,
  Viridis: d3.interpolateViridis,
  Cool: d3.interpolateCool,
  Plasma: d3.interpolatePlasma,
}

/** Fixed WMA contour grades shown on the scatter plot (40 % … 100 %, step 2). */
const WMA_CONTOUR_GRADES = d3.range(40, 102, 2)  // [40, 42, 44, …, 100]

function contourColors(grades: number[]): string[] {
  const min = Math.min(...grades)
  const max = Math.max(...grades)
  const span = max - min || 1
  return grades.map((g) => d3.interpolateGreens(0.25 + ((g - min) / span) * 0.65))
}

const MARGIN = { top: 20, right: 80, bottom: 50, left: 70 }

// X-axis and color metric options (exclude derived age_grade which requires athlete context)
const METRIC_OPTIONS = (Object.entries(METRIC_LABELS) as [MetricKey, string][])
  .filter(([k]) => k !== 'age_grade')
  .sort(([, a], [, b]) => a.localeCompare(b))
// Y-axis also offers age_grade
const Y_AXIS_OPTIONS: [MetricKey, string][] = [...METRIC_OPTIONS, ['age_grade', METRIC_LABELS.age_grade]]
  .sort(([, a], [, b]) => a.localeCompare(b))

export interface ScatterViewState {
  xAxis: MetricKey
  yAxis: MetricKey
  colorMetric: ColorMetric
  colorScheme: ColorScheme
  /** null = unset; plot will auto-fit on first render then call onViewStateChange to lock. */
  viewDomain: { x: [number, number]; y: [number, number] } | null
}

export const DEFAULT_SCATTER_VIEW_STATE: ScatterViewState = {
  xAxis: 'distance',
  yAxis: 'average_pace',
  colorMetric: 'index',
  colorScheme: 'Oranges',
  viewDomain: null,
}

interface ScatterPlotProps {
  activities: StravaActivity[]
  athlete: Athlete | null
  showWMA?: boolean
  roster?: Set<number>
  onToggleRoster?: (id: number) => void
  colorMap?: Map<number, string>
  viewState: ScatterViewState
  onViewStateChange: (state: ScatterViewState) => void
  units?: UnitSystem
  isDark?: boolean
}

export function ScatterPlot({ activities, athlete, showWMA = true, roster, onToggleRoster, colorMap, viewState, onViewStateChange, units = 'metric', isDark = false }: ScatterPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Stable ref for the toggle callback — keeps it out of the useEffect dep array
  const onToggleRosterRef = useRef(onToggleRoster)
  useEffect(() => { onToggleRosterRef.current = onToggleRoster }, [onToggleRoster])

  const { xAxis, yAxis, colorMetric, colorScheme, viewDomain } = viewState
  const setViewDomain = (d: ScatterViewState['viewDomain']) => onViewStateChange({ ...viewState, viewDomain: d })

  const [tooltip, setTooltip] = useState<{ x: number; y: number; activity: StravaActivity } | null>(null)
  const [showWMAContours, setShowWMAContours] = useState(true)
  const [showPareto, setShowPareto] = useState(true)

  const paretoFront = useMemo(() => {
    if (yAxis === 'average_pace') {
      return computeParetoFront(activities, (a) => (a.average_speed > 0 ? 1000 / a.average_speed : Infinity), false)
    }
    if (yAxis === 'elapsed_pace') {
      return computeParetoFront(activities, (a) => getMetricValue(a, 'elapsed_pace'), false)
    }
    if (xAxis === 'distance') {
      return computeParetoFront(activities, (a) => getMetricValue(a, yAxis), true)
    }
    return new Set<number>()
  }, [activities, xAxis, yAxis])

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return
    if (activities.length === 0) return

    const gridColor = isDark ? '#374151' : '#e5e7eb'
    const labelColor = isDark ? '#9ca3af' : '#6b7280'

    const isPace = yAxis === 'average_pace' || yAxis === 'elapsed_pace'

    // For the distance axis, getMetricValue returns km; convert to miles if needed
    const getXValueForActivity = (a: StravaActivity): number => {
      const v = getMetricValue(a, xAxis)
      if (xAxis === 'distance' && units === 'imperial') return v * (1000 / 1609.344)
      return v
    }
    const getYValue = (a: StravaActivity): number | null => {
      if (yAxis === 'age_grade') {
        if (!athlete?.dateOfBirth || !athlete?.sex || !a.distance || !a.moving_time) return null
        const age = ageAtDate(athlete.dateOfBirth, a.start_date)
        return computeAgeGrade(athlete.sex, age, a.distance, a.moving_time)
      }
      return getMetricValue(a, yAxis)
    }

    // When age_grade is selected, exclude uncomputable activities
    const plotActivities = yAxis === 'age_grade'
      ? activities.filter((a) => getYValue(a) !== null)
      : activities

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    if (plotActivities.length === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight
    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = height - MARGIN.top - MARGIN.bottom

    svg.attr('width', width).attr('height', height)

    // Clip path so zoomed dots don't overflow the axes
    svg.append('defs')
      .append('clipPath').attr('id', 'scatter-clip')
      .append('rect').attr('width', innerW).attr('height', innerH)

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    const xVals = plotActivities.map((a) => getXValueForActivity(a))
    const yVals = plotActivities.map((a) => getYValue(a)!)

    // Use exact data bounds; nice() will round to clean tick values.
    const xDomainDefault: [number, number] = [d3.min(xVals)!, d3.max(xVals)!]
    const yDomainDefault: [number, number] = isPace
      ? [d3.max(yVals)!, d3.min(yVals)!]  // inverted: slow at bottom
      : [d3.min(yVals)!, d3.max(yVals)!]

    const xScale = d3.scaleLinear()
      .domain(viewDomain?.x ?? xDomainDefault)
      .range([0, innerW])
    const yScale = d3.scaleLinear()
      .domain(viewDomain?.y ?? yDomainDefault)
      .range([innerH, 0])

    // If no locked domain yet, fit (with nice axes) then lock so future filter
    // changes don't cause the plot to rescale.
    if (!viewDomain) {
      xScale.nice()
      yScale.nice()
      setViewDomain({
        x: xScale.domain() as [number, number],
        y: yScale.domain() as [number, number],
      })
    }

    // Grid lines
    g.append('g')
      .attr('class', 'grid-x')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(16).tickSize(-innerH).tickFormat(() => ''))
      .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', gridColor) })

    g.append('g')
      .attr('class', 'grid-y')
      .call(d3.axisLeft(yScale).ticks(12).tickSize(-innerW).tickFormat(() => ''))
      .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', gridColor) })

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(16))
      .call((ax) => {
        ax.selectAll('text').attr('fill', labelColor)
        ax.select('.domain').attr('stroke', labelColor)
        ax.selectAll('line').attr('stroke', labelColor)
        ax.append('text')
          .attr('x', innerW / 2).attr('y', 40)
          .attr('fill', labelColor).attr('text-anchor', 'middle').attr('font-size', '12px')
          .text(xAxis === 'distance'
            ? (units === 'imperial' ? 'Distance (mi)' : 'Distance (km)')
            : METRIC_LABELS[xAxis]
          )
      })

    // Y axis
    const yFmt = isPace
      ? (d: d3.NumberValue) => {
          const s = Number(d)
          const paceS = units === 'imperial' ? s * (1609.344 / 1000) : s
          return `${Math.floor(paceS / 60)}:${String(Math.round(paceS % 60)).padStart(2, '0')}`
        }
      : yAxis === 'age_grade'
      ? (d: d3.NumberValue) => `${Number(d).toFixed(1)}%`
      : undefined

    const yLabel = isPace
      ? (units === 'imperial'
          ? METRIC_LABELS[yAxis].replace('min/km', 'min/mi')
          : METRIC_LABELS[yAxis])
      : METRIC_LABELS[yAxis]

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(12).tickFormat(yFmt as never))
      .call((ax) => {
        ax.selectAll('text').attr('fill', labelColor)
        ax.select('.domain').attr('stroke', labelColor)
        ax.selectAll('line').attr('stroke', labelColor)
        ax.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -innerH / 2).attr('y', -55)
          .attr('fill', labelColor).attr('text-anchor', 'middle').attr('font-size', '12px')
          .text(yLabel)
      })

    // WMA contours (distance × pace axes)
    const wmaApplicable = showWMA && xAxis === 'distance' && (yAxis === 'average_pace' || yAxis === 'elapsed_pace') && athlete?.sex && (athlete?.dateOfBirth || athlete?.age)
    if (wmaApplicable && showWMAContours) {
      // xScale domain is in display units (km or mi); convert back to metres for WMA
      const displayToMetres = units === 'imperial' ? 1609.344 : 1000
      const contourDistances = d3.range(xScale.domain()[0] * displayToMetres, xScale.domain()[1] * displayToMetres, 500)

      const contourGrades = WMA_CONTOUR_GRADES
      const colors = contourColors(contourGrades)

      contourGrades.forEach((grade, i) => {
        // For the contour line we always use today's age (the static reference curve)
        const contourAge = athlete.dateOfBirth
          ? ageAtDate(athlete.dateOfBirth, new Date().toISOString())
          : athlete.age!
        const pts = generateAgeGradeContour(athlete.sex!, contourAge, grade, contourDistances)
        const isMajor = grade % 10 === 0

        const lineGen = d3.line<{ distance: number; pace: number }>()
          .x((d) => xScale(metresToDisplayUnit(d.distance, units)))
          .y((d) => yScale(d.pace))
          .defined((d) => {
            const sy = yScale(d.pace)
            return isFinite(d.pace) && sy >= 0 && sy <= innerH
          })

        g.append('path')
          .datum(pts)
          .attr('fill', 'none')
          .attr('stroke', colors[i])
          .attr('stroke-width', isMajor ? 1.8 : 1)
          .attr('stroke-dasharray', isMajor ? '4 3' : '2 2')
          .attr('d', lineGen)

        if (isMajor) {
          const lastVisible = pts.filter((d) => {
            const sy = yScale(d.pace)
            return isFinite(d.pace) && sy >= 0 && sy <= innerH && xScale(metresToDisplayUnit(d.distance, units)) <= innerW
          })
          if (lastVisible.length > 0) {
            const last = lastVisible[lastVisible.length - 1]
            g.append('text')
              .attr('x', xScale(metresToDisplayUnit(last.distance, units)) + 4)
              .attr('y', yScale(last.pace))
              .attr('font-size', '10px').attr('fill', colors[i])
              .attr('dominant-baseline', 'middle')
              .text(`${grade}%`)
          }
        }
      })

      // WMA label inside the plot area (top-right)
      g.append('text')
        .attr('x', innerW - 4).attr('y', 6)
        .attr('text-anchor', 'end').attr('font-size', '10px').attr('fill', labelColor)
        .text('WMA')
    }

    // Capture effective domains so single-axis zoom can preserve the other axis
    const effectiveXDomain = xScale.domain() as [number, number]
    const effectiveYDomain = yScale.domain() as [number, number]

    // Brush → zoom (all axis combinations; supports axis-constrained zoom)
    {
      const brushGroup = g.append('g').attr('class', 'brush')
      const brush = d3.brush()
        .extent([[0, 0], [innerW, innerH]])
        .on('brush', (event) => {
          if (!event.sourceEvent || !event.selection) return
          const [[bx0, by0], [bx1, by1]] = event.selection as [[number, number], [number, number]]
          const dx = Math.abs(bx1 - bx0)
          const dy = Math.abs(by1 - by0)
          const selRect = brushGroup.select('.selection')
          if (dx > 4 * dy) {
            // X-constrained: stretch selection to full height
            selRect.attr('y', 0).attr('height', innerH)
          } else if (dy > 4 * dx) {
            // Y-constrained: stretch selection to full width
            selRect.attr('x', 0).attr('width', innerW)
          }
          // else: normal rectangular selection — no modification needed
        })
        .on('end', (event) => {
          if (!event.sourceEvent || !event.selection) return
          const [[px0, py0], [px1, py1]] = event.selection as [[number, number], [number, number]]
          const dx = Math.abs(px1 - px0)
          const dy = Math.abs(py1 - py0)
          // newY: always [invert(bottom), invert(top)] so domain direction is preserved
          // for inverted scale (pace): [slow, fast]; for normal: [small, large]
          if (dx > 4 * dy) {
            // X-only zoom: keep current y domain
            setViewDomain({
              x: [xScale.invert(px0), xScale.invert(px1)],
              y: effectiveYDomain,
            })
          } else if (dy > 4 * dx) {
            // Y-only zoom: keep current x domain
            setViewDomain({
              x: effectiveXDomain,
              y: [yScale.invert(py1), yScale.invert(py0)],
            })
          } else {
            // Both axes
            setViewDomain({
              x: [xScale.invert(px0), xScale.invert(px1)],
              y: [yScale.invert(py1), yScale.invert(py0)],
            })
          }
        })

      brushGroup.call(brush)
      // Make the selection rectangle clearly visible
      brushGroup.select('.selection')
        .attr('fill', '#f97316')
        .attr('fill-opacity', 0.12)
        .attr('stroke', '#f97316')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', 'none')
      brushGroup.select('.overlay').attr('stroke', 'none')
    }

    // Dots (clipped so zoom clips out-of-range points)
    const dotsGroup = g.append('g').attr('clip-path', 'url(#scatter-clip)')
    // Out-of-bounds markers: no clip-path, clamped to perimeter
    const crossGroup = g.append('g')

    // Sort oldest-first so most-recent points are drawn last (SVG painter's order = on top)
    const sortedActivities = [...plotActivities].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    )

    // Scatter dot x-positions: use unit-aware x value (via getXValueForActivity in plotData below)

    let colorFn: (a: StravaActivity, i: number) => string
    if (colorMetric === 'index') {
      // High index = newest = darker; domain [0, n-1] maps oldest→lightest, newest→darkest
      const cs = d3.scaleSequential(COLOR_SCHEMES[colorScheme]).domain([0, sortedActivities.length - 1])
      colorFn = (_, i) => cs(i)
    } else {
      const cVals = sortedActivities.map((a) => getMetricValue(a, colorMetric as MetricKey))
      const cs = d3.scaleSequential(COLOR_SCHEMES[colorScheme])
        .domain([d3.min(cVals)!, d3.max(cVals)!])
      colorFn = (a) => cs(getMetricValue(a, colorMetric as MetricKey))
    }

    // Precompute pixel positions and whether each point is within the plot area
    type PlotDatum = { activity: StravaActivity; rawCx: number; rawCy: number; cx: number; cy: number; oob: boolean; idx: number }
    const plotData: PlotDatum[] = sortedActivities.map((a, idx) => {
      const rawCx = xScale(getXValueForActivity(a))
      const rawCy = yScale(getYValue(a)!)
      const oob = rawCx < 0 || rawCx > innerW || rawCy < 0 || rawCy > innerH
      return {
        activity: a, idx,
        rawCx, rawCy,
        cx: Math.max(0, Math.min(innerW, rawCx)),
        cy: Math.max(0, Math.min(innerH, rawCy)),
        oob,
      }
    })

    const inBoundsData  = plotData.filter((d) => !d.oob)
    const outBoundsData = plotData.filter((d) =>  d.oob)

    // Split for z-order: unselected first, then selected on top
    const inBoundsUnselected = inBoundsData.filter((d) => !roster?.has(d.activity.id))
    const inBoundsSelected = inBoundsData.filter((d) => roster?.has(d.activity.id))
    const outBoundsUnselected = outBoundsData.filter((d) => !roster?.has(d.activity.id))
    const outBoundsSelected = outBoundsData.filter((d) => roster?.has(d.activity.id))

    // ── In-bounds: Pareto rings (rendered under main dots) ───────────────────
    if (showPareto) {
      const paretoData = inBoundsData.filter((d) => paretoFront.has(d.activity.id))
      dotsGroup.selectAll('circle.pareto-ring')
        .data(paretoData)
        .join('circle')
        .attr('class', 'pareto-ring')
        .attr('cx', (d) => d.cx)
        .attr('cy', (d) => d.cy)
        .attr('r', (d) => (roster?.has(d.activity.id) ? 8 + 3 : 5 + 3))
        .attr('fill', 'none')
        .attr('stroke', isDark ? '#e5e7eb' : '#1f2937')
        .attr('stroke-width', 2)
        .attr('opacity', 0.6)
        .attr('pointer-events', 'none')
    }

    // ── In-bounds: circles (unselected, then selected) ───────────────────────
    // Visual circles — appearance only, no pointer events (hit areas handle interaction)
    const renderCirclesVisual = (data: typeof inBoundsData, selected: boolean) => {
      dotsGroup.selectAll(selected ? 'circle.vis-selected' : 'circle.vis-unselected')
        .data(data)
        .join('circle')
        .attr('class', selected ? 'vis-selected' : 'vis-unselected')
        .attr('cx', (d) => d.cx)
        .attr('cy', (d) => d.cy)
        .attr('r', selected ? 8 : 5)
        .attr('fill', (d) => {
          if (selected && colorMap) {
            return colorMap.get(d.activity.id) ?? colorFn(d.activity, d.idx)
          }
          return colorFn(d.activity, d.idx)
        })
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.9)
        .attr('pointer-events', 'none')
    }

    // Invisible hit-area circles — larger radius, carry all event handlers
    const renderCirclesHit = (data: typeof inBoundsData, selected: boolean) => {
      dotsGroup.selectAll(selected ? 'circle.hit-selected' : 'circle.hit-unselected')
        .data(data)
        .join('circle')
        .attr('class', selected ? 'hit-selected' : 'hit-unselected')
        .attr('cx', (d) => d.cx)
        .attr('cy', (d) => d.cy)
        .attr('r', 12)
        .attr('fill', 'transparent')
        .attr('stroke', 'none')
        .style('cursor', 'pointer')
        .on('click', function (event: MouseEvent, d) {
          event.stopPropagation()
          onToggleRosterRef.current?.(d.activity.id)
        })
        .on('contextmenu', function (event: MouseEvent, d) {
          event.preventDefault()
          event.stopPropagation()
          window.open(`https://www.strava.com/activities/${d.activity.id}`, '_blank', 'noopener')
        })
        .on('mouseenter', function (event: MouseEvent, d) {
          const rect = svgRef.current!.getBoundingClientRect()
          setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, activity: d.activity })
        })
        .on('mouseleave', function () {
          setTooltip(null)
        })
    }

    // Render order: visuals first (unselected → selected), then hit areas on top (same order)
    renderCirclesVisual(inBoundsUnselected, false)
    renderCirclesVisual(inBoundsSelected, true)
    renderCirclesHit(inBoundsUnselected, false)
    renderCirclesHit(inBoundsSelected, true)

    // ── Out-of-bounds: × markers clamped to perimeter (unselected, then selected) ────
    const S = 5  // half-size of the × arms
    const crossPath = `M${-S},${-S}L${S},${S}M${-S},${S}L${S},${-S}`

    const renderCrosses = (data: typeof outBoundsData, selected: boolean) => {
      crossGroup.selectAll(selected ? 'g.oob-selected' : 'g.oob-unselected')
        .data(data)
        .join('g')
        .attr('class', selected ? 'oob-selected' : 'oob-unselected')
        .attr('transform', (d) => `translate(${d.cx},${d.cy})`)
        .style('cursor', 'pointer')
        .each(function (d) {
          const el = d3.select(this)
          let color = colorFn(d.activity, d.idx)
          if (selected && colorMap) {
            color = colorMap.get(d.activity.id) ?? color
          }
          // White halo for contrast against the axis
          el.append('path').attr('d', crossPath)
            .attr('stroke', 'white').attr('stroke-width', selected ? 4.5 : 3.5).attr('fill', 'none')
          el.append('path').attr('d', crossPath)
            .attr('stroke', color).attr('stroke-width', selected ? 3 : 2).attr('fill', 'none').attr('opacity', 0.9)
        })
        .on('mouseenter', function (event: MouseEvent, d) {
          const hoverWidth = selected ? 4 : 3
          d3.select(this).selectAll('path:last-child').attr('stroke-width', hoverWidth).attr('opacity', 1)
          const rect = svgRef.current!.getBoundingClientRect()
          setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, activity: d.activity })
        })
        .on('mouseleave', function (_event: MouseEvent, d) {
          const baseWidth = selected ? 3 : 2
          d3.select(this).selectAll('path:last-child').attr('stroke-width', baseWidth).attr('opacity', 0.9)
          setTooltip(null)
        })
        .on('click', function (event: MouseEvent, d) {
          event.stopPropagation()
          onToggleRosterRef.current?.(d.activity.id)
        })
        .on('contextmenu', function (event: MouseEvent, d) {
          event.preventDefault()
          event.stopPropagation()
          window.open(`https://www.strava.com/activities/${d.activity.id}`, '_blank', 'noopener')
        })
    }

    renderCrosses(outBoundsUnselected, false)
    renderCrosses(outBoundsSelected, true)

  }, [activities, xAxis, yAxis, athlete, showWMA, showWMAContours, showPareto, colorMetric, colorScheme, viewDomain, roster, colorMap, units, paretoFront, isDark])

  const autoScale = () => setViewDomain(null)

  return (
    <div className="flex flex-col h-full select-none">
      {/* Controls — two rows */}
      <div className="flex flex-col gap-1.5 p-3 border-b border-gray-100 dark:border-gray-700">

        {/* Row 1: axes */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* X axis */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-4">X</span>
            <select
              value={xAxis}
              onChange={(e) => onViewStateChange({ ...viewState, xAxis: e.target.value as MetricKey, viewDomain: null })}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {METRIC_OPTIONS.map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          {/* Y axis */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-4">Y</span>
            <select
              value={yAxis}
              onChange={(e) => onViewStateChange({ ...viewState, yAxis: e.target.value as YAxis, viewDomain: null })}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {Y_AXIS_OPTIONS.map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          {/* Auto-scale button — always available */}
          <button
            onClick={autoScale}
            className="px-2 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-orange-400 hover:text-orange-600 transition-colors"
            title="Re-fit axes to current data"
          >
            Auto-scale
          </button>
          {viewDomain && (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">or double-click plot</span>
          )}

          {/* WMA toggle */}
          {showWMA && xAxis === 'distance' && (yAxis === 'average_pace' || yAxis === 'elapsed_pace') && (
            (athlete?.dateOfBirth || athlete?.age) && athlete?.sex ? (
              <button
                onClick={() => setShowWMAContours((v) => !v)}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                  showWMAContours
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'border-gray-300 text-gray-400'
                }`}
                title={showWMAContours ? 'Hide WMA contours' : 'Show WMA contours'}
              >
                WMA
              </button>
            ) : (
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto self-center">
                Set date of birth/sex in Settings for WMA contours
              </span>
            )
          )}

          {/* Pareto toggle */}
          <button
            onClick={() => setShowPareto((v) => !v)}
            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
              showPareto
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
            }`}
            title={showPareto ? 'Hide Pareto front' : 'Show Pareto front'}
          >
            Pareto
          </button>
        </div>

        {/* Row 2: colour */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Color</span>
          <select
            value={colorMetric}
            onChange={(e) => onViewStateChange({ ...viewState, colorMetric: e.target.value as ColorMetric })}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            <option value="index">Chronological</option>
            {METRIC_OPTIONS.map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <select
            value={colorScheme}
            onChange={(e) => onViewStateChange({ ...viewState, colorScheme: e.target.value as ColorScheme })}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map((scheme) => (
              <option key={scheme} value={scheme}>{scheme}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Plot */}
      <div
        ref={containerRef}
        className="flex-1 relative min-h-0"
        onDoubleClick={autoScale}
      >
        <svg ref={svgRef} className="w-full h-full" data-testid="scatter-svg" />

        {/* Zoom / scale hint */}

        {/* Tooltip */}
        {tooltip && (() => {
          const act = tooltip.activity
          const age = athlete?.dateOfBirth
            ? ageAtDate(athlete.dateOfBirth, act.start_date)
            : null
          const ageGrade = age !== null && athlete?.sex && act.distance > 0 && act.moving_time > 0
            ? computeAgeGrade(athlete.sex, age, act.distance, act.moving_time)
            : null
          return (
            <div
              className="absolute pointer-events-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 text-sm z-10 max-w-xs"
              style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
            >
              <p className="font-semibold text-gray-800 dark:text-gray-100">{act.name}</p>
              <p className="text-gray-500 dark:text-gray-400">
                {new Date(act.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-gray-600 dark:text-gray-300">{formatDistance(act.distance, units)}</p>
              {act.moving_time > 0 && (
                <p className="text-gray-600">
                  {(() => {
                    const t = act.moving_time
                    const h = Math.floor(t / 3600)
                    const m = Math.floor((t % 3600) / 60)
                    const s = t % 60
                    return h > 0
                      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                      : `${m}:${String(s).padStart(2, '0')}`
                  })()}
                </p>
              )}
              {act.average_speed > 0 && (
                <p className="text-gray-600 dark:text-gray-300">
                  {(() => {
                    const pace = 1000 / act.average_speed
                    return formatPace(pace, units)
                  })()}
                </p>
              )}
              {age !== null && (
                <p className="text-gray-600 dark:text-gray-300">Age: {age}</p>
              )}
              {ageGrade !== null && (
                <p className="text-gray-600 dark:text-gray-300">Age grade: {ageGrade.toFixed(1)}%</p>
              )}
              {paretoFront.has(act.id) && (
                <p className="text-xs text-gray-700 dark:text-gray-200 font-medium">★ Pareto front</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 pt-1 border-t border-gray-100 dark:border-gray-600">Right click to view in Strava</p>
            </div>
          )
        })()}

        {activities.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
            No activities match the current filters
          </div>
        )}
      </div>
    </div>
  )
}
