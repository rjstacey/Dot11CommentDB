import * as React from "react";
import * as d3 from "d3";
import { createSelector } from "@reduxjs/toolkit";

import { useAppSelector } from "../store/hooks";
import { selectActiveMembers, Member } from "../store/members";
import { AffiliationMap, selectAffiliationMaps } from "../store/affiliationMap";

const countedStatus = ["Voter", "Potential Voter", "Aspirant"] as const;
const isCountedStatus = (s: string): s is (typeof countedStatus)[number] =>
	(countedStatus as readonly string[]).includes(s);

const colors = {
	Aspirant: "green",
	"Potential Voter": "orange",
	Voter: "blue",
} as const;

type StatusCountRecord = Record<
	(typeof countedStatus)[number] | "Total",
	number
>;

function matchRegExp(map: AffiliationMap) {
	const parts = map.match.split("/");
	let re: RegExp;
	try {
		if ((parts.length === 2 || parts.length === 3) && parts[0] === "")
			re = new RegExp(parts[1], parts[2]);
		else re = new RegExp(map.match);
	} catch (error) {
		return;
	}
	return re;
}

const nullEntry: StatusCountRecord = {
	Aspirant: 0,
	"Potential Voter": 0,
	Voter: 0,
	Total: 0,
};

const membersByAffiliation = createSelector(
	selectActiveMembers,
	selectAffiliationMaps,
	(members, maps) => {
		const membersEntities: Record<string, Member[]> = {};
		let ids: string[] = [];
		for (const m of members) {
			let affiliation = m.Affiliation;
			for (const map of maps) {
				const re = matchRegExp(map);
				if (re && re.test(affiliation)) {
					affiliation = map.shortAffiliation;
					break;
				}
			}
			if (ids.includes(affiliation)) {
				membersEntities[affiliation].push(m);
			} else {
				ids.push(affiliation);
				membersEntities[affiliation] = [m];
			}
		}
		const entities: Record<string, StatusCountRecord> = {};
		for (const id of ids) {
			const entry = { ...nullEntry };
			for (const m of membersEntities[id]) {
				if (isCountedStatus(m.Status)) entry[m.Status]++;
			}
			entry.Total =
				entry.Aspirant + entry["Potential Voter"] + entry.Voter;
			entities[id] = entry;
		}
		function idsComp(id1: string, id2: string) {
			const e1 = entities[id1];
			const e2 = entities[id2];
			const n = e2.Voter - e1.Voter;
			return n; //n === 0 ? id1.localeCompare(id2) : n;
		}
		ids = ids.sort(idsComp);

		const entry = { ...nullEntry };
		ids.forEach((id, i) => {
			const entity = entities[id];
			if (entity.Total === 1 || id === "No affiliation") {
				entry.Aspirant += entity.Aspirant;
				entry["Potential Voter"] += entity["Potential Voter"];
				entry.Voter += entity.Voter;
				entry.Total += entity.Total;
			}
		});
		const id = "Single or no affiliation";
		entities[id] = entry;
		ids.push(id);

		ids = ids.filter(
			(id) => entities[id].Total > 1 && id !== "No affiliation"
		);

		const totals = { ...nullEntry };
		ids.forEach((id) => {
			const entity = entities[id];
			totals.Aspirant += entity.Aspirant;
			totals["Potential Voter"] += entity["Potential Voter"];
			totals.Voter += entity.Voter;
			totals.Total += entity.Total;
		});

		const maxCount = ids.reduce(
			(max, id) => Math.max(max, entities[id].Total),
			0
		);
		return { ids, entities, maxCount, totals };
	}
);

type ReportChartProps = {
	className?: string;
	style?: React.CSSProperties;
	svgRef: React.RefObject<SVGSVGElement>;
	height: number;
	width: number;
};

