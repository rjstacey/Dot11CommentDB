import React from "react";
import * as d3 from "d3";

import {
	useAttendancePerSession,
	type AttendancePerSession,
} from "./useSessionParticipationData";

import { useDimensions } from "./useDimensions";
import { XAxis } from "./XAxis";
import { YAxis } from "./YAxis";

// Set of pastel colors as an array of hex strings
const colors = [
	"#FF6F61",
	"#6B5B95",
	"#88B04B",
	"#F7CAC9",
	"#92A8D1",
	"#955251",
	"#B565A7",
	"#009B77",
	"#DD4124",
	"#D65076",
	"#45B8AC",
];

const marginLeft = 20,
	marginRight = 20,
	marginBottom = 50,
	marginTop = 20;

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
		const x2Scale = d3
			.scaleBand()
			.domain(["remoteOnly", "inPerson"])
			.range([0, xScale.bandwidth()])
			.padding(0.1);

		const remoteX = x2Scale("remoteOnly")!;
		const remoteY = (d: AttendancePerSession) => yScale(d.remoteCountPct);
		const remoteHeight = (d: AttendancePerSession) =>
			yScale(0) - yScale(d.remoteCountPct);
		const remoteLabel = (d: AttendancePerSession) =>
			remoteHeight(d) > 10
				? `${d.remoteCount} (${d.remoteCountPct.toFixed(1)}%)`
				: "";

		const inPersonX = x2Scale("inPerson")!;
		const inPersonY = (d: AttendancePerSession) =>
			yScale(d.inPersonCountPct);
		const inPersonHeight = (d: AttendancePerSession) =>
			yScale(0) - yScale(d.inPersonCountPct);
		const inPersonLabel = (d: AttendancePerSession) =>
			inPersonHeight(d) > 10
				? `${d.inPersonCount} (${d.inPersonCountPct.toFixed(1)}%)`
				: "";

		d3.select(ref.current!).selectAll("*").remove();
		d3.select(ref.current!)
			.selectAll("g")
			.data(data)
			.join("g")
			.attr(
				"transform",
				(d) => `translate(${xScale(String(d.sessionId))}, 0)`
			)
			.call((g) => {
				g.append("text")
					.attr("x", remoteX)
					.attr("y", yScale(0) + 20)
					.text("Remote-only");
				g.append("text")
					.attr("x", inPersonX)
					.attr("y", yScale(0) + 20)
					.text("In-person");
				g.append("rect")
					.attr("x", remoteX)
					.attr("y", remoteY)
					.attr("height", remoteHeight)
					.attr("width", x2Scale.bandwidth())
					.attr("fill", colors[0]);
				g.append("rect")
					.attr("x", inPersonX)
					.attr("y", inPersonY)
					.attr("height", inPersonHeight)
					.attr("width", x2Scale.bandwidth())
					.attr("fill", colors[1]);
				g.append("text")
					.attr("x", remoteX + 10)
					.attr("y", (d) => remoteY(d) + 20)
					.text(remoteLabel);
				g.append("text")
					.attr("x", inPersonX + 10)
					.attr("y", (d) => inPersonY(d) + 20)
					.text(inPersonLabel);
			});
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
	const [yAxisWidth, setYAxisWidth] = React.useState(40);
	const [xAxisHeight, setXAxisHeight] = React.useState(40);
	const data = useAttendancePerSession({
		selected,
		statuses,
	});
	const groups = data.map((d, i) => String(i + 1));

	const plotWidth = width - marginLeft - marginRight - yAxisWidth;
	const plotHeight = height - marginBottom - marginTop - xAxisHeight;

	const xScale = React.useMemo(
		() =>
			d3
				.scaleBand()
				.domain(selected.map(String))
				.range([0, plotWidth])
				.padding(0.1),

		[groups, plotWidth]
	);
	const yScale = React.useMemo(
		() => d3.scaleLinear().domain([0, 100]).range([plotHeight, 0]),
		[plotHeight]
	);

	return (
		<svg ref={svgRef} width={width} height={height}>
			<XAxis
				x={marginLeft + yAxisWidth}
				y={height - marginBottom - xAxisHeight}
				scale={xScale}
				label="Session"
				setHeigth={setXAxisHeight}
			/>
			<YAxis
				x={marginLeft + yAxisWidth}
				y={marginTop}
				scale={yScale}
				label="Remote and in-person attendance as percentage of total attendance"
				setWidth={setYAxisWidth}
			/>
			<Plot
				x={marginLeft + yAxisWidth}
				y={marginTop}
				xScale={xScale}
				yScale={yScale}
				data={data}
			/>
		</svg>
	);
}

export function PerSessionChart({
	selected,
	statuses,
}: {
	selected: number[];
	statuses: string[];
}) {
	const { ref, width, height } = useDimensions();
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
