import React from "react";
import { createSelector } from "@reduxjs/toolkit";
import { DateTime } from "luxon";
import * as d3 from "d3";

import { useAppSelector } from "@/store/hooks";

import type { ReportChartProps } from "./chart";

import {
	BreakoutAttendanceEntry,
	selectBreakoutAttendanceEntries,
} from "./breakoutAttendanceEntries";

interface F {
	(element: SVGElement, text: string): number;
	canvas?: HTMLCanvasElement;
}
const getTextWidth: F = function (element, text) {
	const styleDeclaration = window.getComputedStyle(element, null);
	const fontWeight =
		styleDeclaration.getPropertyValue("font-weight") || "normal";
	const fontSize =
		/*styleDeclaration.getPropertyValue("font-size") ||*/ "10px";
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

/*
function getDimensions(element: HTMLElement | SVGElement | null) {
	return element ? element.getBoundingClientRect() : { width: 0, height: 0 };
}

function useDimensions(
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
*/

type DataItem = BreakoutAttendanceEntry & {
	high: number;
	low: number;
};

const selectAttendanceSeriesInfo = createSelector(
	selectBreakoutAttendanceEntries,
	(entries) => {
		// Create series entities
		const seriesEntities = entries.reduce(
			(seriesEntities, entry) => {
				const seriesId = entry.date + " " + entry.slotName;
				seriesEntities[seriesId] = (
					seriesEntities[seriesId] || []
				).concat(entry);
				return seriesEntities;
			},
			{} as Record<string, BreakoutAttendanceEntry[]>
		);

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

function SessionAttendanceChart({ width, height, ...props }: ReportChartProps) {
	const svgRef = React.useRef<SVGSVGElement>(null);
	const [xAxisHeight, setXAxisHeight] = React.useState(40);
	const [yAxisWidth, setYAxisWidth] = React.useState(120);
	const margin = 10;
	const plotWidth = width - 2 * margin - yAxisWidth;
	const plotHeight = height - 2 * margin - xAxisHeight;

	const { seriesIds, seriesData, maxCount } = useAppSelector(
		selectAttendanceSeriesInfo
	);

	const xScale = React.useMemo(() => {
		return d3.scaleLinear().domain([0, maxCount]).range([0, plotWidth]);
	}, [maxCount, plotWidth]);
	const gx = React.useRef<SVGSVGElement>(null);
	React.useEffect(() => {
		if (!gx.current) return;
		d3.select(gx.current)
			.call(d3.axisBottom(xScale))
			.selectAll("text")
			.attr("textAnchor", "middle")
			.attr("alignmentBaseline", "central")
			.attr("fontSize", "12");
		const b = gx.current.getBoundingClientRect();
		setXAxisHeight(b.height);
	}, [gx, xScale]);

	const yScale = React.useMemo(() => {
		return d3.scaleBand(seriesIds, [0, plotHeight]).padding(0.5);
	}, [seriesIds, plotHeight]);

	const gy = React.useRef<SVGSVGElement>(null);
	React.useEffect(() => {
		if (!gy.current) return;
		//d3.select(gy.current!).call(d3.axisLeft(yScale));
		const b = gy.current.getBoundingClientRect();
		setYAxisWidth(b.width);
	}, [gy, yScale]);

	const plot = seriesData.map((series) => {
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
						fontSize={10}
					>
						{item.label}
					</text>
				</g>
			);
		});
	});

	return (
		<svg
			id="chart"
			ref={svgRef}
			viewBox={`0 0 ${width} ${height}`}
			width={width}
			height={height}
			style={{ color: "black" }}
			{...props}
		>
			<g
				ref={gx}
				transform={`translate(${margin + yAxisWidth},${
					height - margin - xAxisHeight
				})`}
			/>
			<g ref={gy} transform={`translate(${margin},${margin})`}>
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
			<g transform={`translate(${margin + yAxisWidth},${margin})`}>
				{plot}
			</g>
		</svg>
	);
}

export default SessionAttendanceChart;
