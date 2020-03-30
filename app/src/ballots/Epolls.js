import React, {useRef, useEffect} from 'react'
import {connect} from 'react-redux'
import {useHistory} from 'react-router-dom'
import AppTable, {renderDate} from '../general/AppTable'
import {ActionButton} from '../general/Icons'
import {setEpollsSort, setEpollsFilter, getEpolls} from '../actions/epolls'


function Epolls(props) {
	const history = useHistory()

	const columns = [
		{dataKey: 'EpollNum',	label: 'ePoll',			width: 100,	sortable: true},
		{dataKey: 'BallotID',	label: 'ePoll Name',	width: 200,	sortable: true},
		{dataKey: 'Document',	label: 'Document',		width: 200,	sortable: true},
		{dataKey: 'Topic',		label: 'Topic',			width: 500,	sortable: true},
		{dataKey: 'Start',		label: 'Start',			width: 100,	sortable: true,
			cellRenderer: renderDate},
		{dataKey: 'End',		label: 'End',			width: 100,	sortable: true,
			cellRenderer: renderDate},
		{dataKey: 'Votes',		label: 'Result',		width: 100,	sortable: true},
		{dataKey: '',			label: '',				width: 200,	sortable: false,
			cellRenderer: renderActions,
			isLast: true}
	]
	const maxWidth = columns.reduce((acc, col) => acc + col.width, 0)
	const width = Math.min(window.innerWidth - 1, maxWidth)

	const primaryDataKey = columns[0].dataKey

	const numberEpolls = useRef(20)

	useEffect(() => {
		if (!props.epollsValid) {
			props.dispatch(getEpolls(numberEpolls.current))
		}
	}, [])

	function getTableSize() {
		const headerEl = document.getElementsByTagName('header')[0]
		const topRowEl = document.getElementById('top-row')
		const headerHeight = headerEl.offsetHeight + topRowEl.offsetHeight
		const height = window.innerHeight - headerHeight - 1
		return {height, width}
	}

	function importClick(rowData) {
		history.push(`/ImportEpoll/${rowData.EpollNum}`)
	}

	function refresh() {
		props.dispatch(getEpolls(numberEpolls.current))
	}

	function close() {
		history.goBack();
	}

	function getMore() {
		numberEpolls.current += 10;
		props.dispatch(getEpolls(numberEpolls.current))
	}

	function renderActions({rowData}) {
		if (rowData.InDatabase) {
			return (
				<span>Already Present</span>
			)
		} else {
			return (
				<ActionButton name='import' title='Import' onClick={() => importClick(rowData)} />
			)
		}
	}
	
	return (
		<div id='Epolls' style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', width, justifyContent: 'space-between'}}>
				<span><label>Closed ePolls</label></span>
				<span>
					<ActionButton name='more' title='Load More' onClick={getMore} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
					<ActionButton name='close' title='Close' onClick={close} />
				</span>
			</div>
			<AppTable
				columns={columns}
				rowHeight={54}
				getTableSize={getTableSize}
				loading={props.getEpolls}
				filters={props.filters}
				sortBy={props.sortBy}
				sortDirection={props.sortDirection}
				setSort={(dataKey, event) => props.dispatch(setEpollsSort(event, dataKey))}
				setFilter={(dataKey, value) => props.dispatch(setEpollsFilter(dataKey, value))}
				expanded={true}
				data={props.epolls}
				dataMap={props.epollsMap}
				primaryDataKey={primaryDataKey}
			/>
		</div>
	)
}

function mapStateToProps(state) {
	const s = state.epolls

	return {
		filters: s.filters,
		sortBy: s.sortBy,
		sortDirection: s.sortDirection,
		epollsValid: s.epollsValid,
		epolls: s.epolls,
		epollsMap: s.epollsMap,
		getEpolls: s.getEpolls
	}
}
export default connect(mapStateToProps)(Epolls)
