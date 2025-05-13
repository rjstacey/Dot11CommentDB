import React from "react";
import * as d3 from "d3";
import { useOutletContext } from "react-router";

import {
	AttendanceCount,
	useAttendancePerSession,
	statusOrder,
	type AttendancePerSession,
} from "./useSessionParticipationData";
import type { SessionParticipationReportContext } from "./layout";

import { useDimensions } from "./useDimensions";
import { XAxis } from "./XAxis";
import { YAxis } from "./YAxis";

const colors = ["#0000ff", "#ffa500", "#008000", "#ff0000"];
const colorScale: Record<string, string> = {};
statusOrder.forEach((status, i) => {
	colorScale[status] = colors[i];
});

const viewWidth = 1600,
	viewHeight = 900,
	marginLeft = 20,
	marginRight = 20,
	marginBottom = 50,
	marginTop = 20;

function Legend({ x, y, keys }: { x: number; y: number; keys: string[] }) {
	const ref = React.useRef<SVGGElement>(null);

	React.useEffect(() => {
		keys = keys.sort(
			(a, b) => statusOrder.indexOf(a) - statusOrder.indexOf(b)
		);
		const itemHeight = 22;
		const yScale = d3
			.scaleBand()
			.domain(keys)
			.range([0, itemHeight * keys.length])
			.padding(0.2);
		d3.select(ref.current!).selectChildren().remove();
		d3.select(ref.current!)
			.append("rect")
			.attr("width", 200)
			.attr("height", yScale.range()[1])
			.attr("fill", "white")
			.attr("stroke", "gray");
		d3.select(ref.current!)
			.selectAll("g")
			.data(keys)
			.enter()
			.append("g")
			.call((g) => {
				g.append("rect")
					.attr("x", 10)
					.attr("y", (key) => yScale(key)!)
					.attr("width", yScale.bandwidth())
					.attr("height", yScale.bandwidth())
					.attr("fill", (key) => colorScale[key])
					.attr("opacity", 0.5);
				g.append("text")
					.attr("x", yScale.bandwidth() + 20)
					.attr("y", (key) => yScale(key)!)
					.attr("dy", "1em")
					.text((key) => key);
			});
	}, [keys]);

	return <g ref={ref} transform={`translate(${x}, ${y})`} />;
}

function Plot({
	x,
	y,
	xScale,
	yScale,
	data,
}: {
	x: number;
	y: number;
	xScale: d3.ScaleBand<string>;
	yScale: d3.ScaleLinear<number, number>;
	data: AttendancePerSession[];
}) {
	const ref = React.useRef<SVGGElement>(null);
	React.useEffect(() => {
		const colorScale = d3.scaleOrdinal(statusOrder, colors);

		const x2Scale = d3
			.scaleBand()
			.domain(["remoteOnly", "inPerson"])
			.range([0, xScale.bandwidth()])
			.padding(0.1);

		const y = (d: AttendanceCount) => yScale(d.countPctSum);
		const height = (d: AttendanceCount) => yScale(0) - yScale(d.countPct);
		const label = (d: AttendanceCount) =>
			height(d) > 20 ? `${d.count} (${d.countPct.toFixed(1)}%)` : "";
		const color = (d: AttendanceCount, i: number) =>
			colorScale(statusOrder[i]);

		function stackedBar(
			selection: d3.Selection<
				SVGGElement,
				AttendancePerSession,
				SVGGElement,
				unknown
			>,
			col: "remoteOnly" | "inPerson"
		) {
			const col_g = selection
				.append("g")
				.attr("transform", `translate(${x2Scale(col)!}, 0)`);

			col_g
				.selectAll("rect")
				.data((d) => (col === "remoteOnly" ? d.remote : d.inPerson))
				.enter()
				.call((g) => {
					g.append("rect")
						.attr("x", 0)
						.attr("y", y)
						.attr("height", height)
						.attr("width", x2Scale.bandwidth())
						.attr("fill", color)
						.attr("opacity", 0.5);
					g.append("text")
						.attr("x", 10)
						.attr("y", y)
						.attr("dy", "1.2em")
						.text(label);
				});
			col_g
				.selectAll("text.columnValue")
				.data((d) => [
					col === "remoteOnly"
						? d.remote[d.remote.length - 1]
						: d.inPerson[d.inPerson.length - 1],
				])
				.enter()
				.append("text")
				.attr("class", "columnValue")
				.attr("x", 0)
				.attr("y", y)
				.attr("dy", "-0.5em")
				.text((d) => d.countPctSum.toFixed(1) + "%");
			col_g
				.append("text")
				.attr("x", x2Scale.bandwidth() / 2)
				.attr("y", yScale(0))
				.attr("dy", "1em")
				.attr("text-anchor", "middle")
				.text(col === "remoteOnly" ? "Remote" : "In-person");
		}

		d3.select(ref.current!).selectAll("*").remove();
		const sessionGroups = d3
			.select(ref.current!)
			.selectAll("g")
			.data(data)
			.enter()
			.append("g")
			.attr(
				"transform",
				(d) => `translate(${xScale(d.sessionLabel)}, 0)`
			);
		stackedBar(sessionGroups, "remoteOnly");
		stackedBar(sessionGroups, "inPerson");
		const lineX = (d: AttendancePerSession) =>
			xScale(d.sessionLabel)! +
			x2Scale("inPerson")! +
			x2Scale.bandwidth() / 2;
		const lineY = (d: AttendancePerSession) =>
			yScale(d.inPerson.reduce((sum, a) => sum + a.countPct, 0));
		const line = d3.line(lineX, lineY);
		d3.select(ref.current!)
			.append("path")
			.attr("d", line(data))
			.attr("stroke-width", 4)
			.attr("stroke", "red")
			.attr("fill", "none")
			.attr("opacity", 0.3);
		d3.select(ref.current!)
			.selectAll("circle")
			.data(data)
			.enter()
			.append("circle")
			.attr("cx", lineX)
			.attr("cy", lineY)
			.attr("r", 3)
			.attr("stroke", "red")
			.attr("stroke-width", 4)
			.attr("fill", "none")
			.attr("opacity", 0.3);
	}, [data, xScale, yScale]);
	return <g ref={ref} transform={`translate(${x}, ${y})`} />;
}

