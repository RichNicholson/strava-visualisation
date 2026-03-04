'use client'

import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import type { StravaActivity, MetricKey, Athlete } from '../../lib/strava/types'
import { getMetricValue, METRIC_LABELS } from '../../lib/strava/types'
import { generateAgeGradeContour, WMA_DISTANCES } from '../../lib/wma/ageGrade'
import { AxisSelector } from './AxisSelector'

interface ScatterPlotProps {
  activities: StravaActivity[]
  athlete: Athlete | null
  showWMA?: boolean
}

const CONTOUR_GRADES = [40, 50, 60, 70, 80, 90]
const CONTOUR_COLORS = ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#66bb6a', '#43a047', '#2e7d32']

const MARGIN = { top: 20, right: 80, bottom: 50, left: 70 }

export function ScatterPlot({ activities, athlete, showWMA = true }: ScatterPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [xAxis, setXAxis] = useState<MetricKey>('distance')
  const [yAxis, setYAxis] = useState<MetricKey>('average_pace')
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; activity: StravaActivity
  } | null>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return
    if (activities.length === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight
    const innerW = width - MARGIN.left - MARGIN.right
    const innerH = height - MARGIN.top - MARGIN.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    const xVals = activities.map((a) => getMetricValue(a, xAxis))
    const yVals = activities.map((a) => getMetricValue(a, yAxis))

    const xScale = d3
      .scaleLinear()
      .domain([d3.min(xVals)! * 0.95, d3.max(xVals)! * 1.05])
      .range([0, innerW])
      .nice()

    // For pace: invert Y axis (lower pace = faster = better, shown at top)
    const isPace = yAxis === 'average_pace'
    const yDomain: [number, number] = isPace
      ? [d3.max(yVals)! * 1.05, d3.min(yVals)! * 0.95]
      : [d3.min(yVals)! * 0.95, d3.max(yVals)! * 1.05]

    const yScale = d3.scaleLinear().domain(yDomain).range([innerH, 0]).nice()

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(8))
      .call((ax) =>
        ax.append('text')
          .attr('x', innerW / 2)
          .attr('y', 40)
          .attr('fill', '#6b7280')
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .text(METRIC_LABELS[xAxis])
      )

    // Y axis
    const yFmt = isPace
      ? (d: d3.NumberValue) => {
          const s = Number(d)
          return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
        }
      : undefined

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6).tickFormat(yFmt as never))
      .call((ax) =>
        ax.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', -innerH / 2)
          .attr('y', -55)
          .attr('fill', '#6b7280')
          .attr('text-anchor', 'middle')
          .attr('font-size', '12px')
          .text(METRIC_LABELS[yAxis])
      )

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScale)
          .ticks(6)
          .tickSize(-innerW)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#f3f4f6')

    // WMA contour lines (only shown when Y = pace and X = distance)
    if (showWMA && isPace && xAxis === 'distance' && athlete?.sex && athlete?.age) {
      const contourDistances = d3.range(
        xScale.domain()[0] * 1000,
        xScale.domain()[1] * 1000,
        500
      )

      CONTOUR_GRADES.forEach((grade, i) => {
        const pts = generateAgeGradeContour(
          athlete.sex!,
          athlete.age!,
          grade,
          contourDistances
        )

        const lineGen = d3
          .line<{ distance: number; pace: number }>()
          .x((d) => xScale(d.distance / 1000))
          .y((d) => yScale(d.pace))
          .defined((d) => isFinite(d.pace) && yScale(d.pace) >= 0 && yScale(d.pace) <= innerH)

        g.append('path')
          .datum(pts)
          .attr('fill', 'none')
          .attr('stroke', CONTOUR_COLORS[i])
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4 3')
          .attr('d', lineGen)

        // Label at right edge
        const lastVisible = pts.filter((d) => {
          const sy = yScale(d.pace)
          return isFinite(d.pace) && sy >= 0 && sy <= innerH
        })
        if (lastVisible.length > 0) {
          const last = lastVisible[lastVisible.length - 1]
          g.append('text')
            .attr('x', xScale(last.distance / 1000) + 4)
            .attr('y', yScale(last.pace))
            .attr('font-size', '10px')
            .attr('fill', CONTOUR_COLORS[i])
            .attr('dominant-baseline', 'middle')
            .text(`${grade}%`)
        }
      })
    }

    // Dots
    const colorScale = d3.scaleSequential(d3.interpolateOranges).domain([0, activities.length])

    g.selectAll('circle')
      .data(activities)
      .join('circle')
      .attr('cx', (a) => xScale(getMetricValue(a, xAxis)))
      .attr('cy', (a) => yScale(getMetricValue(a, yAxis)))
      .attr('r', 5)
      .attr('fill', (_, i) => colorScale(i))
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event: MouseEvent, a: StravaActivity) {
        d3.select(this).attr('r', 7).attr('opacity', 1)
        const rect = svgRef.current!.getBoundingClientRect()
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          activity: a,
        })
      })
      .on('mouseleave', function () {
        d3.select(this).attr('r', 5).attr('opacity', 0.85)
        setTooltip(null)
      })
  }, [activities, xAxis, yAxis, athlete, showWMA])

  return (
    <div className="flex flex-col h-full">
      {/* Axis selectors */}
      <div className="flex gap-4 p-3 border-b border-gray-100">
        <AxisSelector label="X" value={xAxis} onChange={setXAxis} />
        <AxisSelector label="Y" value={yAxis} onChange={setYAxis} />
        {showWMA && athlete?.age && athlete?.sex ? (
          <span className="text-xs text-gray-400 self-center">
            WMA contours: age {athlete.age}, {athlete.sex}
          </span>
        ) : showWMA ? (
          <span className="text-xs text-amber-500 self-center">
            Set your age and sex in Settings to enable age-grade contours
          </span>
        ) : null}
      </div>

      {/* Plot */}
      <div ref={containerRef} className="flex-1 relative min-h-0">
        <svg ref={svgRef} className="w-full h-full" />

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
            <p className="text-gray-600">
              {(tooltip.activity.distance / 1000).toFixed(2)} km
            </p>
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
