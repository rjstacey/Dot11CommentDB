import React from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';
import * as d3 from 'd3';

import { useAppSelector } from '../store/hooks';

import { selectMeetingIds, selectMeetingEntities } from '../store/meetings';
import { selectBreakoutTimeslots, selectBreakoutEntities } from '../store/imatBreakouts';
import { selectMeetingAttendanceCountsByBreakout } from '../store/imatMeetingAttendance';
import { selectGroupEntities } from '../store/groups';

interface F { (element: HTMLElement, text: string): number; canvas?: HTMLCanvasElement; }
export const getTextWidth: F = function(element, text) {
    const styleDeclaration = window.getComputedStyle(element, null);
    const fontWeight = styleDeclaration.getPropertyValue('font-weight') || 'normal';
    const fontSize = styleDeclaration.getPropertyValue('font-size') || '16px';
    const fontFamily =styleDeclaration.getPropertyValue('font-family') || 'Times New Roman';
    const font = `${fontWeight} ${fontSize} ${fontFamily}`;

    const canvas: HTMLCanvasElement = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d")!;
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
}

function getDimensions(element: HTMLElement | SVGElement | null) {
    return element?
        element.getBoundingClientRect():
        {width: 0, height: 0}
}

export function useDimensions(targetRef: React.RefObject<HTMLElement | SVGElement>) {

    const [dimensions, setDimensions] = React.useState(() => getDimensions(targetRef.current));

    React.useEffect(() => {
        const handleResize = () => {setDimensions(getDimensions(targetRef.current))};
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [targetRef]);

    React.useLayoutEffect(() => setDimensions(getDimensions(targetRef.current)), [targetRef]);

    return dimensions;
}

type EntityItem = {
    label: string;
    date: string;
    slotName: string;
    startTime: string;
    color: string;
    attendanceCount: number;
}

type DataItem = EntityItem & {
    high: number;
    low: number;
}

const selectAttendanceSeriesInfo = createSelector(
    selectMeetingIds,
    selectMeetingEntities,
    selectBreakoutTimeslots,
    selectBreakoutEntities,
    selectGroupEntities,
    selectMeetingAttendanceCountsByBreakout,
    (meetingIds, meetingEntities, timeslots, breakoutEntities, groupEntities, attendanceCountsByBreakout) => {
        const seriesEntities = meetingIds.reduce((seriesEntities, meetingId) => {
            const meeting = meetingEntities[meetingId]!;
            const breakout = meeting.imatBreakoutId && breakoutEntities[meeting.imatBreakoutId];
            const group = meeting.organizationId && groupEntities[meeting.organizationId];
            if (!meeting.isCancelled && breakout) {
                const attendanceCount = attendanceCountsByBreakout[breakout.id] || 0;
                const slot = timeslots.find(slot => slot.id === breakout.startSlotId);
                const color = group? group.color: 'yellow';
                if (slot) {
                    const date = '' + DateTime.fromISO(breakout.start).toISODate();
                    const slotName = slot.name;
                    const seriesId = date + ' ' + slot.name;
                    const entry = {label: meeting.summary, date, slotName, startTime: slot.startTime, color, attendanceCount};
                    if (seriesEntities[seriesId])
                        seriesEntities[seriesId] = [...seriesEntities[seriesId], entry];
                    else
                        seriesEntities[seriesId] = [entry];
                }
            }
            return seriesEntities;
        }, {} as Record<string, EntityItem[]>);

        const seriesIds = Object.keys(seriesEntities).sort((seriesId_a, seriesId_b) => {
            const entry_a = seriesEntities[seriesId_a]![0];
            const entry_b = seriesEntities[seriesId_b]![0];
            if (entry_a.date === entry_b.date)
                return entry_a.startTime.localeCompare(entry_b.startTime);
            return entry_a.date.localeCompare(entry_b.date);
        });

        const seriesData = seriesIds.map((seriesId, currentIndex) => {
            let low = 0;
            const items = seriesEntities[seriesId]
                .sort((a,b) => b.attendanceCount - a.attendanceCount)
                .map((entry) => {
                    const item: DataItem = {...entry, low, high: low + entry.attendanceCount};
                    low += entry.attendanceCount;
                    return item;
                })
            let label: string;
            if (seriesIds.find((seriesId, i) => i < currentIndex && seriesEntities[seriesId][0].date === items[0].date))
                label = items[0].slotName;
            else
                label = DateTime.fromISO(items[0].date).weekdayLong + ', ' + items[0].slotName;
            return {id: seriesId, label, items};
        });

        const maxCount = d3.max(seriesData, entry => entry.items[entry.items.length - 1].high) || 0;

        return {seriesIds, seriesData, maxCount}
    }
)

function SessionAttendanceChart({
    style
}: {
    style?: React.CSSProperties;
}) {
    const divRef = React.useRef<HTMLDivElement>(null);

    const {width, height} = useDimensions(divRef);
    const yAxisWidth = 120;
    const xAxisHeight = 40;
    const plotWidth = width - yAxisWidth;
    const plotHeight = height - xAxisHeight;
    //console.log(width, plotWidth)

    const {seriesIds, seriesData, maxCount} = useAppSelector(selectAttendanceSeriesInfo);

    const xScale = React.useMemo(() => {
        return d3.scaleLinear().domain([0, maxCount]).range([0, plotWidth]);
    }, [maxCount, plotWidth])

    const xAxis = xScale
        .ticks(5)
        .slice(1)
        .map((value, i) => (
            <g key={i}>
                <line
                    y1={-plotHeight + 10}
                    y2={0}
                    x1={xScale(value)}
                    x2={xScale(value)}
                    stroke="#808080"
                    opacity={0.2}
                />
                <text
                    y={0}
                    x={xScale(value)}
                    textAnchor="middle"
                    alignmentBaseline="central"
                    fontSize={14}
                    opacity={0.8}
                >
                    {value}
                </text>
            </g>
        ));

    const yScale = React.useMemo(() => {
        return d3.scaleBand().domain(seriesIds).range([0, plotHeight]).padding(0.5);
    }, [seriesIds, plotHeight]);
    
    const yAxis = seriesData
        .map((series, i) => (
            <text
                key={i}
                x={yAxisWidth - 10}
                y={yScale(series.id)! + yScale.bandwidth()/2}
                textAnchor="end"
                alignmentBaseline="central"
                fontSize={14}
                //transform={'rotate(-90)'}
            >
                {series.label}
            </text>
        ));

    const plotArea = seriesData
        .map((series) => {
            let xTextEnd = 0;
            return series.items.map((item, itemIndex) => {
                let xText = xScale(item.low);
                //console.log(divRef.current)
                if (xText < xTextEnd)
                    xText = xTextEnd;
                xTextEnd = xText + (divRef.current? getTextWidth(divRef.current, item.label + ' '): 0);
                return (
                    <>
                        <rect
                            key={`r${series.id}-${itemIndex}`}
                            x={xScale(item.low)}
                            y={yScale(series.id)}
                            height={yScale.bandwidth()}
                            width={xScale(item.high) - xScale(item.low)}
                            fill={item.color}
                            opacity={0.8}
                        />
                        <text
                            key={`t${series.id}-${itemIndex}`}
                            x={xText}
                            y={yScale(series.id)}
                            alignmentBaseline="after-edge"
                        >
                            {item.label}
                        </text>
                    </>
                )
            })
        })

    return (
        <div
            ref={divRef}
            style={{...style, width: '100%'}}
        >
            <svg style={{width, height, overflow: 'visible'}}>
                <g key='y-axis'>{yAxis}</g>
                <g key='x-axis' transform={`translate(${yAxisWidth},${height-xAxisHeight})`}>{xAxis}</g>
                <g key='plot' transform={`translate(${yAxisWidth},0)`}>{plotArea}</g>
            </svg>
        </div>
    )
}

export default SessionAttendanceChart;
