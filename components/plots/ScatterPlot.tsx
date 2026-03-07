'use client'

import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import type { StravaActivity, MetricKey, Athlete } from '../../lib/strava/types'
import { getMetricValue, METRIC_LABELS } from '../../lib/strava/types'
import { generateAgeGradeContour } from '../../lib/wma/ageGrade'

type YAxis = MetricKey
type ColorMetric = MetricKey | 'index'
type ColorScheme = 'Oranges' | 'Viridis' | 'Cool' | 'Plasma'

const COLOR_SCHEMES: Record<ColorScheme, (t: number) => string> = {
  Oranges: d3.interpolateOranges,
  Viridis: d3.interpolateViridis,
  Cool: d3.interpolateCool,
  Plasma: d3.interpolatePlasma,
}

const CONTOUR_GRADES = Array.from({ length: 21 }, (_, i) => 50 + i * 2)
const CONTOUR_COLORS = CONTOUR_GRADES.map((_, i) =>
  d3.interpolateGreens(0.25 + (i / 20) * 0.65)
)

const MARGIN = { top: 20, right: 80, bottom: 50, left: 70 }

// MetricKey entries for axis/color selectors
const METRIC_OPTIONS = Object.entries(METRIC_LABELS) as [MetricKey, string][]

interface ScatterPlotProps {
  activities: StravaActivity[]
  athlete: Athlete | null
  showWMA?: boolean
  roster?: Set<number>
  onToggleRoster?: (id: number) => void
  colorMap?: Map<number, string>
}

