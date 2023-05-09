import React from 'react';
import styled from '@emotion/styled';

import { IconCollapse } from 'dot11-components';

import { useAppSelector } from '../store/hooks';

import { BallotType, BallotTypeLabels, selectCurrentBallot, Ballot } from '../store/ballots';
//import {getResultsDataSet} from '../store/results';

type ResultsSummary = {
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
}

function getResultsSummary(ballot: Ballot) {
	const summary: ResultsSummary = {
		opened: '',
		closed: '',
		duration: '',
		votingPoolSize: 0,
		comments: 0,

		approvalRate: '',
		approvalRateReq: '',
		approvalRatePass: false,
		approve: 0,
		disapprove: 0,
		abstain: 0,

		invalidVote: 0,
		invalidDisapprove: 0,
		invalidAbstain: 0,

		returns: 0,
		returnsRate: '',
		returnsRateReq: '',
		returnsRatePass: false,
		abstainsRate: '',
		abstainsRateReq: '',
		abstainsRatePass: false
	}

	if (ballot.Start && ballot.End) {
		const dStart = new Date(ballot.Start);
		summary.opened = dStart.toLocaleString('en-US', {year: 'numeric', month: 'numeric', day: 'numeric' , timeZone: 'America/New_York'});
		const dEnd = new Date(ballot.End);
		summary.closed = dEnd.toLocaleString('en-US', {year: 'numeric', month: 'numeric', day: 'numeric' , timeZone: 'America/New_York'})
		const _MS_PER_DAY = 1000 * 60 * 60 * 24;
		const dur = Math.floor((dEnd.getMilliseconds() - dStart.getMilliseconds()) / _MS_PER_DAY);
		if (!isNaN(dur))
			summary.duration = `${dur} days`;
	}

	if (ballot.Comments) {
		summary.comments = ballot.Comments.Count;
	}

	const r = ballot.Results;
	if (r) {
		summary.votingPoolSize = r.ReturnsPoolSize;
		let pct = r.Approve/(r.Approve+r.Disapprove);
		if (!isNaN(pct)) {
			summary.approvalRate = `${(100*pct).toFixed(1)}%`
			if (ballot.Type !== BallotType.CC) {
				summary.approvalRatePass = pct > 0.75;
				summary.approvalRateReq = (summary.approvalRatePass? 'Meets': 'Does not meet') + ' approval requirement (>75%)';
			}
		}
		summary.approve = r.Approve;
		summary.disapprove = r.Disapprove;
		summary.abstain = r.Abstain;
		summary.invalidVote = r.InvalidVote;
		summary.invalidDisapprove = r.InvalidDisapprove;
		summary.invalidAbstain = r.InvalidAbstain;
		summary.returns = r.TotalReturns;
		pct = r.TotalReturns/r.ReturnsPoolSize;
		if (!isNaN(pct)) {
			summary.returnsRate = `${(100*pct).toFixed(1)}%`;
			if (ballot.Type !== BallotType.CC) {
				const threshold = (ballot.Type === BallotType.SA)?
					0.75: 	// SA ballot requirement
					0.5		// WG ballot or motion requirement
				summary.returnsRatePass = pct > threshold
				summary.returnsRateReq = (summary.returnsRatePass? 'Meets': 'Does not meet') + ` return requirement (>${threshold*100}%)`
			}
		}
		pct = r.Abstain/r.ReturnsPoolSize;
		if (!isNaN(pct)) {
			summary.abstainsRate = `${(100*pct).toFixed(1)}%`
			if (ballot.Type !== BallotType.CC) {
				summary.abstainsRatePass = pct < 0.3
				summary.abstainsRateReq = (summary.abstainsRatePass? 'Meets': 'Does not meet') + ' abstain requirement (<30%)'
			}
		}
	}

	return summary
}

const Title = styled.div`
	font-weight: bold;
	margin: 5px 0 5px 0;
`;

const LV = styled.div`
	display: flex;
	justify-content: space-between;
`;

const Col = styled.div<{width: number}>`
	display: flex;
	flex-direction: column;
	flex: 0 1 ${({width}) => width}px;
	padding: 0 20px;
	:first-of-type {padding-left: 0}
	:last-of-type {padding-right: 0}
`;

const Container = styled.div`
	position: relative;
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	padding: 0 10px 10px 10px;
	box-sizing: border-box;
`;

const PassFailBlock = styled.div<{pass: any}>`
	${({pass}) => typeof pass === 'boolean' && ('background-color: ' + (pass? '#d3ecd3': '#f3c0c0'))}
`;

const PassFailSpan = PassFailBlock.withComponent('span');

const LabelValue = ({label, children, ...otherProps}) =>
	<LV {...otherProps} >
		<span>{label}</span>
		{(typeof children === 'string' || typeof children === 'number')? <span>{children}</span>: children}
	</LV>

