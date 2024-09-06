import React from "react";
import { createSelector } from "@reduxjs/toolkit";
import * as d3 from "d3";

import { useAppSelector } from "../store/hooks";

import {
	//useDimensions,
	selectBreakoutAttendanceEntries,
	type BreakoutAttendanceEntry,
} from "./SessionAttendanceChart";

import type { ReportChartProps } from "./chart";

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
			if (d1 === d2) return t1.localeCompare(t2);
			return d1.localeCompare(d2);
		});

		const maxValue =
			d3.max(seriesIds, (id) => seriesEntities[id].attendanceCount) || 0;

		return { seriesIds, seriesEntities, maxValue };
	}
);

function TeleconAttendanceChart({ width, height, ...props }: ReportChartProps) {
	const svgRef = React.useRef<SVGSVGElement>(null);
	//const [xAxisHeight, setXAxisHeight] = React.useState(120);
	const gx = React.useRef<SVGSVGElement>(null);
	const xAxisHeight = 120; //useDimensions(gx).height;
	console.log(xAxisHeight);

	//const [yAxisWidth, setYAxisWidth] = React.useState(50);
	const gy = React.useRef<SVGSVGElement>(null);
	const yAxisWidth = 50; //useDimensions(gy).width;
	console.log(yAxisWidth);

	const margin = 10;
	const plotWidth = width - 2 * margin - yAxisWidth;
	const plotHeight = height - 2 * margin - xAxisHeight;

	const { seriesIds, seriesEntities, maxValue } = useAppSelector(
		selectAttendanceSeriesInfo
	);

	const xScale = React.useMemo(() => {
		return d3
			.scaleBand()
			.domain(seriesIds)
			.range([0, plotWidth])
			.padding(0.2);
	}, [seriesIds, plotWidth]);

	/*React.useEffect(() => {
		if (!gx.current) return;
		const b = gx.current.getBoundingClientRect();
		setXAxisHeight(b.height);
	}, [gx, xScale]);*/

	const xAxis = seriesIds.map((id) => (
		<text
			key={id}
			x={0}
			y={0}
			textAnchor="end"
			alignmentBaseline="central"
			fontSize={14}
			transform={`translate(${
				xScale(id)! + xScale.bandwidth() / 2
			},10)rotate(-90)`}
		>
			{seriesEntities[id].date}
		</text>
	));

	const yScale = React.useMemo(() => {
		return d3.scaleLinear().domain([0, maxValue]).range([plotHeight, 0]);
	}, [maxValue, plotHeight]);

	/*React.useEffect(() => {
		if (!gy.current) return;
		//d3.select(gy.current).call(d3.axisLeft(yScale));
		const b = gy.current.getBoundingClientRect();
		setYAxisWidth(b.width);
	}, [gy, yScale]);*/

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

	const plot = seriesIds.map((id) => {
		const entity = seriesEntities[id];
		return (
			<g key={id}>
				<rect
					x={xScale(id)}
					y={yScale(entity.attendanceCount)}
					width={xScale.bandwidth()}
					height={yScale(0) - yScale(entity.attendanceCount)}
					fill={entity.color}
					stroke="grey"
					rx="0.3%"
				/>
				<text
					x={0}
					y={0}
					textAnchor="start"
					alignmentBaseline="central"
					transform={`translate(${
						xScale(id)! + xScale.bandwidth() / 2
					},${yScale(0) - 10})rotate(-90)`}
				>
					{entity.label}
				</text>
			</g>
		);
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
			>
				{xAxis}
			</g>
			<g ref={gy} transform={`translate(${margin},${margin})`}>
				{yAxis}
			</g>
			<g transform={`translate(${margin + yAxisWidth},${margin})`}>
				{plot}
			</g>
		</svg>
	);
}

export default TeleconAttendanceChart;