export function ScatterPlot({ activities, athlete, showWMA = true, roster, onToggleRoster, colorMap }: ScatterPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Stable ref for the toggle callback — keeps it out of the useEffect dep array
  const onToggleRosterRef = useRef(onToggleRoster)
  useEffect(() => { onToggleRosterRef.current = onToggleRoster }, [onToggleRoster])

  const [xAxis, setXAxis] = useState<MetricKey>('distance')
  const [yAxis, setYAxis] = useState<YAxis>('average_pace')
  const [colorMetric, setColorMetric] = useState<ColorMetric>('index')
  const [colorScheme, setColorScheme] = useState<ColorScheme>('Oranges')
  // viewDomain: stable scale — null triggers a fit from data then locks.
  // Does NOT auto-update when activities (filter) changes, preventing unwanted rescales.
  const [viewDomain, setViewDomain] = useState<{ x: [number, number]; y: [number, number] } | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; activity: StravaActivity } | null>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return
    if (activities.length === 0) return

    const isPace = yAxis === 'average_pace'

    const getYValue = (a: StravaActivity): number | null => getMetricValue(a, yAxis)

    const plotActivities = activities

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

    const xVals = plotActivities.map((a) => getMetricValue(a, xAxis))
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
      .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', '#e5e7eb') })

    g.append('g')
      .attr('class', 'grid-y')
      .call(d3.axisLeft(yScale).ticks(12).tickSize(-innerW).tickFormat(() => ''))
      .call((gr) => { gr.select('.domain').remove(); gr.selectAll('line').attr('stroke', '#e5e7eb') })

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(16))
      .call((ax) =>
        ax.append('text')
          .attr('x', innerW / 2).attr('y', 40)
          .attr('fill', '#6b7280').attr('text-anchor', 'middle').attr('font-size', '12px')
          .text(METRIC_LABELS[xAxis])
      )

    // Y axis
    const yFmt = isPace
      ? (d: d3.NumberValue) => {
          const s = Number(d)
          return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
        }
      : undefined

    const yLabel = METRIC_LABELS[yAxis]

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(12).tickFormat(yFmt as never))
      .call((ax) =>
        ax.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -innerH / 2).attr('y', -55)
          .attr('fill', '#6b7280').attr('text-anchor', 'middle').attr('font-size', '12px')
          .text(yLabel)
      )

    // WMA contours (distance × average_pace only)
    if (showWMA && xAxis === 'distance' && yAxis === 'average_pace' && athlete?.sex && athlete?.age) {
      const contourDistances = d3.range(xScale.domain()[0] * 1000, xScale.domain()[1] * 1000, 500)

      CONTOUR_GRADES.forEach((grade, i) => {
        const pts = generateAgeGradeContour(athlete.sex!, athlete.age!, grade, contourDistances)
        const isMajor = grade % 10 === 0

        const lineGen = d3.line<{ distance: number; pace: number }>()
          .x((d) => xScale(d.distance / 1000))
          .y((d) => yScale(d.pace))
          .defined((d) => {
            const sy = yScale(d.pace)
            return isFinite(d.pace) && sy >= 0 && sy <= innerH
          })

        g.append('path')
          .datum(pts)
          .attr('fill', 'none')
          .attr('stroke', CONTOUR_COLORS[i])
          .attr('stroke-width', isMajor ? 1.8 : 1)
          .attr('stroke-dasharray', isMajor ? '4 3' : '2 2')
          .attr('d', lineGen)

        if (isMajor) {
          const lastVisible = pts.filter((d) => {
            const sy = yScale(d.pace)
            return isFinite(d.pace) && sy >= 0 && sy <= innerH && xScale(d.distance / 1000) <= innerW
          })
          if (lastVisible.length > 0) {
            const last = lastVisible[lastVisible.length - 1]
            g.append('text')
              .attr('x', xScale(last.distance / 1000) + 4)
              .attr('y', yScale(last.pace))
              .attr('font-size', '10px').attr('fill', CONTOUR_COLORS[i])
              .attr('dominant-baseline', 'middle')
              .text(`${grade}%`)
          }
        }
      })
    }

    // Brush → zoom (distance × pace only)
    if (isPace && xAxis === 'distance') {
      const brushGroup = g.append('g').attr('class', 'brush')
      const brush = d3.brush()
        .extent([[0, 0], [innerW, innerH]])
        .on('end', (event) => {
          if (!event.sourceEvent || !event.selection) return
          const [[px0, py0], [px1, py1]] = event.selection as [[number, number], [number, number]]
          // newY: always [invert(bottom), invert(top)] so domain direction is preserved
          // for inverted scale (pace): [slow, fast]; for normal: [small, large]
          setViewDomain({
            x: [xScale.invert(px0), xScale.invert(px1)],
            y: [yScale.invert(py1), yScale.invert(py0)],
          })
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

    let colorFn: (a: StravaActivity, i: number) => string
    if (colorMetric === 'index') {
      // Reverse domain so recent runs (low index) are darker
      const cs = d3.scaleSequential(COLOR_SCHEMES[colorScheme]).domain([plotActivities.length, 0])
      colorFn = (_, i) => cs(i)
    } else {
      const cVals = plotActivities.map((a) => getMetricValue(a, colorMetric as MetricKey))
      const cs = d3.scaleSequential(COLOR_SCHEMES[colorScheme])
        .domain([d3.min(cVals)!, d3.max(cVals)!])
      colorFn = (a) => cs(getMetricValue(a, colorMetric as MetricKey))
    }

    // Precompute pixel positions and whether each point is within the plot area
    type PlotDatum = { activity: StravaActivity; rawCx: number; rawCy: number; cx: number; cy: number; oob: boolean; idx: number }
    const plotData: PlotDatum[] = plotActivities.map((a, idx) => {
      const rawCx = xScale(getMetricValue(a, xAxis))
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

    // ── In-bounds: circles (unselected, then selected) ───────────────────────
    const renderCircles = (data: typeof inBoundsData, selected: boolean) => {
      dotsGroup.selectAll(selected ? 'circle.selected' : 'circle.unselected')
        .data(data)
        .join('circle')
        .attr('class', selected ? 'selected' : 'unselected')
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
        .on('mouseleave', function (event: MouseEvent, d) {
          d3.select(this).attr('r', selected ? 8 : 5).attr('opacity', 0.9)
          setTooltip(null)
        })
    }

    renderCircles(inBoundsUnselected, false)
    renderCircles(inBoundsSelected, true)

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

  }, [activities, xAxis, yAxis, athlete, showWMA, colorMetric, colorScheme, viewDomain, roster, colorMap])

  const autoScale = () => setViewDomain(null)

  return (
    <div className="flex flex-col h-full">
      {/* Controls — two rows */}
      <div className="flex flex-col gap-1.5 p-3 border-b border-gray-100">

        {/* Row 1: axes */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* X axis */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 w-4">X</span>
            <select
              value={xAxis}
              onChange={(e) => { setXAxis(e.target.value as MetricKey); setViewDomain(null) }}
              className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {METRIC_OPTIONS.map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          {/* Y axis */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 w-4">Y</span>
            <select
              value={yAxis}
              onChange={(e) => { setYAxis(e.target.value as YAxis); setViewDomain(null) }}
              className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              {METRIC_OPTIONS.map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          {/* Auto-scale button — always available */}
          <button
            onClick={autoScale}
            className="px-2 py-0.5 text-xs rounded border border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-600 transition-colors"
            title="Re-fit axes to current data"
          >
            Auto-scale
          </button>

          {/* WMA note */}
          {showWMA && xAxis === 'distance' && yAxis === 'average_pace' && (
            <span className="text-xs text-gray-400 ml-auto self-center">
              {athlete?.age && athlete?.sex
                ? `WMA contours: age ${athlete.age}, ${athlete.sex}`
                : 'Set age/sex in Settings for WMA contours'}
            </span>
          )}
        </div>

        {/* Row 2: colour */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-gray-500">Color</span>
          <select
            value={colorMetric}
            onChange={(e) => setColorMetric(e.target.value as ColorMetric)}
            className="text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            <option value="index">Chronological</option>
            {METRIC_OPTIONS.map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <div className="flex gap-1">
            {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map((scheme) => (
              <button
                key={scheme}
                onClick={() => setColorScheme(scheme)}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                  colorScheme === scheme
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-300 text-gray-500 hover:border-orange-300'
                }`}
              >
                {scheme}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Plot */}
      <div
        ref={containerRef}
        className="flex-1 relative min-h-0"
        onDoubleClick={autoScale}
        title="Double-click to auto-scale"
      >
        <svg ref={svgRef} className="w-full h-full" />

        {/* Zoom / scale hint */}

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm z-10"
            style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
          >
            <p className="font-semibold text-gray-800 truncate max-w-48">{tooltip.activity.name}</p>
            <p className="text-gray-500">
              {new Date(tooltip.activity.start_date).toLocaleDateString()}
            </p>
            <p className="text-gray-600">{(tooltip.activity.distance / 1000).toFixed(2)} km</p>
            {tooltip.activity.average_speed > 0 && (
              <p className="text-gray-600">
                {(() => {
                  const pace = 1000 / tooltip.activity.average_speed
                  return `${Math.floor(pace / 60)}:${String(Math.round(pace % 60)).padStart(2, '0')} /km avg`
                })()}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1 pt-1 border-t border-gray-100">Right click to view in Strava</p>
          </div>
        )}

        {activities.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            No activities match the current filters
          </div>
        )}
      </div>
    </div>
  )
}
