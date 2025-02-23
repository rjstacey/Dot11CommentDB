import * as React from "react";
import * as d3 from "d3";

import {
	useAttendanceCumulative,
	type AttendanceCumulative,
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
	data: AttendanceCumulative[][];
}) {
	const ref = React.useRef<SVGGElement>(null);
	React.useEffect(() => {
		const groups = data.map((d, i) => String(i + 1));

		const colorScale = d3
			.scaleOrdinal<number, string>()
			.domain([0, data.length + 1])
			.range(colors);

		const x2Scale = d3
			.scaleBand()
			.domain(["remoteOnly", "inPerson"])
			.range([0, xScale.bandwidth()])
			.padding(0.1);

		// Bar co-ordinate funcitons
		const x = (d: AttendanceCumulative) =>
			x2Scale(
				d.sessionsAttendedInPerson === 0 ? "remoteOnly" : "inPerson"
			)!;
		const y = (d: AttendanceCumulative) => yScale(d.sumPct);
		const width = x2Scale.bandwidth();
		const height = (d: AttendanceCumulative) =>
			yScale(0) - yScale(d.countPct);
		const color = (d: AttendanceCumulative) =>
			colorScale(d.sessionsAttendedInPerson);
		const label = (d: AttendanceCumulative) =>
			height(d) > 10 ? `${d.count} (${d.countPct.toFixed(1)}%)` : "";

		d3.select(ref.current!).selectAll("*").remove();
		d3.select(ref.current!)
			.selectAll("g#group")
			.data(groups)
			.join("g")
			.attr("id", "group")
			.attr("transform", (d) => `translate(${xScale(d)}, 0)`)
			.call((g) => {
				g.append("text")
					.attr("x", x2Scale("remoteOnly")! + x2Scale.bandwidth() / 2)
					.attr("y", yScale(0) + 20)
					.attr("text-anchor", "middle")
					.text("Remote-only");
				g.append("text")
					.attr("x", x2Scale("inPerson")! + x2Scale.bandwidth() / 2)
					.attr("y", yScale(0) + 20)
					.attr("text-anchor", "middle")
					.text("In-person");
			})
			.selectAll("g#subgroup")
			.data((d) => data[Number(d) - 1])
			.join("g")
			.attr("id", "subgroup")
			.call((g) => {
				g.append("rect")
					.attr("x", x)
					.attr("y", y)
					.attr("height", height)
					.attr("width", width)
					.attr("fill", color);
				g.append("text")
					.attr("x", (d) => x(d) + 10)
					.attr("y", (d) => y(d) + 20)
					.text(label);
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
	const data = useAttendanceCumulative({
		selected,
		statuses,
	});
	const groups = data.map((d, i) => String(i + 1));

	const plotWidth = width - marginLeft - marginRight - yAxisWidth;
	const plotHeight = height - marginBottom - marginTop - xAxisHeight;

	const xScale = React.useMemo(
		() => d3.scaleBand().domain(groups).range([0, plotWidth]).padding(0.1),
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
				label="Number of sessions attended"
				setHeigth={setXAxisHeight}
			/>
			<YAxis
				x={marginLeft + yAxisWidth}
				y={marginTop}
				scale={yScale}
				label="Remote-only and in-person attendance as percentage of total attendance"
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

export function CummulativeChart({
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
