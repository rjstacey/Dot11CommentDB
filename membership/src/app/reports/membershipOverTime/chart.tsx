import React, { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import { useAppSelector } from "@/store/hooks";
import {
	type MembershipEvent,
	selectMembershipOverTimeState,
} from "@/store/membershipOverTime";
import { ChartWrapper } from "../ChartWrapper";

const VIEW = { width: 1600, height: 900 };
const MARGIN = { top: 10, right: 10, bottom: 10, left: 10 };

/** Produce a line chart SVG
 * @param width Width of the SVG element
 * @param height Height of the SVG element
 * @param svgRef Ref to the SVG element
 * @param events array of MembershipEvent objects
 * @param yLabel Label for the Y axis
 */
function LineChart({
	width,
	height,
	svgRef,
	events,
	yLabel,
	className,
	style,
}: {
	svgRef?: React.RefObject<SVGSVGElement>;
	height: number;
	width: number;
	events: MembershipEvent[];
	yLabel?: string;
	className?: string;
	style?: React.StyleHTMLAttributes<HTMLOrSVGElement>;
}) {
	const [xAxisHeight, setXAxisHeight] = useState(200);
	const [yAxisWidth, setYAxisWidth] = useState(40);
	const plotWidth = VIEW.width - yAxisWidth - MARGIN.left - MARGIN.right;
	const plotHeight = VIEW.height - xAxisHeight - MARGIN.top - MARGIN.bottom;

	const yScale = useMemo(() => {
		let maxCount = d3.max(events, (e) => e.count) || 0;
		if (maxCount > 10) maxCount = Math.ceil(maxCount / 10) * 10;
		if (maxCount > 100) maxCount = Math.ceil(maxCount / 100) * 100;
		return d3.scaleLinear().domain([0, maxCount]).range([plotHeight, 0]);
	}, [events, plotHeight]);

	const xScale = useMemo(() => {
		//const dates = ids.map((id) => d3.timeParse("%Y-%m-%d")(entities[id]!.date)!);
		const dates = events.map((e) => new Date(e.date));
		const dateExtent = d3.extent(dates) as [Date, Date];
		return d3.scaleTime().domain(dateExtent).range([0, plotWidth]);
	}, [events, plotWidth]);

	const gxRef = useRef<SVGSVGElement>(null);
	useEffect(() => {
		const gRef = gxRef.current!;
		d3.select(gRef).call(d3.axisBottom(xScale)).attr("font-size", null);
		const b = gRef.getBoundingClientRect();
		let scaledHeight =
			(b.height * (VIEW.height - MARGIN.top - MARGIN.bottom)) / height;
		// Prevent repeated re-rendering by rounding to 0.1
		scaledHeight = Math.ceil(scaledHeight * 10) / 10;
		setXAxisHeight(scaledHeight);
	}, [xScale]);

	const gyRef = useRef<SVGSVGElement>(null);
	useEffect(() => {
		const gRef = gyRef.current!;
		const g = d3.select(gRef);
		g.selectAll("*").remove();
		g.call(d3.axisLeft(yScale))
			.attr("font-size", null)
			.call((g) => g.select("text").attr("font-size", null))
			.append("g")
			.attr("transform", `translate(0,${plotHeight / 2})`);
		if (yLabel) {
			g.append("text")
				.text(yLabel)
				.attr("fill", "currentColor")
				.attr("dy", "-2.5em")
				.attr("transform", "rotate(-90)")
				.attr("text-anchor", "middle");
		}
		const b = gRef.getBoundingClientRect();
		let scaledWidth =
			(b.width * (VIEW.width - MARGIN.left - MARGIN.right)) / width;
		// Prevent repeated re-rendering by rounding to 0.1
		scaledWidth = Math.ceil(scaledWidth * 10) / 10;
		setYAxisWidth(scaledWidth);
	}, [yScale, plotHeight, yLabel]);

	const gPlotRef = useRef<SVGSVGElement>(null);
	useEffect(() => {
		const g = d3.select(gPlotRef.current!);
		g.selectAll("*").remove();
		const lineBuilder = d3
			.line<MembershipEvent>()
			.x((event) => xScale(new Date(event.date)))
			.y((event) => yScale(event.count));
		const linePath = lineBuilder(events);
		if (linePath) {
			g.append("path")
				.attr("fill", "none")
				.attr("stroke", "blue")
				.attr("stroke-width", 3)
				.attr("d", linePath);
		}
	}, [xScale, yScale, events]);

	return (
		<svg
			id="chart"
			ref={svgRef}
			viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
			fontSize={16}
			style={{ ...style, color: "black" }}
			className={className}
		>
			<g
				ref={gxRef}
				transform={`translate(${yAxisWidth + MARGIN.left} ${
					VIEW.height - xAxisHeight - MARGIN.bottom
				})`}
			/>
			<g
				ref={gyRef}
				transform={`translate(${yAxisWidth + MARGIN.left} ${MARGIN.top})`}
			/>
			<g
				ref={gPlotRef}
				transform={`translate(${yAxisWidth + MARGIN.left} ${MARGIN.top})`}
			/>
		</svg>
	);
}

export function MembershipOverTimeChart() {
	const { ids, entities } = useAppSelector(selectMembershipOverTimeState);
	const events = useMemo(
		() => ids.map((id) => entities[id]!).filter((e) => e.count > 0),
		[ids, entities],
	);
	return (
		<ChartWrapper>
			{({ width, height }) => (
				<LineChart events={events} width={width} height={height} />
			)}
		</ChartWrapper>
	);
}

export default MembershipOverTimeChart;
