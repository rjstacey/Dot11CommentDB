import React from 'react';
import { createSelector } from '@reduxjs/toolkit';
import { DateTime } from 'luxon';
import * as d3 from 'd3';

import { useAppSelector } from '../store/hooks';

import { selectMeetingIds, selectMeetingEntities } from '../store/meetings';
import { selectBreakoutEntities } from '../store/imatBreakouts';
import { selectMeetingAttendanceCountsByBreakout } from '../store/imatMeetingAttendance';
import { selectGroupEntities } from '../store/groups';

import { useDimensions } from './SessionAttendanceChart';

type Entity = {
    date: string;
    label: string;
    color: string;
    attendanceCount: number;
}

const selectAttendanceSeriesInfo = createSelector(
    selectMeetingIds,
    selectMeetingEntities,
    selectBreakoutEntities,
    selectGroupEntities,
    selectMeetingAttendanceCountsByBreakout,
    (meetingIds, meetingEntities, breakoutEntities, groupEntities, attendanceCountsByBreakout) => {

        const seriesEntities = meetingIds.reduce((seriesEntities, meetingId) => {
            const meeting = meetingEntities[meetingId]!;
            const breakout = meeting.imatBreakoutId && breakoutEntities[meeting.imatBreakoutId];
            if (!meeting.isCancelled && breakout) {
                const attendanceCount = attendanceCountsByBreakout[breakout.id] || 0;
                const date = '' + DateTime.fromISO(breakout.start).toISODate();
                const label = meeting.summary;
                const group = meeting.organizationId && groupEntities[meeting.organizationId];
                const color = group? group.color: 'yellow';
                const entry = {date, label, color, attendanceCount};
                seriesEntities[meeting.id] = entry;
            }
            return seriesEntities;
        }, {} as Record<string, Entity>);

        const seriesIds = Object.keys(seriesEntities).sort((id1, id2) => {
            const t1 = DateTime.fromISO(meetingEntities[id1]!.start).toMillis();
            const t2 = DateTime.fromISO(meetingEntities[id2]!.start).toMillis();
            return t1 - t2;
        });

        const maxValue = d3.max(seriesIds, id => seriesEntities[id].attendanceCount) || 0;

        return {seriesIds, seriesEntities, maxValue}
    }
)

function TeleconAttendanceChart({
    style
}: {
    style?: React.CSSProperties;
}) {
    const divRef = React.useRef<HTMLDivElement>(null);
    const xAxisRef = React.useRef<SVGGElement>(null);

    const {width, height} = useDimensions(divRef);
    const yAxisWidth = 50;
    const xAxisHeight = (useDimensions(xAxisRef).height + 10) || 120;
    const plotWidth = width - yAxisWidth;
    const plotHeight = height - xAxisHeight;
    console.log(xAxisHeight)

    const {seriesIds, seriesEntities, maxValue} = useAppSelector(selectAttendanceSeriesInfo);

    const yScale = React.useMemo(() => {
        return d3.scaleLinear().domain([0, maxValue]).range([plotHeight, 0]);
    }, [maxValue, plotHeight])

    const yAxis = yScale
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
        ));

    const xScale = React.useMemo(() => {
        return d3.scaleBand().domain(seriesIds).range([0, plotWidth]).padding(0.2);
    }, [seriesIds, plotWidth]);
    
    const xAxis = seriesIds
        .map(id =>
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
        );

    const plotArea = seriesIds
        .map(id => {
            const entity = seriesEntities[id];
            return (
                <g key={id}>
                    <rect
                        x={xScale(id)}
                        y={yScale(entity.attendanceCount)}
                        width={xScale.bandwidth()}
                        height={yScale(0)-yScale(entity.attendanceCount)}
                        fill={entity.color}
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
        })

    return (
        <div
            ref={divRef}
            style={{...style}}
        >
            <svg style={{width, height, overflow: 'visible'}}>
                <g>{yAxis}</g>
                <g ref={xAxisRef} transform={`translate(${yAxisWidth},${height-xAxisHeight})`}>{xAxis}</g>
                <g transform={`translate(${yAxisWidth},0)`}>{plotArea}</g>
            </svg>
        </div>
    )
}

export default TeleconAttendanceChart;
