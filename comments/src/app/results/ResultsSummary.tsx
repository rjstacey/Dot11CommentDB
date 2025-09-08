import * as React from "react";
import { Container, DropdownButton, Button } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";

import {
	getBallotId,
	Ballot,
	selectCurrentBallotSeries,
	BallotType,
} from "@/store/ballots";

import styles from "./ResultsSummary.module.css";

const passColor = "#d3ecd3";
const failColor = "#f3c0c0";

function copyHtmlToClipboard(html: string) {
	const type = "text/html";
	const blob = new Blob([html], { type });
	const data = [new ClipboardItem({ [type]: blob })];
	navigator.clipboard.write(data);
}

const camelToKebab = (value: string) =>
	value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

function styleObjToString(style: React.CSSProperties) {
	return Object.entries(style)
		.map(([key, value]) => `${camelToKebab(key)}: ${value}`)
		.join("; ");
}

type Label = string | ((b: Ballot) => string);
type Value = null | ((b: Ballot) => string | number);
type Style = undefined | ((b: Ballot) => React.CSSProperties);

type ResultRender = {
	label?: Label;
	value?: Value;
	style?: Style;
};

const ballotDate = (d: string | null) =>
	d
		? new Date(d).toLocaleString("en-US", {
				year: "numeric",
				month: "numeric",
				day: "numeric",
				timeZone: "America/New_York",
		  })
		: "-";

const ballotDuration = (b: Ballot) => {
	if (b.Start && b.End) {
		const dStart = new Date(b.Start);
		const dEnd = new Date(b.End);
		const _MS_PER_DAY = 1000 * 60 * 60 * 24;
		const dur = Math.floor(
			(dEnd.valueOf() - dStart.valueOf()) / _MS_PER_DAY
		);
		if (!isNaN(dur)) return `${dur} days`;
	}
	return "-";
};

const percentageStr = (n: number) => `${(100 * n).toFixed(1)}%`;

const passFailStyle = (pass: boolean): React.CSSProperties => ({
	backgroundColor: pass ? passColor : failColor,
});

const approvalRate = (b: Ballot) => {
	const approve = b.Results?.Approve || 0;
	const disapprove = b.Results?.Disapprove || 0;
	return approve / (approve + disapprove);
};

const approvalRateStr = (b: Ballot) => percentageStr(approvalRate(b));
const approvalRatePass = (b: Ballot) => approvalRate(b) > 0.75;

const returnsRate = (b: Ballot) => {
	const totalReturns = b.Results?.TotalReturns || 0;
	const poolSize = b.Results?.ReturnsPoolSize || 0;
	return totalReturns / poolSize;
};

const returnsRateStr = (b: Ballot) => percentageStr(returnsRate(b));
const returnsRatePass = (b: Ballot) => {
	const threshold = b.Type === BallotType.SA ? 0.75 : 0.5;
	return returnsRate(b) > threshold;
};

const abstainRate = (b: Ballot) => {
	const abstain = b.Results?.Abstain || 0;
	const poolSize = b.Results?.ReturnsPoolSize || 0;
	return abstain / poolSize;
};

const abstainRateStr = (b: Ballot) => percentageStr(abstainRate(b));
const abstainRatePass = (b: Ballot) => abstainRate(b) < 0.3;

const overallPass = (b: Ballot) =>
	approvalRatePass(b) && returnsRatePass(b) && abstainRatePass(b);
const overallPassStr = (b: Ballot) => (overallPass(b) ? "PASS" : "FAIL");

const basicsRenderer: (Label | ResultRender)[] = [
	{ label: "Draft:", value: (b) => b.Document },
	{ label: "Opened:", value: (b) => ballotDate(b.Start) },
	{ label: "Closed:", value: (b) => ballotDate(b.End) },
	{ label: "Duration:", value: ballotDuration },
	{
		label: "Voting pool size:",
		value: (b) => b.Results?.VotingPoolSize || 0,
	},
];

const wgHeaderRenderer: (Label | ResultRender)[] = [
	{ value: getBallotId, style: () => ({ textAlign: "center" }) },
];

const wgResultsRenderer: (Label | ResultRender)[] = wgHeaderRenderer
	.concat(basicsRenderer)
	.concat([
		"Result",
		{ label: "Approve:", value: (b) => b.Results?.Approve || 0 },
		{ label: "Disapprove:", value: (b) => b.Results?.Disapprove || 0 },
		{ label: "Abstain:", value: (b) => b.Results?.Abstain || 0 },
		{ label: "Total returns:", value: (b) => b.Results?.TotalReturns || 0 },
		{ label: "Comments:", value: (b) => b.Comments?.Count || 0 },
		"Invalid votes",
		{ label: "Not in pool:", value: (b) => b.Results?.InvalidVote || 0 },
		{
			label: "Disapprove w/out comment:",
			value: (b) => b.Results?.InvalidDisapprove || 0,
		},
		{
			label: "Invalid abstain:",
			value: (b) => b.Results?.InvalidAbstain || 0,
		},
		"Approval criteria",
		{
			label: "Approval rate (≥ 75%):",
			value: approvalRateStr,
			style: (b) => passFailStyle(approvalRatePass(b)),
		},
		{
			label: "Returns as % of pool (≥ 50%):",
			value: returnsRateStr,
			style: (b) => passFailStyle(returnsRatePass(b)),
		},
		{
			label: "Abstains as % of pool (< 30%):",
			value: abstainRateStr,
			style: (b) => passFailStyle(abstainRatePass(b)),
		},
		{ value: overallPassStr, style: (b) => passFailStyle(overallPass(b)) },
	]);

const saHeaderRenderer: (Label | ResultRender)[] = [
	{
		value: (b) => (b.stage === 0 ? "Initial" : `Recirc ${b.stage}`),
		style: () => ({ textAlign: "center" }),
	},
];

