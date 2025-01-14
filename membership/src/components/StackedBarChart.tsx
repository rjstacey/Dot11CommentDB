import * as React from "react";
import * as d3 from "d3";

const colors = ["#0000ff", "#ffa500", "#008000", "red"];
const opacity = 0.5;

function deriveTotals(
	keys: readonly string[],
	ids: string[],
	entities: Record<string, Record<string, number>>
) {
	const totals: Record<string, number> = {};
	for (const key of keys) totals[key] = 0;
	ids.forEach((id) => {
		const entity = entities[id];
		for (const key of keys) {
			totals[key] += entity[key] || 0;
		}
	});

	return totals;
}

function deriveMaxSum(
	keys: readonly string[],
	ids: string[],
	entities: Record<string, Record<string, number>>
) {
	const maxSum = ids.reduce((max, id) => {
		const entity = entities[id];
		const sum = keys.reduce((count, key) => count + entity[key], 0);
		return Math.max(max, sum);
	}, 0);

	return maxSum;
}

function yAxis({
	gRef,
	yScale,
	plotHeight,
	label,
}: {
	gRef: SVGGElement;
	yScale: d3.ScaleLinear<number, number>;
	plotHeight: number;
	label: string;
}) {
	d3.select(gRef)
		.call((g) => g.select("#y-label").remove())
		.call(d3.axisLeft(yScale))
		.attr("font-size", null)
		.call((g) => g.select("text").attr("font-size", null))
		.append("g")
		.attr("id", "y-label")
		.attr("transform", `translate(0,${plotHeight / 2})`)
		.append("text")
		.text(label /*"Number of attendees"*/)
		.attr("fill", "currentColor")
		.attr("dy", "-2.5em")
		.attr("transform", "rotate(-90)")
		.attr("text-anchor", "middle");
}

function xAxis({
	gRef,
	xScale,
}: {
	gRef: SVGGElement;
	xScale: d3.ScaleBand<string>;
}) {
	d3.select(gRef)
		.call(d3.axisBottom(xScale))
		.attr("font-size", null)
		.selectAll("text")
		.attr("text-anchor", "end")
		.attr("dx", "-.8em")
		.attr("dy", ".15em")
		.attr("transform", "rotate(-45)");
}

function legend({
	gRef,
	keys,
	totals,
}: {
	gRef: SVGGElement;
	keys: readonly string[];
	totals: Record<string, number>;
}) {
	const itemHeight = 20;
	d3.select(gRef).selectChildren().remove();
	d3.select(gRef).call((g) => {
		g.append("rect")
			.attr("width", 200)
			.attr("height", 10 + 20 * keys.length)
			.attr("fill", "white")
			.attr("stroke", "gray");
		keys.forEach((key, i) => {
			const g2 = g.append("g");
			g2.append("rect")
				.attr("x", 10)
				.attr("y", itemHeight / 2 + itemHeight * i)
				.attr("width", 10)
				.attr("height", 10)
				.attr("fill", colors[i])
				.attr("opacity", opacity);
			g2.append("text")
				.attr("x", 30)
				.attr("y", itemHeight + itemHeight * i)
				.text(`${key} (${totals[key]})`);
		});
	});
}

function PlotArea({
	xScale,
	yScale,
	keys,
	ids,
	entities,
}: {
	xScale: d3.ScaleBand<string>;
	yScale: d3.ScaleLinear<number, number>;
	keys: readonly string[];
	ids: string[];
	entities: Record<string, Record<string, number>>;
}) {
	const elements: JSX.Element[] = [];
	const barWidth = xScale.bandwidth();
	ids.forEach((id) => {
		const entry = entities[id];
		const x = xScale(id);
		let y = yScale(0);
		keys.forEach((key, i) => {
			const value = entry[key];
			if (!value) return null;
			const fillColor = colors[i] || "#ffffff";
			const barHeight = yScale(0) - yScale(value);
			y -= barHeight;
			elements.push(
				<svg
					key={`${id}-${key}`}
					x={x}
					y={y}
					height={barHeight}
					width={barWidth}
				>
					<rect
						width="100%"
						height="100%"
						fill={fillColor}
						opacity={opacity}
					/>
					{value > 1 && (
						<text
							textAnchor="middle"
							transform={`rotate(-90) translate(${
								-barHeight / 2
							} ${barWidth - 4})`}
							fontSize="smaller"
						>
							{value}
						</text>
					)}
				</svg>
			);
		});
	});
	return <>{elements}</>;
}

