import * as React from "react";
import { createSelector, EntityId, Dictionary } from "@reduxjs/toolkit";
import { DateTime } from "luxon";
import * as d3 from "d3";

import { useAppSelector } from "../store/hooks";

import { selectMeetingEntities, type Meeting } from "../store/meetings";
import {
	selectBreakoutIds,
	selectBreakoutEntities,
	selectBreakoutTimeslots,
	type Breakout,
	type Timeslot,
} from "../store/imatBreakouts";
import { selectMeetingAttendanceCountsByBreakout } from "../store/imatMeetingAttendance";
import { Group, selectGroupEntities } from "../store/groups";

import type { ReportChartProps } from "./Reports";

interface F {
	(element: SVGElement, text: string): number;
	canvas?: HTMLCanvasElement;
}
export const getTextWidth: F = function (element, text) {
	const styleDeclaration = window.getComputedStyle(element, null);
	const fontWeight =
		styleDeclaration.getPropertyValue("font-weight") || "normal";
	const fontSize = styleDeclaration.getPropertyValue("font-size") || "16px";
	const fontFamily =
		styleDeclaration.getPropertyValue("font-family") || "Times New Roman";
	const font = `${fontWeight} ${fontSize} ${fontFamily}`;

	const canvas =
		getTextWidth.canvas ||
		(getTextWidth.canvas = document.createElement("canvas"));
	const context = canvas.getContext("2d")!;
	context.font = font;
	const metrics = context.measureText(text);
	return metrics.width;
};

function getDimensions(element: HTMLElement | SVGElement | null) {
	return element ? element.getBoundingClientRect() : { width: 0, height: 0 };
}

