import React from 'react'
import {connect} from 'react-redux'
import {useHistory} from 'react-router-dom'
import AppTable from '../table/AppTable'
import BallotDetailModal from './BallotDetail'
import {ActionButton} from '../general/Icons'
import {setEpollsSort, setEpollsFilter, getEpolls} from '../actions/epolls'

function renderDate({rowData, key}) {
	// rowData[key] is an ISO time string. We convert this to eastern time
	// and display only the date (not time).
	const d = new Date(rowData[key])
	const str = d.toLocaleString('en-US', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York'})
	return str
}

function Epolls(props) {
	const history = useHistory()
	const numberEpolls = React.useRef(20)
	const [epollNum, setEpollNum] = React.useState(null)

	const columns = [
		{key: 'EpollNum',	label: 'ePoll',			width: 100},
		{key: 'BallotID',	label: 'ePoll Name',	width: 200},
		{key: 'Document',	label: 'Document',		width: 200},
		{key: 'Topic',		label: 'Topic',			width: 500},
		{key: 'Start',		label: 'Start',			width: 100,
			cellRenderer: renderDate},
		{key: 'End',		label: 'End',			width: 100,
			cellRenderer: renderDate},
		{key: 'Votes',		label: 'Result',		width: 100},
		{key: '',			label: '',				width: 200,
			cellRenderer: renderActions,
			isLast: true}
	]
	const maxWidth = columns.reduce((acc, col) => acc + col.width, 0)
	const width = Math.min(window.innerWidth - 1, maxWidth)

	const primaryDataKey = columns[0].dataKey

	React.useEffect(() => {
		if (!props.epollsValid)
			props.getEpolls(numberEpolls.current)
	}, [])

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
			<div style={{display: 'flex', justifyContent: 'center'}}>
				<div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width}}>
					<span><label>Closed ePolls</label></span>
					<span>
						<ActionButton name='more' title='Load More' onClick={getMore} />
						<ActionButton name='refresh' title='Refresh' onClick={refresh} />
						<ActionButton name='close' title='Close' onClick={close} />
					</span>
				</div>
			</div>
			<div style={{flex: 1}}>
				<AppTable
					columns={columns}
					headerHeight={60}
					estimatedRowHeight={64}
					loading={props.loading}
					filters={props.filters}
					setFilter={props.setFilter}
					sort={props.sort}
					setSort={props.setSort}
					data={props.epolls}
					dataMap={props.epollsMap}
					rowKey={primaryDataKey}
				/>
			</div>
			<BallotDetailModal
				isOpen={epollNum !== null}
				ballotId='+'
				epollNum={epollNum}
				close={() => setEpollNum(null)}
			/>
		</React.Fragment>
	)
}

export default connect(
	(state, ownProps) => {
		const s = state.epolls
		return {
			filters: s.filters,
			sort: s.sort,
			epollsValid: s.epollsValid,
			epolls: s.epolls,
			epollsMap: s.epollsMap,
			loading: s.getEpolls
		}
	},
	(dispatch, ownProps) => {
		return {
			getEpolls: (n) => dispatch(getEpolls(n)),
			setFilter: (dataKey, value) => dispatch(setEpollsFilter(dataKey, value)),
			setSort: (dataKey, event) => dispatch(setEpollsSort(event, dataKey))
		}
	}
)(Epolls)
