import React from "react";

import { IconCollapse } from "dot11-components";

import { useAppSelector } from "../store/hooks";

import {
	BallotType,
	BallotTypeLabels,
	selectCurrentBallot,
	Ballot,
} from "../store/ballots";

import styles from "./ResultsSummary.module.css";

type ResultsSummaryForDisplay = {
	opened: string;
	closed: string;
	duration: string;
	votingPoolSize: number;
	comments: number;

	approvalRate: string;
	approvalRateReq: string;
	approvalRatePass: boolean;
	approve: number;
	disapprove: number;
	abstain: number;

	invalidVote: number;
	invalidDisapprove: number;
	invalidAbstain: number;

	returns: number;
	returnsRate: string;
	returnsRateReq: string;
	returnsRatePass: boolean;

	abstainsRate: string;
	abstainsRateReq: string;
	abstainsRatePass: boolean;
};

function getResultsSummary(ballot: Ballot) {
	const summary: ResultsSummaryForDisplay = {
		opened: "",
		closed: "",
		duration: "",
		votingPoolSize: 0,
		comments: 0,

		approvalRate: "",
		approvalRateReq: "",
		approvalRatePass: false,
		approve: 0,
		disapprove: 0,
		abstain: 0,

		invalidVote: 0,
		invalidDisapprove: 0,
		invalidAbstain: 0,

		returns: 0,
		returnsRate: "",
		returnsRateReq: "",
		returnsRatePass: false,
		abstainsRate: "",
		abstainsRateReq: "",
		abstainsRatePass: false,
	};

	if (ballot.Start && ballot.End) {
		const dStart = new Date(ballot.Start);
		summary.opened = dStart.toLocaleString("en-US", {
			year: "numeric",
			month: "numeric",
			day: "numeric",
			timeZone: "America/New_York",
		});
		const dEnd = new Date(ballot.End);
		summary.closed = dEnd.toLocaleString("en-US", {
			year: "numeric",
			month: "numeric",
			day: "numeric",
			timeZone: "America/New_York",
		});
		const _MS_PER_DAY = 1000 * 60 * 60 * 24;
		const dur = Math.floor(
			(dEnd.getMilliseconds() - dStart.getMilliseconds()) / _MS_PER_DAY
		);
		if (!isNaN(dur)) summary.duration = `${dur} days`;
	}

	if (ballot.Comments) {
		summary.comments = ballot.Comments.Count;
	}

	const r = ballot.Results;
	if (r) {
		summary.votingPoolSize = r.ReturnsPoolSize;
		let pct = r.Approve / (r.Approve + r.Disapprove);
		if (!isNaN(pct)) {
			summary.approvalRate = `${(100 * pct).toFixed(1)}%`;
			if (ballot.Type !== BallotType.CC) {
				summary.approvalRatePass = pct > 0.75;
				summary.approvalRateReq =
					(summary.approvalRatePass ? "Meets" : "Does not meet") +
					" approval requirement (>75%)";
			}
		}
		summary.approve = r.Approve;
		summary.disapprove = r.Disapprove;
		summary.abstain = r.Abstain;
		summary.invalidVote = r.InvalidVote;
		summary.invalidDisapprove = r.InvalidDisapprove;
		summary.invalidAbstain = r.InvalidAbstain;
		summary.returns = r.TotalReturns;
		pct = r.TotalReturns / r.ReturnsPoolSize;
		if (!isNaN(pct)) {
			summary.returnsRate = `${(100 * pct).toFixed(1)}%`;
			if (ballot.Type !== BallotType.CC) {
				const threshold =
					ballot.Type === BallotType.SA
						? 0.75 // SA ballot requirement
						: 0.5; // WG ballot or motion requirement
				summary.returnsRatePass = pct > threshold;
				summary.returnsRateReq =
					(summary.returnsRatePass ? "Meets" : "Does not meet") +
					` return requirement (>${threshold * 100}%)`;
			}
		}
		pct = r.Abstain / r.ReturnsPoolSize;
		if (!isNaN(pct)) {
			summary.abstainsRate = `${(100 * pct).toFixed(1)}%`;
			if (ballot.Type !== BallotType.CC) {
				summary.abstainsRatePass = pct < 0.3;
				summary.abstainsRateReq =
					(summary.abstainsRatePass ? "Meets" : "Does not meet") +
					" abstain requirement (<30%)";
			}
		}
	}

	return summary;
}

const Title = (props: React.ComponentProps<"div">) => (
	<div className={styles.title} {...props} />
);

const LV = (props: React.ComponentProps<"div">) => (
	<div className={styles.labelValue} {...props} />
);

const Col = ({
	width,
	...props
}: { width: number } & React.ComponentProps<"div">) => (
	<div className={styles.col} style={{ flex: `0 1 ${width}px` }} {...props} />
);

const PassFailBlock = ({ pass, ...props }: { pass: any } & React.ComponentProps<"div">) => (
	<div style={{backgroundColor: pass ? "#d3ecd3" : "#f3c0c0"}} {...props} />
);

const PassFailSpan = ({ pass, ...props }: { pass: any } & React.ComponentProps<"span">) => (
	<span style={{backgroundColor: pass ? "#d3ecd3" : "#f3c0c0"}} {...props} />
);