const BallotColumn = ({ballot, summary}: {ballot: Ballot; summary: ResultsSummary}) =>
	<Col width={260}>
		<Title>{BallotTypeLabels[ballot.Type] || 'Unexpected'}</Title>
		<LabelValue label='Opened:'>{summary.opened}</LabelValue>
		<LabelValue label='Closed:'>{summary.closed}</LabelValue>
		<LabelValue label='Duration:'>{summary.duration}</LabelValue>
		{ballot.Type === BallotType.SA &&
			<LabelValue label='Ballot group members:'>{summary.votingPoolSize}</LabelValue>}
		{(ballot.Type === BallotType.WG || ballot.Type === BallotType.Motion) &&
			<LabelValue label='Voting pool size:'>{summary.votingPoolSize}</LabelValue>}
		<LabelValue label='Comments:'>{summary.comments}</LabelValue>
	</Col>

const ResultColumn = ({ballot, summary}: {ballot: Ballot; summary: ResultsSummary}) =>
	<Col width={300}>
		<Title>Result</Title>
		<LabelValue label='Approve:'>{summary.approve}</LabelValue>
		<LabelValue label='Disapprove:'>{summary.disapprove}</LabelValue>
		{(ballot.Type === BallotType.SA) &&
			<LabelValue label='Disapprove without MBS comment:'>{summary.invalidDisapprove}</LabelValue>}
		<LabelValue label='Abstain:'>{summary.abstain}</LabelValue>
		<LabelValue label='Total returns:'>{summary.returns}</LabelValue>
		{ballot.Type === BallotType.Motion &&
			<LabelValue label='Not in pool:'>{summary.invalidVote}</LabelValue>}
	</Col>

const InvalidVotesColumn = ({summary}: {summary: ResultsSummary}) =>
	<Col width={300}>
		<Title>Invalid votes</Title>
		<LabelValue label='Not in pool:'>{summary.invalidVote}</LabelValue>
		<LabelValue label='Disapprove without comment:'>{summary.invalidDisapprove}</LabelValue>
		<LabelValue label='Abstain reason:'>{summary.invalidAbstain}</LabelValue>
	</Col>

const ApprovalCriteriaColumn = ({summary}: {summary: ResultsSummary}) =>
	<Col width={400}>
		<Title>Approval criteria</Title>
		<PassFailBlock pass={summary.approvalRatePass} >
			<LabelValue label='Approval rate:'>{summary.approvalRate}</LabelValue>
			{summary.approvalRateReq && <div>{summary.approvalRateReq}</div>}
		</PassFailBlock>
		<PassFailBlock pass={summary.returnsRatePass} >
			<LabelValue label='Returns as % of pool:'>{summary.returnsRate}</LabelValue>
			<div>{summary.returnsRateReq}</div>
		</PassFailBlock>
		<PassFailBlock pass={summary.abstainsRatePass} >
			<LabelValue label='Abstains as % of returns:'>{summary.abstainsRate}</LabelValue>
			<div>{summary.abstainsRateReq}</div>
		</PassFailBlock>
	</Col>

const DetailedSummary = ({ballot, summary}: {ballot: Ballot; summary: ResultsSummary}) =>
	<>
		<BallotColumn ballot={ballot} summary={summary} />
		<ResultColumn ballot={ballot} summary={summary} />
		{(ballot.Type === BallotType.WG) &&
			<InvalidVotesColumn summary={summary} />}
		{ballot.Type !== BallotType.CC &&
			<ApprovalCriteriaColumn summary={summary} />}
	</>

const BasicSummary = ({ballot, summary}) =>
	<>
		<Col width={200}>
			<Title>{BallotTypeLabels[ballot.Type] || 'Unexpected'}</Title>
		</Col>
		<Col width={200}>
			<PassFailSpan pass={summary.approvalRatePass}>{summary.approve}/{summary.disapprove}/{summary.abstain} ({summary.approvalRate})</PassFailSpan>
		</Col>
	</>

function ShowResultsSummary({
	className,
	style
}: {
	className?: string;
	style?: React.CSSProperties;
}) {
	const [showSummary, setShowSummary] = React.useState(true);
	const ballot = useAppSelector(selectCurrentBallot);
	//console.log(ballot)
	if (!ballot)
		return null;

	const summary = getResultsSummary(ballot);

	return (
		<Container
			className={className}
			style={style}
		>
			{showSummary?
				<DetailedSummary ballot={ballot} summary={summary} />:
				<BasicSummary ballot={ballot} summary={summary} />
			}
			<IconCollapse isCollapsed={!showSummary} onClick={() => setShowSummary(!showSummary)} />
		</Container>
	)
}

export default ShowResultsSummary
