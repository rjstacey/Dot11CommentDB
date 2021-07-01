import React from 'react'
import {useHistory} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppTable from 'dot11-components/table'
import BallotDetailModal from './BallotDetail'
import {ActionButton} from 'dot11-components/lib/icons'
import {getData, getSortedFilteredIds} from 'dot11-components/store/dataSelectors'

import {loadBallots, BallotType} from '../store/ballots'
import {fields, loadEpolls, getSyncedEpollEntities} from '../store/epolls'

import {BallotAddModal as BallotAdd} from './BallotAdd'

function renderDate({rowData, dataKey}) {
	// rowData[key] is an ISO time string. We convert this to eastern time
	// and display only the date (not time).
	const d = new Date(rowData[dataKey])
	const str = d.toLocaleString('en-US', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York'})
	return str
}

// The action row height is determined by its content
const ActionRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
`;

// The table row grows to the available height
const TableRow = styled.div`
	flex: 1;
	width: 100%;
`;

function ePollToBallot(epoll) {
	// See if the ePoll name has something like CC53 or LB245
	const m = epoll.BallotID.match(/(CC|LB)\d+/)
	let type = BallotType.Motion,
		ballotId = '';
	if (m) {
		ballotId = m[0];
		type = ballotId.startsWith('CC')? BallotType.CC: BallotType.WG_Initial;
	}
	return {
		Project: '',
		BallotID: ballotId,
		Type: type,
		EpollNum: epoll.EpollNum,
		Start: epoll.Start,
		End: epoll.End,
		Document: epoll.Document,
		Topic: epoll.Topic,
		VotingPoolID: '',
		PrevBallotID: ''
	}
}
const renderActions = ({rowData}) => rowData.InDatabase
	? <span>Already Present</span>
	: <BallotAdd defaultBallot={ePollToBallot(rowData)}/>

const columns = [
		{key: 'EpollNum', 	...fields.EpollNum, 	width: 100},
		{key: 'BallotID', 	...fields.BallotID,		width: 200},
		{key: 'Start', 		...fields.Start,		width: 100},
		{key: 'End', 		...fields.End,			width: 100},
		{key: 'Document', 	...fields.Document,		width: 200},
		{key: 'Topic', 		...fields.Topic,		width: 500},
		{key: 'Votes',		...fields.Votes,		width: 100},
		{key: 'Actions', 	label: '',				width: 200,
			headerRenderer: () => '',	
			cellRenderer: renderActions}
	];

function Epolls({
	ballotsValid,
	loadBallots,
	epollsValid,
	loadEpolls,
	epolls,
	loading
}) {
	const history = useHistory();
	const numberEpolls = React.useRef(20);
	const [epollNum, setEpollNum] = React.useState(null);


	const primaryDataKey = 'EpollNum'

	const maxWidth = columns.reduce((acc, col) => acc + col.width, 0) + 40

	React.useEffect(() => {
		if (!ballotsValid)
			loadBallots();
		if (!epollsValid)
			loadEpolls(numberEpolls.current);
	}, [ballotsValid, loadBallots, epollsValid, loadEpolls])

	//React.useEffect(() => {console.log('epolls changed')}, [props.epolls]);

	const refresh = () => loadEpolls(numberEpolls.current);
	const close = () => history.goBack();

	function getMore() {
		numberEpolls.current += 10;
		loadEpolls(numberEpolls.current);
	}


	return <>
		<ActionRow style={{maxWidth}}>
			<span><label>Closed ePolls</label></span>
			<span>
				<ActionButton name='more' title='Load More' onClick={getMore} />
				<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				<ActionButton name='close' title='Close' onClick={close} />
			</span>
		</ActionRow>
		<TableRow style={{maxWidth}}>
			<AppTable
				columns={columns}
				headerHeight={28}
				estimatedRowHeight={64}
				dataSet={dataSet}
				loading={loading}
				rowGetter={({rowId}) => epolls[rowId]}
				rowKey={primaryDataKey}
			/>
		</TableRow>
	</>
}

const dataSet = 'epolls';

export default connect(
	(state) => {
		return {
			ballotsValid: state.ballots.valid,
			epollsValid: state[dataSet].valid,
			loading: state[dataSet].loading,
			epolls: getSyncedEpollEntities(state)
		}
	},
	{loadEpolls, loadBallots}
)(Epolls)
