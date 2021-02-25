import React from 'react'
import {useHistory} from 'react-router-dom'
import {connect} from 'react-redux'
import Immutable from 'immutable'
import styled from '@emotion/styled'
import AppTable from '../table/AppTable'
import BallotDetailModal from './BallotDetail'
import {ActionButton} from '../general/Icons'

import {getBallots} from '../store/ballots'
import {getEpolls, getSyncedEpolls} from '../store/epolls'
import {getDataMap} from '../store/dataMap'

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

function Epolls(props) {
	const {ballotsValid, getBallots, epollsValid, getEpolls} = props;
	const history = useHistory();
	const numberEpolls = React.useRef(20);
	const [epollNum, setEpollNum] = React.useState(null);

	const columns = Immutable.OrderedMap({
		EpollNum: 	{label: 'ePoll', 		width: 100},
		BallotID: 	{label: 'ePoll Name',	width: 200},
		Document: 	{label: 'Document',		width: 200},
		Topic: 		{label: 'Topic',		width: 500},
		Start: 		{label: 'Start',		width: 100, 	cellRenderer: renderDate},
		End: 		{label: 'End',			width: 100,		cellRenderer: renderDate},
		Votes: 		{label: 'Result',		width: 100},
		Actions: 	{label: '',				width: 200,		cellRenderer: renderActions}
	});

	const primaryDataKey = 'EpollNum'

	const maxWidth = columns.reduce((acc, col) => acc + col.width, 0) + 40

	React.useEffect(() => {
		if (!ballotsValid)
			getBallots();
		if (!epollsValid)
			getEpolls(numberEpolls.current);
	}, [ballotsValid, getBallots, epollsValid, getEpolls])

	//React.useEffect(() => {console.log('epolls changed')}, [props.epolls]);

	const refresh = () => props.getEpolls(numberEpolls.current)
	const close = () => history.goBack()

	function getMore() {
		numberEpolls.current += 10;
		props.getEpolls(numberEpolls.current)
	}

	function renderActions({rowData}) {
		if (rowData.InDatabase) {
			return <span>Already Present</span>
		}
		else {
			return <ActionButton name='import' title='Import' onClick={() => setEpollNum(rowData.EpollNum)} />
		}
	}
	
	return (
		<React.Fragment>
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
					dataSet='epolls'
					data={props.epolls}
					dataMap={props.epollsMap}
					loading={props.loading}
					rowKey={primaryDataKey}
				/>
			</TableRow>
			<BallotDetailModal
				isOpen={epollNum !== null}
				ballotId='+'
				epollNum={epollNum}
				close={() => setEpollNum(null)}
			/>
		</React.Fragment>
	)
}

const dataSet = 'epolls'
export default connect(
	(state, ownProps) => {
		const s = state[dataSet]
		return {
			ballotsValid: state.ballots.valid,
			epollsValid: s.valid,
			loading: s.loading,
			epolls: getSyncedEpolls(state),
			epollsMap: getDataMap(state, dataSet),
		}
	},
	(dispatch, ownProps) => ({
		getEpolls: (n) => dispatch(getEpolls(n)),
		getBallots: () => dispatch(getBallots())
	})
)(Epolls)
