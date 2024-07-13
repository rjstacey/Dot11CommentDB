import * as React from "react";
import * as d3 from "d3";
import { createSelector } from "@reduxjs/toolkit";

import { useAppSelector } from "../store/hooks";
import { selectActiveMembers, Member } from "../store/members";

const countedStatus = ["Voter", "Potential Voter", "Aspirant"] as const;
const isCountedStatus = (s: string): s is (typeof countedStatus)[number] =>
	(countedStatus as readonly string[]).includes(s);

const colors = {
	Aspirant: "green",
	"Potential Voter": "yellow",
	Voter: "blue",
};

type StatusCountRecord = Record<
	(typeof countedStatus)[number] | "Total",
	number
>;

const membersByAffiliation = createSelector(selectActiveMembers, (members) => {
	const membersEntities: Record<string, Member[]> = {};
	let ids: string[] = [];
	for (const m of members) {
		if (ids.includes(m.Affiliation)) {
			membersEntities[m.Affiliation].push(m);
		} else {
			ids.push(m.Affiliation);
			membersEntities[m.Affiliation] = [m];
		}
	}
	const entities: Record<string, StatusCountRecord> = {};
	for (const id of ids) {
		const entry: StatusCountRecord = {
			Aspirant: 0,
			"Potential Voter": 0,
			Voter: 0,
			Total: 0,
		};
		for (const m of membersEntities[id]) {
			if (isCountedStatus(m.Status)) entry[m.Status]++;
		}
		entry.Total = entry.Aspirant + entry["Potential Voter"] + entry.Voter;
		entities[id] = entry;
	}
	const maxCount = ids.reduce(
		(max, id) => Math.max(max, entities[id].Voter),
		0
	);
	function idsComp(id1: string, id2: string) {
		const e1 = entities[id1];
		const e2 = entities[id2];
		const n = e2.Voter - e1.Voter;
		return n; //n === 0 ? id1.localeCompare(id2) : n;
	}
	ids = ids.sort(idsComp).slice(0, 40);
	return { ids, entities, maxCount };
});

type ReportChartProps = {
	className?: string;
	style?: React.CSSProperties;
	svgRef: React.RefObject<SVGSVGElement>;
	height: number;
	width: number;
};

function MembersChart({ width, height, svgRef }: ReportChartProps) {
	const yAxisWidth = 200;
	const xAxisHeight = 40;
	const marginRight = 50; // For text overflow
	const plotWidth = width - yAxisWidth - marginRight;
	const plotHeight = height - xAxisHeight;

	const { ids, entities, maxCount } = useAppSelector(membersByAffiliation);

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
		return d3.scaleBand().domain(ids).range([0, plotHeight]).padding(0.5);
	}, [ids, plotHeight]);

	const yAxis = (
		<g>
			{ids.map((id, i) => (
				<text
					key={i}
					x={yAxisWidth - 10}
					y={yScale(id)! + yScale.bandwidth() / 2}
					textAnchor="end"
					alignmentBaseline="central"
					fontSize={14}
				>
					{id}
				</text>
			))}
		</g>
	);

	const plotArea = (
		<g transform={`translate(${yAxisWidth},0)`}>
			{ids.map((id) => {
				const entry = entities[id];
				const rects: JSX.Element[] = [];
				let count = 0;
				for (const status of countedStatus) {
					rects.push(
						<rect
							key={`${id}-${status}`}
							x={xScale(count)}
							y={yScale(id)}
							height={yScale.bandwidth()}
							width={xScale(entry[status])}
							fill={colors[status] || "#ffffff"}
							stroke="grey"
							opacity={0.8}
							//rx="0.5%"
						/>
					);
					count += entry[status];
				}
				return <g key={id}>{rects}</g>;
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

export default MembersChart;