const LabelValue = ({
	label,
	children,
	...otherProps
}: { label: string } & React.ComponentProps<typeof LV>) => (
	<LV {...otherProps}>
		<span>{label}</span>
		{typeof children === "string" || typeof children === "number" ? (
			<span>{children}</span>
		) : (
			children
		)}
	</LV>
);

const BallotColumn = ({
	ballot,
	summary,
}: {
	ballot: Ballot;
	summary: ResultsSummaryForDisplay;
}) => (
	<Col width={260}>
		<Title>{BallotTypeLabels[ballot.Type] || "Unexpected"}</Title>
		<LabelValue label="Opened:">{summary.opened}</LabelValue>
		<LabelValue label="Closed:">{summary.closed}</LabelValue>
		<LabelValue label="Duration:">{summary.duration}</LabelValue>
		{ballot.Type === BallotType.SA && (
			<LabelValue label="Ballot group members:">
				{summary.votingPoolSize}
			</LabelValue>
		)}
		{(ballot.Type === BallotType.WG ||
			ballot.Type === BallotType.Motion) && (
			<LabelValue label="Voting pool size:">
				{summary.votingPoolSize}
			</LabelValue>
		)}
		<LabelValue label="Comments:">{summary.comments}</LabelValue>
	</Col>
);

const ResultColumn = ({
	ballot,
	summary,
}: {
	ballot: Ballot;
	summary: ResultsSummaryForDisplay;
}) => (
	<Col width={300}>
		<Title>Result</Title>
		<LabelValue label="Approve:">{summary.approve}</LabelValue>
		<LabelValue label="Disapprove:">{summary.disapprove}</LabelValue>
		{ballot.Type === BallotType.SA && (
			<LabelValue label="Disapprove without MBS comment:">
				{summary.invalidDisapprove}
			</LabelValue>
		)}
		<LabelValue label="Abstain:">{summary.abstain}</LabelValue>
		<LabelValue label="Total returns:">{summary.returns}</LabelValue>
		{ballot.Type === BallotType.Motion && (
			<LabelValue label="Not in pool:">{summary.invalidVote}</LabelValue>
		)}
	</Col>
);

const InvalidVotesColumn = ({
	summary,
}: {
	summary: ResultsSummaryForDisplay;
}) => (
	<Col width={300}>
		<Title>Invalid votes</Title>
		<LabelValue label="Not in pool:">{summary.invalidVote}</LabelValue>
		<LabelValue label="Disapprove without comment:">
			{summary.invalidDisapprove}
		</LabelValue>
		<LabelValue label="Abstain reason:">
			{summary.invalidAbstain}
		</LabelValue>
	</Col>
);

const ApprovalCriteriaColumn = ({
	summary,
}: {
	summary: ResultsSummaryForDisplay;
}) => (
	<Col width={400}>
		<Title>Approval criteria</Title>
		<PassFailBlock pass={summary.approvalRatePass}>
			<LabelValue label="Approval rate:">
				{summary.approvalRate}
			</LabelValue>
			{summary.approvalRateReq && <div>{summary.approvalRateReq}</div>}
		</PassFailBlock>
		<PassFailBlock pass={summary.returnsRatePass}>
			<LabelValue label="Returns as % of pool:">
				{summary.returnsRate}
			</LabelValue>
			<div>{summary.returnsRateReq}</div>
		</PassFailBlock>
		<PassFailBlock pass={summary.abstainsRatePass}>
			<LabelValue label="Abstains as % of returns:">
				{summary.abstainsRate}
			</LabelValue>
			<div>{summary.abstainsRateReq}</div>
		</PassFailBlock>
	</Col>
);

const DetailedSummary = ({
	ballot,
	summary,
}: {
	ballot: Ballot;
	summary: ResultsSummaryForDisplay;
}) => (
	<>
		<BallotColumn ballot={ballot} summary={summary} />
		<ResultColumn ballot={ballot} summary={summary} />
		{ballot.Type === BallotType.WG && (
			<InvalidVotesColumn summary={summary} />
		)}
		{ballot.Type !== BallotType.CC && (
			<ApprovalCriteriaColumn summary={summary} />
		)}
	</>
);

const BasicSummary = ({
	ballot,
	summary,
}: {
	ballot: Ballot;
	summary: ResultsSummaryForDisplay;
}) => (
	<>
		<Col width={200}>
			<Title>{BallotTypeLabels[ballot.Type] || "Unexpected"}</Title>
		</Col>
		<Col width={200}>
			<PassFailSpan pass={summary.approvalRatePass}>
				{summary.approve}/{summary.disapprove}/{summary.abstain} (
				{summary.approvalRate})
			</PassFailSpan>
		</Col>
	</>
);

function ShowResultsSummary({
	style,
}: {
	style?: React.CSSProperties;
}) {
	const [showSummary, setShowSummary] = React.useState(true);
	const ballot = useAppSelector(selectCurrentBallot);
	//console.log(ballot)
	if (!ballot) return null;

	const summary = getResultsSummary(ballot);

	return (
		<div className={styles.container} style={style}>
			{showSummary ? (
				<DetailedSummary ballot={ballot} summary={summary} />
			) : (
				<BasicSummary ballot={ballot} summary={summary} />
			)}
			<IconCollapse
				isCollapsed={!showSummary}
				onClick={() => setShowSummary(!showSummary)}
			/>
		</div>
	);
}

export default ShowResultsSummary;