const saResultsRenderer: (Label | ResultRender)[] = saHeaderRenderer
	.concat(basicsRenderer)
	.concat([
		"Result",
		{ label: "Approve:", value: (b) => b.Results?.Approve || 0 },
		{ label: "Disapprove:", value: (b) => b.Results?.Disapprove || 0 },
		{
			label: "Disapprove w/out comment:",
			value: (b) => b.Results?.InvalidDisapprove || 0,
		},
		{ label: "Abstain:", value: (b) => b.Results?.Abstain || 0 },
		{ label: "Total returns:", value: (b) => b.Results?.TotalReturns || 0 },
		{ label: "Comments:", value: (b) => b.Comments?.Count || 0 },
		"Approval criteria",
		{
			label: "Approval rate (≥ 75%):",
			value: approvalRateStr,
			style: (b) => passFailStyle(approvalRatePass(b)),
		},
		{
			label: "Returns as % of pool (≥ 75%):",
			value: returnsRateStr,
			style: (b) => passFailStyle(returnsRatePass(b)),
		},
		{
			label: "Abstains as % of pool (< 30%):",
			value: abstainRateStr,
			style: (b) => passFailStyle(abstainRatePass(b)),
		},
		{ value: overallPassStr, style: (b) => passFailStyle(overallPass(b)) },
	]);

function longSummaryHtml(ballots: Ballot[]) {
	const renderer =
		ballots[0].Type === BallotType.SA
			? saResultsRenderer
			: wgResultsRenderer;
	const rows = renderer.map((r) => {
		if (typeof r === "string") {
			const style: React.CSSProperties = {
				fontWeight: "bold",
				padding: "0.2em 0.8em",
			};
			return `<td colspan="${
				ballots.length + 1
			}" style="${styleObjToString(style)}">${r}</td>`;
		} else {
			const cols: string[] = [];
			const label =
				typeof r === "object" && typeof r.label === "string"
					? r.label
					: "";
			const style: React.CSSProperties = {
				padding: "0.2em 1.2em",
			};
			cols.push(`<td style="${styleObjToString(style)}">${label}</td>`);
			ballots.forEach((ballot) => {
				let style: React.CSSProperties = {
					padding: "0.2em 1.2em",
					textAlign: "end",
				};
				let s: string | number = "";
				if (typeof r === "object") {
					if (r.value) s = r.value(ballot);
					if (!r.label) style = { ...style, fontWeight: "bold" };
					if (r.style)
						style = {
							...style,
							...r.style(ballot),
						};
				}
				cols.push(`<td style="${styleObjToString(style)}">${s}</td>`);
			});
			return cols.join("");
		}
	});
	const body = rows.map((row) => `<tr>${row}</tr>`).join("");

	return `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid black;}
			td {vertical-align: top;}
		</style>
		<table><tbody>${body}</tbody></table>
	`;
}

function LongSummary({ ballots }: { ballots: Ballot[] }) {
	const renderer =
		ballots[0].Type === BallotType.SA
			? saResultsRenderer
			: wgResultsRenderer;
	const labelCol = renderer.map((r, y) => {
		let gridColumn: string = "1";
		let s: string | undefined;
		let style: React.CSSProperties | undefined;
		if (typeof r === "string") {
			s = r;
			gridColumn += "/3";
			style = { fontWeight: "bold", marginTop: "10px" };
		} else if (typeof r === "object" && typeof r.label === "string") {
			s = r.label;
		}
		return (
			<div
				key={"" + y + "-1"}
				style={{ ...style, gridRow: 1 + y, gridColumn }}
			>
				{s}
			</div>
		);
	});

	const valueCols = ballots.map((ballot, x) => {
		return renderer.map((r, y) => {
			let s: undefined | string | number;
			let style: React.CSSProperties = {
				gridRow: 1 + y,
				gridColumn: 2 + x,
				textAlign: "right",
			};
			if (typeof r === "object") {
				if (r.value) s = r.value(ballot);
				if (!r.label) style = { ...style, fontWeight: "bold" };
				if (r.style) style = { ...style, ...r.style(ballot) };
			}
			return (
				<div key={"" + y + "-" + (2 + x)} style={style}>
					{s}
				</div>
			);
		});
	});

	const html = longSummaryHtml(ballots);
	console.log(html);

	return (
		<Container className={styles.container}>
			<Button
				variant="outline-secondary"
				className="bi-copy ms-auto"
				onClick={() => copyHtmlToClipboard(html)}
			/>
			<div
				className={styles.grid}
				style={{
					gridTemplateColumns: `220px repeat(${valueCols.length}, 100px)`,
				}}
			>
				{labelCol}
				{valueCols}
			</div>
		</Container>
	);
}

const passStyle = {
	backgroundColor: passColor,
	padding: "0.25rem",
};

const failStyle = {
	backgroundColor: failColor,
	padding: "0.25rem",
};

function resultsSummary(ballot: Ballot) {
	const r = ballot.Results!;
	return (
		<span style={overallPass(ballot) ? passStyle : failStyle}>
			{`${r.Approve}/${r.Disapprove}/${r.Abstain} (${approvalRateStr(
				ballot
			)})`}
		</span>
	);
}

function ShowResultsSummary() {
	const ballots = useAppSelector(selectCurrentBallotSeries);
	if (ballots.length === 0) return null;
	const ballot = ballots[ballots.length - 1];

	const title = <span>Summary: {resultsSummary(ballot)}</span>;

	return (
		<DropdownButton align="end" variant="light" title={title}>
			<LongSummary ballots={ballots} />
		</DropdownButton>
	);
}

export default ShowResultsSummary;