function StackedBarChart({
	width,
	height,
	svgRef,
	keys,
	ids,
	entities,
	yLabel,
}: {
	svgRef?: React.RefObject<SVGSVGElement>;
	height: number;
	width: number;
	keys: readonly string[];
	ids: string[];
	entities: Record<string, Record<string, number>>;
	yLabel: string;
}) {
	const viewWidth = 1600;
	const viewHeight = 900;
	const margin = 0;
	const marginTop = 20;

	const [xAxisHeight, setXAxisHeight] = React.useState(200);
	const [yAxisWidth, setYAxisWidth] = React.useState(40);
	const plotWidth = viewWidth - 2 * margin - yAxisWidth;
	const plotHeight = viewHeight - 2 * margin - marginTop - xAxisHeight;

	//const { ids, entities } = useAppSelector(attendeesByAffiliation);
	/*const keys = React.useMemo(
		() => (ids.length > 0 ? Object.keys(entities[ids[0]]) : []),
		[ids, entities]
	);*/

	const maxCount = React.useMemo(
		() => deriveMaxSum(keys, ids, entities),
		[keys, ids, entities]
	);

	const totals = React.useMemo(
		() => deriveTotals(keys, ids, entities),
		[keys, ids, entities]
	);

	const yScale = React.useMemo(() => {
		return d3.scaleLinear([0, maxCount], [plotHeight, 0]);
	}, [maxCount, plotHeight]);

	const xScale = React.useMemo(() => {
		return d3.scaleBand().domain(ids).range([0, plotWidth]).padding(0.25);
	}, [ids, plotWidth]);

	const gxRef = React.useRef<SVGSVGElement>(null);
	React.useEffect(() => {
		const gRef = gxRef.current!;
		xAxis({ gRef, xScale });
		const b = gRef.getBoundingClientRect();
		setXAxisHeight(b.height);
	}, [xScale]);

	const gyRef = React.useRef<SVGSVGElement>(null);
	React.useEffect(() => {
		const gRef = gyRef.current!;
		yAxis({ gRef, yScale, plotHeight, label: yLabel });
		const b = gRef.getBoundingClientRect();
		setYAxisWidth(b.width);
	}, [yScale, plotHeight, yLabel]);

	const gLegendRef = React.useRef<SVGSVGElement>(null);
	React.useEffect(
		() => legend({ gRef: gLegendRef.current!, keys, totals }),
		[keys, totals]
	);

	return (
		<svg
			id="chart"
			ref={svgRef}
			viewBox={`0 0 ${viewWidth} ${viewHeight}`}
			width={width - 20}
			height={height - 40}
			fontSize={16}
			style={{ color: "black" }}
		>
			<g
				ref={gxRef}
				transform={`translate(${margin + yAxisWidth} ${
					viewHeight - xAxisHeight - margin
				})`}
			/>
			<g
				ref={gyRef}
				transform={`translate(${margin + yAxisWidth} ${
					margin + marginTop
				})`}
			/>
			<g
				transform={`translate(${margin + yAxisWidth} ${
					margin + marginTop
				})`}
			>
				<PlotArea
					xScale={xScale}
					yScale={yScale}
					keys={keys}
					ids={ids}
					entities={entities}
				/>
			</g>
			<g
				ref={gLegendRef}
				transform={`translate(${viewWidth - 300} ${60 + marginTop})`}
			></g>
		</svg>
	);
}

export default StackedBarChart;
