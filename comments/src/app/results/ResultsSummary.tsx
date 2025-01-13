import * as React from "react";

import { Dropdown, Button, DropdownRendererProps } from "dot11-components";

import { useAppSelector } from "@/store/hooks";

import {
	getBallotId,
	Ballot,
	selectCurrentBallotSeries,
	BallotType,
} from "@/store/ballots";

import styles from "./ResultsSummary.module.css";

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
	backgroundColor: pass ? "#d3ecd3" : "#f3c0c0",
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
		{ label: "Disappove:", value: (b) => b.Results?.Disapprove || 0 },
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
		{ label: "Disappove:", value: (b) => b.Results?.Disapprove || 0 },
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

	return (
		<div className={styles.container}>
			<div
				className={styles.grid}
				style={{
					gridTemplateColumns: `220px repeat(${valueCols.length}, 100px)`,
				}}
			>
				{labelCol}
				{valueCols}
			</div>
		</div>
	);
}

function resultsSummary(ballot: Ballot) {
	const r = ballot.Results!;
	return (
		<span>{`${r.Approve}/${r.Disapprove}/${r.Abstain} (${approvalRateStr(
			ballot
		)})`}</span>
	);
}

function SummaryButton({
	ballot,
	state,
	methods,
}: { ballot: Ballot } & DropdownRendererProps) {
	return (
		<Button
			onClick={state.isOpen ? methods.close : methods.open}
			style={{ display: "flex", ...passFailStyle(overallPass(ballot)) }}
		>
			{resultsSummary(ballot)}
			<i className={"bi-chevron" + (state.isOpen ? "-up" : "-down")} />
		</Button>
	);
}

function ShowResultsSummary() {
	const ballots = useAppSelector(selectCurrentBallotSeries);
	if (ballots.length === 0) return null;

	return (
		<Dropdown
			selectRenderer={(props) => (
				<SummaryButton
					ballot={ballots[ballots.length - 1]}
					{...props}
				/>
			)}
		>
			<LongSummary ballots={ballots} />
		</Dropdown>
	);
}

export default ShowResultsSummary;