export function useDimensions(
	targetRef: React.RefObject<HTMLElement | SVGElement>
) {
	const [dimensions, setDimensions] = React.useState(() =>
		getDimensions(targetRef.current)
	);

	React.useEffect(() => {
		const handleResize = () => {
			setDimensions(getDimensions(targetRef.current));
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [targetRef]);

	React.useLayoutEffect(
		() => setDimensions(getDimensions(targetRef.current)),
		[targetRef]
	);

	return dimensions;
}

export type BreakoutAttendanceEntry = {
	label: string;
	date: string;
	slotName: string;
	startTime: string;
	color: string;
	attendanceCount: number;
};

export function generateBreakoutAttendanceEntries(
	breakoutIds: EntityId[],
	breakoutEntities: Dictionary<Breakout>,
	timeslots: Timeslot[],
	meetingEntities: Dictionary<Meeting>,
	groupEntities: Dictionary<Group>,
	attendanceCountEntities: Record<number, number>
): BreakoutAttendanceEntry[] {
	const groups: Group[] = Object.values<any>(groupEntities);

	const entries: BreakoutAttendanceEntry[] = [];

	// Create series entities from breakouts
	breakoutIds.forEach((breakoutId) => {
		const breakout = breakoutEntities[breakoutId]!;
		const meeting = Object.values(meetingEntities).find(
			(m) => m?.imatBreakoutId === breakoutId
		);
		let group: Group | undefined, isCancelled: boolean, label: string;
		if (meeting) {
			// If there is a meeting associated with the breakout, then use information from the meeting
			isCancelled =
				meeting.isCancelled ||
				breakout.name.search(/cancelled|canceled/i) >= 0;
			group = meeting.organizationId
				? groupEntities[meeting.organizationId]
				: undefined;
			label = meeting.summary;
		} else {
			// If there is no meeting, try to figure things out
			isCancelled = breakout.name.search(/cancelled|canceled/i) >= 0;
			let groupName = breakout.name;
			const m = groupName.match(/(cancelled|canceled)[-\s]*(.*)/i);
			if (m) groupName = m[2];

			group = groups.find((g) => g.name === groupName);
			if (!group)
				group = groups.find((g) => g.name.startsWith(groupName));
			label = groupName;
		}
		if (!isCancelled) {
			const attendanceCount = attendanceCountEntities[breakout.id] || 0;
			const slot = timeslots.find(
				(slot) => slot.id === breakout.startSlotId
			);
			const color = group?.color || "yellow";
			if (attendanceCount && slot) {
				const entry = {
					label,
					date: "" + DateTime.fromISO(breakout.start).toISODate(),
					slotName: slot.name,
					startTime: slot.startTime,
					color,
					attendanceCount,
				};
				entries.push(entry);
			}
		}
	});

	return entries;
}

export const selectBreakoutAttendanceEntries = createSelector(
	selectBreakoutIds,
	selectBreakoutEntities,
	selectBreakoutTimeslots,
	selectMeetingEntities,
	selectGroupEntities,
	selectMeetingAttendanceCountsByBreakout,
	generateBreakoutAttendanceEntries
);

type DataItem = BreakoutAttendanceEntry & {
	high: number;
	low: number;
};

const selectAttendanceSeriesInfo = createSelector(
	selectBreakoutAttendanceEntries,
	(entries) => {
		// Create series entities
		const seriesEntities = entries.reduce((seriesEntities, entry) => {
			const seriesId = entry.date + " " + entry.slotName;
			seriesEntities[seriesId] = (seriesEntities[seriesId] || []).concat(
				entry
			);
			return seriesEntities;
		}, {} as Record<string, BreakoutAttendanceEntry[]>);

		// Create a sorted list of series identifiers
		const seriesIds = Object.keys(seriesEntities).sort(
			(seriesId_a, seriesId_b) => {
				const entry_a = seriesEntities[seriesId_a]![0];
				const entry_b = seriesEntities[seriesId_b]![0];
				if (entry_a.date === entry_b.date)
					return entry_a.startTime.localeCompare(entry_b.startTime);
				return entry_a.date.localeCompare(entry_b.date);
			}
		);

		const seriesData = seriesIds.map((seriesId, currentIndex) => {
			let low = 0;
			const items = seriesEntities[seriesId]
				.sort((a, b) => b.attendanceCount - a.attendanceCount)
				.map((entry) => {
					const item: DataItem = {
						...entry,
						low,
						high: low + entry.attendanceCount,
					};
					low += entry.attendanceCount;
					return item;
				});
			let label: string;
			if (
				seriesIds.find(
					(seriesId, i) =>
						i < currentIndex &&
						seriesEntities[seriesId][0].date === items[0].date
				)
			)
				label = items[0].slotName;
			else
				label =
					DateTime.fromISO(items[0].date).weekdayLong +
					", " +
					items[0].slotName;
			return { id: seriesId, label, items };
		});

		const maxCount =
			d3.max(
				seriesData,
				(entry) => entry.items[entry.items.length - 1].high
			) || 0;

		return { seriesIds, seriesData, maxCount };
	}
);

function SessionAttendanceChart({ width, height, svgRef }: ReportChartProps) {
	const yAxisWidth = 120;
	const xAxisHeight = 40;
	const marginRight = 50; // For text overflow
	const plotWidth = width - yAxisWidth - marginRight;
	const plotHeight = height - xAxisHeight;

	const { seriesIds, seriesData, maxCount } = useAppSelector(
		selectAttendanceSeriesInfo
	);

	const xScale = React.useMemo(() => {
		return d3.scaleLinear().domain([0, maxCount]).range([0, plotWidth]);
	}, [maxCount, plotWidth]);

	const xAxis = (
		<g transform={`translate(${yAxisWidth},${height - xAxisHeight})`}>
			{xScale
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
				))}
		</g>
	);

	const yScale = React.useMemo(() => {
		return d3
			.scaleBand()
			.domain(seriesIds)
			.range([0, plotHeight])
			.padding(0.5);
	}, [seriesIds, plotHeight]);

	const yAxis = (
		<g>
			{seriesData.map((series, i) => (
				<text
					key={i}
					x={yAxisWidth - 10}
					y={yScale(series.id)! + yScale.bandwidth() / 2}
					textAnchor="end"
					alignmentBaseline="central"
					fontSize={14}
				>
					{series.label}
				</text>
			))}
		</g>
	);

	const plotArea = (
		<g transform={`translate(${yAxisWidth},0)`}>
			{seriesData.map((series) => {
				let xTextEnd = 0;
				return series.items.map((item, itemIndex) => {
					let xText = xScale(item.low);
					if (xText < xTextEnd) xText = xTextEnd;
					xTextEnd =
						xText +
						(svgRef.current
							? getTextWidth(svgRef.current, item.label + " ")
							: 0);
					return (
						<g key={`${series.id}-${itemIndex}`}>
							<rect
								x={xScale(item.low)}
								y={yScale(series.id)}
								height={yScale.bandwidth()}
								width={xScale(item.high) - xScale(item.low)}
								fill={item.color || "#ffffff"}
								stroke="grey"
								opacity={0.8}
								rx="0.5%"
							/>
							<text
								x={xText}
								y={yScale(series.id)}
								alignmentBaseline="after-edge"
							>
								{item.label}
							</text>
						</g>
					);
				});
			})}
		</g>
	);

	return (
		<svg ref={svgRef} style={{ width, height }}>
			{yAxis}
			{xAxis}
			{plotArea}
		</svg>
	);
}

export default SessionAttendanceChart;
