import PropTypes from 'prop-types'
import React from 'react'
import styled from '@emotion/styled'
import {Handle} from '../general/Icons'
import {BallotType} from '../actions/ballots'

function getResultsSummary(ballot, r, votingPoolSize) {
	const summary = {
		opened: '',
		closed: '',
		duration: '',
		votingPoolSize,

		approvalRate: '',
		approvalRateReq: '',
		approvalRatePass: null,
		approve: null,
		disapprove: null,
		abstain: null,

		invalidVote: null,
		invalidDisapprove: null,
		invalidAbstain: null,

		returns: null,
		returnsRate: '',
		returnsRateReq: '',
		returnsRatePass: null,
		abstainsRate: '',
		abstainsRateReq: '',
		abstainsRatePass: null
	}

	if (ballot.Start && ballot.End) {
		const dStart = new Date(ballot.Start);
		summary.opened = dStart.toLocaleString('en-US', {year: 'numeric', month: 'numeric', day: 'numeric' , timeZone: 'America/New_York'});
		const dEnd = new Date(ballot.End);
		summary.closed = dEnd.toLocaleString('en-US', {year: 'numeric', month: 'numeric', day: 'numeric' , timeZone: 'America/New_York'})
		const _MS_PER_DAY = 1000 * 60 * 60 * 24;
		const dur = Math.floor((dEnd - dStart) / _MS_PER_DAY);
		if (!isNaN(dur))
			summary.duration = `${dur} days`
	}

	if (r) {
		let pct = parseFloat(r.Approve/(r.Approve+r.Disapprove));
		if (!isNaN(pct)) {
			summary.approvalRate = `${(100*pct).toFixed(1)}%`
			if (ballot.Type !== BallotType.CC) {
				summary.approvalRatePass = pct > 0.75
				summary.approvalRateReq = (summary.approvalRatePass? 'Meets': 'Does not meet') + ' approval requirement (>75%)'
			}
		}
		summary.approve = r.Approve
		summary.disapprove = r.Disapprove
		summary.abstain = r.Abstain
		summary.invalidVote = r.InvalidVote
		summary.invalidDisapprove = r.InvalidDisapprove
		summary.invalidAbstain = r.InvalidAbstain
		summary.returns = r.TotalReturns
		pct = parseFloat(r.TotalReturns/r.ReturnsPoolSize)
		if (!isNaN(pct)) {
			summary.returnsRate = `${(100*pct).toFixed(1)}%`
			if (ballot.Type !== BallotType.CC) {
				const threshold = (ballot.Type === BallotType.SA_Initial || ballot.Type === BallotType.SA_Recirc)?
					0.75: 	// SA ballot requirement
					0.5		// WG ballot or motion requirement
				summary.returnsRatePass = pct > threshold
				summary.returnsRateReq = (summary.returnsRatePass? 'Meets': 'Does not meet') + ` return requirement (>${threshold*100}%)`
			}
		}
		pct = parseFloat(r.Abstain/votingPoolSize)
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

const Col = styled.div`
	display: flex;
	flex-direction: column;
	flex: 0 1 ${({width}) => width}px;
	padding: 0 20px;
`;

const Container = styled.div`
	position: relative;
	display: flex;
	justify-content: space-between;
	width: 100%;
	margin: 0 10px;
`;

const PassFailBlock = styled.div`
	${({pass}) => typeof pass === 'boolean' && ('background-color: ' + (pass? '#d3ecd3': '#f3c0c0'))}
`;

const PassFailSpan = PassFailBlock.withComponent('span');

const LabelValue = ({label, children, ...otherProps}) =>
	<LV {...otherProps} >
		<span>{label}</span>
		{(typeof children === 'string' || typeof children === 'number')? <span>{children}</span>: children}
	</LV>

const ballotTypeLabel = (ballotType) => {
	const labels = {
		[BallotType.CC]: 'Comment collection',
		[BallotType.WG_Initial]: 'Initial WG ballot',
		[BallotType.WG_Recirc]: 'Recirculation WG ballot',
		[BallotType.SA_Initial]: 'Initial SA ballot',
		[BallotType.SA_Recirc]: 'Recirculation SA ballot',
		[BallotType.Motion]: 'Motion'
	}
	return labels[ballotType] || 'Uexpected ballot type';
}

const BallotColumn = ({ballot, summary}) =>
	<Col width={260}>
		<Title>{ballotTypeLabel(ballot.Type)}</Title>
		<LabelValue label='Opened:'>{summary.opened}</LabelValue>
		<LabelValue label='Closed:'>{summary.closed}</LabelValue>
		<LabelValue label='Duration:'>{summary.duration}</LabelValue>
		<LabelValue label='Voting pool size:'>{summary.votingPoolSize}</LabelValue>
	</Col>

const ResultColumn = ({ballot, summary}) =>
	<Col width={300}>
		<Title>Result</Title>
		<LabelValue label='Approve:'>{summary.approve}</LabelValue>
		<LabelValue label='Disapprove:'>{summary.disapprove}</LabelValue>
		{(ballot.Type === BallotType.SA_Initial || ballot.Type === BallotType.SA_Recirc) &&
			<LabelValue label='Disapprove without MBS comment:'>{summary.invalidDisapprove}</LabelValue>}
		<LabelValue label='Abstain:'>{summary.abstain}</LabelValue>
		<LabelValue label='Total returns:'>{summary.returns}</LabelValue>
		{ballot.Type === BallotType.Motion &&
			<LabelValue label='Not in pool:'>{summary.invalidVote}</LabelValue>}
	</Col>

const InvalidVotesColumn = ({summary}) =>
	<Col width={300}>
		<Title>Invalid votes</Title>
		<LabelValue label='Not in pool:'>{summary.invalidVote}</LabelValue>
		<LabelValue label='Disapprove without comment:'>{summary.invalidDisapprove}</LabelValue>
		<LabelValue label='Abstain reason:'>{summary.invalidAbstain}</LabelValue>
	</Col>

const ApprovalCriteriaColumn = ({ballot, summary}) =>
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

const DetailedSummary = ({ballot, summary}) =>
	<React.Fragment>
		<BallotColumn ballot={ballot} summary={summary} />
		<ResultColumn ballot={ballot} summary={summary} />
		{(ballot.Type === BallotType.WG_Initial || ballot.Type === BallotType.WG_Recirc) &&
			<InvalidVotesColumn summary={summary} />}
		{ballot.Type !== BallotType.CC &&
			<ApprovalCriteriaColumn ballot={ballot} summary={summary} />}
	</React.Fragment>

const BasicSummary = ({ballot, summary}) =>
	<React.Fragment>
		<Col>
			<Title>{ballotTypeLabel(ballot.Type)}</Title>
		</Col>
		<Col>
			<PassFailSpan pass={summary.approvalRatePass}>{summary.approve}/{summary.disapprove}/{summary.abstain} ({summary.approvalRate})</PassFailSpan>
		</Col>
	</React.Fragment>

function ResultsSummary({
	className,
	style,
	ballot,
	resultsSummary,
	votingPoolSize
}) {
	const [showSummary, setShowSummary] = React.useState(true);
	const summary = getResultsSummary(ballot, resultsSummary, votingPoolSize);

	return (
		<Container
			className={className}
			style={style}
		>
			{showSummary?
				<DetailedSummary ballot={ballot} summary={summary} />:
				<BasicSummary ballot={ballot} summary={summary} />}
			<Handle
				style={{position: 'absolute', right: 0}}
				open={showSummary}
				onClick={() => setShowSummary(!showSummary)}
			/>
		</Container>
	)
}

ResultsSummary.propTypes = {
	ballot: PropTypes.object.isRequired,
	resultsSummary: PropTypes.object.isRequired,
	votingPoolSize: PropTypes.number.isRequired
}

export default ResultsSummary