function Ledgend({
	totals,
	...props
}: { totals: StatusCountRecord } & React.ComponentProps<"g">) {
	const statuses = Object.keys(colors) as (keyof typeof colors)[];
	return (
		<g {...props}>
			<rect
				x={0}
				y={0}
				width="200"
				height={10 + 20 * statuses.length}
				fill="white"
				stroke="gray"
			/>
			{statuses.map((status, i) => {
				return (
					<g key={i}>
						<rect
							x={10}
							y={10 + 20 * i}
							width={10}
							height={10}
							fill={colors[status]}
						/>
						<text
							x={30}
							y={10 + 20 * i + 6}
							alignmentBaseline="middle"
						>
							{`${status} (${totals[status]})`}
						</text>
					</g>
				);
			})}
		</g>
	);
}

function MembersChart({ width, height, svgRef }: ReportChartProps) {
	const [xAxisHeight, setXAxisHeight] = React.useState(200);
	const [yAxisWidth, setYAxisWidth] = React.useState(40);
	const margin = 10;
	const plotWidth = width - 2 * margin - yAxisWidth;
	const plotHeight = height - 2 * margin - xAxisHeight - 10;

	const { ids, entities, maxCount, totals } =
		useAppSelector(membersByAffiliation);

	const yScale = React.useMemo(() => {
		return d3.scaleLinear([0, maxCount], [plotHeight, 0]);
	}, [maxCount, plotHeight]);

	const xScale = React.useMemo(() => {
		return d3.scaleBand().domain(ids).range([0, plotWidth]).padding(0.25);
	}, [ids, plotWidth]);

	const plotArea = (
		<g transform={`translate(${margin + yAxisWidth},${margin})`}>
			{ids.map((id) => {
				const entry = entities[id];
				const rects: JSX.Element[] = [];
				let value = 0;
				for (const status of countedStatus) {
					let height = yScale(0) - yScale(entry[status]);
					rects.push(
						<rect
							key={`${id}-${status}`}
							x={xScale(id)}
							width={xScale.bandwidth()}
							y={yScale(value) - height}
							height={height}
							fill={colors[status] || "#ffffff"}
							opacity={0.8}
							//rx="0.25%"
						/>
					);
					value += entry[status];
				}
				return <g key={id}>{rects}</g>;
			})}
		</g>
	);

	const gx = React.useRef<SVGSVGElement>(null);
	React.useEffect(() => {
		if (!gx.current) return;
		d3.select(gx.current)
			.call(d3.axisBottom(xScale))
			.selectAll("text")
			.style("text-anchor", "end")
			.attr("dx", "-.8em")
			.attr("dy", ".15em")
			.attr("transform", "rotate(-45)");
		const b = gx.current.getBoundingClientRect();
		setXAxisHeight(b.height);
	}, [gx, xScale]);

	const gy = React.useRef<SVGSVGElement>(null);
	React.useEffect(() => {
		if (!gy.current) return;
		d3.select(gy.current!).call(d3.axisLeft(yScale));
		const b = gy.current.getBoundingClientRect();
		setYAxisWidth(b.width);
	}, [gy, yScale]);

	return (
		<svg
			id="chart"
			ref={svgRef}
			viewBox={`0 0 ${width} ${height}`}
			width={width}
			height={height}
			style={{ color: "black" }}
		>
			<g
				ref={gx}
				transform={`translate(${margin + yAxisWidth},${
					height - xAxisHeight - 2 * margin
				})`}
			/>

			<g
				ref={gy}
				transform={`translate(${margin + yAxisWidth},${margin})`}
			>
				<text
					y={0}
					x={-plotHeight / 2}
					dy="-2.5em"
					transform="rotate(-90)"
					fill="currentColor"
					textAnchor="middle"
				>
					Number of members
				</text>
			</g>
			{plotArea}
			<Ledgend
				totals={totals}
				transform={`translate(${plotWidth - 200},60)`}
			/>
		</svg>
	);
}

export default MembersChart;
