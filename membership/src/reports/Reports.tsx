import * as React from "react";
import { Outlet, RouteObject, useNavigate, useParams } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";

import { ActionButton, Button } from "dot11-components";

import { useAppSelector } from "../store/hooks";
import {
	selectActiveMembersWithParticipationSummary,
	Member,
	type MemberWithParticipation,
} from "../store/members";

import MembersChart from "./MembersChart";

import styles from "./reports.module.css";
import AttendeesChart from "./AttendeesChart";

function blinkElement(el: Element) {
	function removeBlink() {
		el.classList.remove("blink");
		el.removeEventListener("transitionend", removeBlink);
	}
	el.addEventListener("transitionend", removeBlink);
	el.classList.add("blink");
}

/**
 * Currently Chrome does not support writing MIME type "image/svg+xml" to the clipboard. So we have to convert
 * from SVG to a PNG and then do the write to the clipboard.
 */
interface F {
	(svg: Element | null): Promise<Blob | null | undefined>;
	canvas?: HTMLCanvasElement;
}
const svgToPngBlob: F = async function (svg) {
	if (!svg) return;

	let svgText = svg.outerHTML;
	const { width, height } = svg.getBoundingClientRect();

	if (!svgText.match(/xmlns="/im))
		svgText = svgText.replace(
			"<svg ",
			'<svg xmlns="http://www.w3.org/2000/svg" '
		);
	const svgBlob = new Blob([svgText], {
		type: "image/svg+xml;charset=utf-8",
	});
	const domUrl = window.URL || window.webkitURL || window;
	const url = domUrl.createObjectURL(svgBlob);

	const canvas: HTMLCanvasElement =
		svgToPngBlob.canvas ||
		(svgToPngBlob.canvas = document.createElement("canvas"));
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d")!;

	const loadImage = (url: string) =>
		new Promise<HTMLImageElement>((resolve, reject) => {
			const img = new Image();
			img.addEventListener("load", () => resolve(img));
			img.addEventListener("error", reject);
			img.src = url;
		});

	const img = await loadImage(url);
	ctx.drawImage(img, 0, 0);

	return new Promise((resolve) => {
		canvas.toBlob(function (blob) {
			resolve(blob);
		});
	});
};

function copyChartToClipboard() {
	const svg = document.getElementById("chart");
	if (!svg) return;

	let svgText = svg.outerHTML;
	if (!svgText.match(/xmlns="/im))
		svgText = svgText.replace(
			"<svg ",
			'<svg xmlns="http://www.w3.org/2000/svg" '
		);

	const svgBlob = new Blob([svgText], {
		type: "image/svg+xml;charset=utf-8",
	});

	const item = new ClipboardItem({ "image/svg+xml": svgBlob });
	navigator.clipboard
		.write([item])
		.then(() => {
			blinkElement(svg);
			console.log("copied");
		})
		.catch((error) => {
			svgToPngBlob(svg!).then((blob) => {
				const item = new ClipboardItem({ "image/png": blob! });
				navigator.clipboard
					.write([item])
					.then(() => blinkElement(svg!))
					.catch((error) => console.warn(error));
			});
		});
}

function downloadChart() {
	const svg = document.getElementById("chart");
	if (!svg) return;

	let svgText = svg.outerHTML;
	if (!svgText.match(/xmlns="/im))
		svgText = svgText.replace(
			"<svg ",
			'<svg xmlns="http://www.w3.org/2000/svg" '
		);

	const svgBlob = new Blob([svgText], {
		type: "image/svg+xml;charset=utf-8",
	});

	const svgUrl = URL.createObjectURL(svgBlob);
	const downloadLink = document.createElement("a");
	downloadLink.href = svgUrl;
	downloadLink.download = "chart.svg";
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
}

const Table = ({
	nCol,
	style,
	...props
}: { nCol: number } & React.ComponentProps<"table">) => (
	<table
		className={styles.table}
		style={{ ...style, gridTemplateColumns: `repeat(${nCol}, auto)` }}
		{...props}
	/>
);

function renderTable(tableData: TableData | null) {
	if (!tableData || tableData.values.length === 0) return <span>Empty</span>;
	const { headings, values } = tableData;

	const header = (
		<tr>
			{headings.map((d, i) => (
				<th key={i}>
					<span>{d}</span>
				</th>
			))}
		</tr>
	);
	const row = (r: string[], i: number) => (
		<tr key={i}>
			{r.map((d, i) => (
				<td key={i}>
					<span>{d}</span>
				</td>
			))}
		</tr>
	);
	return (
		<Table
			style={{ borderCollapse: "collapse" }}
			cellPadding="5"
			border={1}
			nCol={headings.length}
		>
			<thead>{header}</thead>
			<tbody>{values.map(row)}</tbody>
		</Table>
	);
}

function copyHtmlToClipboard(html: string) {
	const type = "text/html";
	const blob = new Blob([html], { type });
	const data = [new ClipboardItem({ [type]: blob })];
	navigator.clipboard.write(data);
}

function renderTableToClipboard(tableData: TableData | null) {
	if (!tableData || tableData.values.length === 0) return;
	const { headings, values } = tableData;

	const header = `<tr>${headings.map((d) => `<th>${d}</th>`).join("")}</tr>`;
	const row = (r: string[]) =>
		`<tr>${r.map((d) => `<td>${d}</td>`).join("")}</tr>`;
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid black;}
			td {vertical-align: top; text-align: left;}
		</style>
		<table cellpadding="5" border="1">
			<thead>${header}</thead>
			<tbody>${values.map(row).join("")}</tbody>
		</table>`;

	copyHtmlToClipboard(table);
}

type TableData = {
	headings: string[];
	values: string[][];
};

function membersSummary(members: Member[]): TableData {
	const headings = ["Aspirants", "Potential Voters", "Voters", "ExOfficio"];
	let V = [0, 0, 0, 0];
	members.forEach((m) => {
		if (m.Status === "Aspirant") V[0]++;
		if (m.Status === "Potential Voter") V[1]++;
		if (m.Status === "Voter") V[2]++;
		if (m.Status === "ExOfficio") V[3]++;
	});
	let values = [V.map(String)];
	return { headings, values };
}

function membersPublic(members: Member[]): TableData {
	const headings = [
		"Family Name",
		"Given Name",
		"MI",
		"Affilitation",
		"Status",
	];
	const values = members.map((m) => [
		m.LastName,
		m.FirstName,
		m.MI,
		m.Affiliation,
		m.Status,
	]);
	return { headings, values };
}

function membersPrivate(members: MemberWithParticipation[]): TableData {
	const headings = [
		"Family Name",
		"Given Name",
		"MI",
		"Affilitation",
		"Status",
		"Session participation",
		"Ballot series participation",
	];
	const values = members
		.slice()
		.sort((m1, m2) => (m1.LastName || "").localeCompare(m2.LastName || ""))
		.map((m) => {
			return [
				m.LastName,
				m.FirstName,
				m.MI,
				m.Affiliation,
				m.Status,
				m.AttendancesSummary,
				m.BallotParticipationSummary,
			];
		});
	return { headings, values };
}

type SvgComponent = (props: {
	height: number;
	width: number;
	svgRef: React.RefObject<SVGSVGElement>;
}) => JSX.Element;

function ChartReport({ Component }: { Component: SvgComponent }) {
	const svgRef = React.useRef<SVGSVGElement>(null);
	return (
		<>
			<div style={{ display: "flex", flex: 1, padding: 10 }}>
				<AutoSizer>
					{({ height, width }: { height: number; width: number }) => {
						// Rescale to create 16:9
						if ((16 / 9) * height > width)
							height = (9 * width) / 16;
						else width = (16 * height) / 9;
						return (
							<Component
								svgRef={svgRef}
								width={width}
								height={height}
							/>
						);
					}}
				</AutoSizer>
			</div>
		</>
	);
}

type ReportRouteObject = RouteObject & {
	label?: string;
};

export const reportRoutes: ReportRouteObject[] = [
	{
		path: "summary",
		label: "Members summary",
		element: <ReportTable report="summary" />,
	},
	{
		path: "publicList",
		label: "Members public list",
		element: <ReportTable report="publicList" />,
	},
	{
		path: "privateList",
		label: "Members private list",
		element: <ReportTable report="publicList" />,
	},
	{
		path: "byAffiliation",
		label: "Members by affiliation",
		element: <ChartReport Component={MembersChart} />,
	},
	{
		path: "attendanceChart",
		label: "Attendees by affiliation",
		element: <ChartReport Component={AttendeesChart} />,
	},
];

const tableReportData = {
	summary: membersSummary,
	publicList: membersPublic,
	privateList: membersPrivate,
} as const;

export function ReportTable({
	report,
}: {
	report: keyof typeof tableReportData;
}) {
	const members = useAppSelector(selectActiveMembersWithParticipationSummary);
	const tableData: TableData | null = React.useMemo(() => {
		return tableReportData[report]?.(members);
	}, [members, report]);

	return (
		<>
			<div className={styles.mainCol}>{renderTable(tableData)}</div>
			<div className={styles.actionsCol}>
				<ActionButton
					name="copy"
					onClick={() => renderTableToClipboard(tableData)}
				/>
			</div>
		</>
	);
}

function Reports() {
	const navigate = useNavigate();
	const { report } = useParams();

	const refresh = () => {
		navigate(".", { replace: true });
	};

	return (
		<>
			<div className="top-row justify-right">
				<ActionButton
					name="export"
					title="Download chart"
					onClick={() => downloadChart()}
					disabled={!document.getElementById("chart")}
				/>
				<ActionButton
					name="copy"
					title="Copy chart to clipboard"
					onClick={() => copyChartToClipboard()}
					disabled={!document.getElementById("chart")}
				/>
				<ActionButton
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</div>
			<div className={styles.body}>
				<div className={styles.selectCol}>
					<label>Select a report:</label>
					{reportRoutes.map(
						({ path, label }) =>
							label && (
								<Button
									key={path}
									onClick={
										path ? () => navigate(path) : undefined
									}
									isActive={path === report}
								>
									{label}
								</Button>
							)
					)}
				</div>
				<Outlet />
			</div>
		</>
	);
}

export default Reports;