function Chart({
	width,
	height,
	selected,
	statuses,
}: {
	width: number;
	height: number;
	selected: number[];
	statuses: string[];
}) {
	const svgRef = React.useRef<SVGSVGElement>(null);
	const [yAxisActualWidth, setYAxisActualWidth] = React.useState(40);
	const [xAxisActualHeight, setXAxisActualHeight] = React.useState(40);

	const yAxisWidth = (yAxisActualWidth / width) * viewWidth;
	const xAxisHeight = (xAxisActualHeight / height) * viewHeight;
	const plotWidth = viewWidth - marginLeft - marginRight - yAxisWidth;
	const plotHeight = viewHeight - marginBottom - marginTop - xAxisHeight;

	const data = useAttendancePerSession({
		selected,
		statuses,
	});
	const groups = data.map((d, i) => String(i + 1));

	const xScale = React.useMemo(
		() =>
			d3
				.scaleBand()
				.domain(data.map((d) => d.sessionLabel))
				.range([0, plotWidth])
				.padding(0.1),

		[groups, plotWidth]
	);
	const yScale = React.useMemo(
		() => d3.scaleLinear().domain([0, 100]).range([plotHeight, 0]),
		[plotHeight]
	);

	return (
		<svg
			id="chart"
			ref={svgRef}
			viewBox={`0 0 ${viewWidth} ${viewHeight}`}
			width={width}
			height={height}
			fontSize={14}
			style={{ color: "black" }}
		>
			<XAxis
				x={marginLeft + yAxisWidth}
				y={viewHeight - marginBottom - xAxisHeight}
				scale={xScale}
				label=""
				setHeigth={setXAxisActualHeight}
			/>
			<YAxis
				x={marginLeft + yAxisWidth}
				y={marginTop}
				scale={yScale}
				label="Attendance as percentage of total attendance"
				setWidth={setYAxisActualWidth}
			/>
			<Plot
				x={marginLeft + yAxisWidth}
				y={marginTop}
				xScale={xScale}
				yScale={yScale}
				data={data}
			/>
			<Legend
				x={marginLeft + yAxisWidth + plotWidth - 300}
				y={marginTop + 100}
				keys={statuses}
			/>
		</svg>
	);
}

export function PerSessionChart() {
	const { ref, width, height } = useDimensions();
	const { selected, statuses } =
		useOutletContext<SessionParticipationReportContext>();
	return (
		<div ref={ref} style={{ flex: 1, width: "100%" }}>
			<div style={{ overflow: "visible", width: 0, height: 0 }}>
				<Chart
					width={width}
					height={height}
					selected={selected}
					statuses={statuses}
				/>
			</div>
		</div>
	);
}

export default PerSessionChart;
