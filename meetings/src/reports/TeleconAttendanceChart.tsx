import * as React from 'react';
import { createSelector } from '@reduxjs/toolkit';
import * as d3 from 'd3';

import { useAppSelector } from '../store/hooks';

import { useDimensions, selectBreakoutAttendanceEntries, type BreakoutAttendanceEntry } from './SessionAttendanceChart';
import type { ReportChartProps } from './Reports';

const selectAttendanceSeriesInfo = createSelector(
    selectBreakoutAttendanceEntries,
    (entries) => {

        const seriesEntities = entries.reduce((seriesEntities, entry, i) => {
            seriesEntities[i] = entry;
            return seriesEntities;
        }, {} as Record<string, BreakoutAttendanceEntry>);

        // Sort by date and time
        const seriesIds = Object.keys(seriesEntities).sort((id1, id2) => {
            const { date: d1, startTime: t1 } = seriesEntities[id1];
            const { date: d2, startTime: t2 } = seriesEntities[id2];
            if (d1 === d2)
                return t1.localeCompare(t2);
            return d1.localeCompare(d2);
        });

        const maxValue = d3.max(seriesIds, id => seriesEntities[id].attendanceCount) || 0;

        return {seriesIds, seriesEntities, maxValue}
    }
)

function TeleconAttendanceChart({
    width,
    height,
    svgRef
}: ReportChartProps) {
    const xAxisRef = React.useRef<SVGGElement>(null);

    const yAxisWidth = 50;
    const xAxisHeight = (useDimensions(xAxisRef).height + 10) || 120;
    const plotWidth = width - yAxisWidth;
    const plotHeight = height - xAxisHeight;

    const {seriesIds, seriesEntities, maxValue} = useAppSelector(selectAttendanceSeriesInfo);

    const yScale = React.useMemo(() => {
        return d3.scaleLinear().domain([0, maxValue]).range([plotHeight, 0]);
    }, [maxValue, plotHeight])

    const yAxis = 
        <g>
            {yScale
                .ticks(5)
                .slice(1)
                .map((value, i) => (
                    <g key={i}>
                        <line
                            x1={yAxisWidth - 10}
                            x2={width}
                            y1={yScale(value)}
                            y2={yScale(value)}
                            stroke="#808080"
                            opacity={0.2}
                        />
                        <text
                            y={yScale(value)}
                            x={yAxisWidth - 15}
                            textAnchor="end"
                            alignmentBaseline="central"
                            fontSize={14}
                            opacity={0.8}
                        >
                            {value}
                        </text>
                    </g>
                ))}
        </g>

    const xScale = React.useMemo(() => {
        return d3.scaleBand().domain(seriesIds).range([0, plotWidth]).padding(0.2);
    }, [seriesIds, plotWidth]);
    
    const xAxis = 
        <g
            ref={xAxisRef}
            transform={`translate(${yAxisWidth},${height-xAxisHeight})`}
        >
            {seriesIds.map(id =>
                <text
                    key={id}
                    x={0}
                    y={0}
                    textAnchor="end"
                    alignmentBaseline="central"
                    fontSize={14}
                    transform={`translate(${xScale(id)! + xScale.bandwidth()/2},10)rotate(-90)`}
                >
                    {seriesEntities[id].date}
                </text>
            )}
        </g>

    const plotArea = 
        <g transform={`translate(${yAxisWidth},0)`}>
            {seriesIds.map(id => {
                const entity = seriesEntities[id];
                return (
                    <g key={id}>
                        <rect
                            x={xScale(id)}
                            y={yScale(entity.attendanceCount)}
                            width={xScale.bandwidth()}
                            height={yScale(0)-yScale(entity.attendanceCount)}
                            fill={entity.color}
                            stroke="grey"
                            rx="0.3%"
                        />
                        <text
                            x={0}
                            y={0}
                            textAnchor="start"
                            alignmentBaseline="central"
                            transform={`translate(${xScale(id)! + xScale.bandwidth()/2},${yScale(0) - 10})rotate(-90)`}
                        >
                            {entity.label}
                        </text>
                    </g>
                )
            })}
        </g>

    return (
        <svg
            ref={svgRef}
            style={{width, height}}
        >
            {yAxis}
            {xAxis}
            {plotArea}
        </svg>
    )
}

export default TeleconAttendanceChart;
