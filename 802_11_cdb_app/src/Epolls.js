import React, {useState, useRef, useEffect} from 'react'
import {connect} from 'react-redux'
import {useHistory} from 'react-router-dom'
import AppTable from './AppTable'
import {ActionButton} from './Icons'
import {setEpollsSort, setEpollsFilter, getEpolls} from './actions/epolls'

function Epolls(props) {

	const columns = [
		{dataKey: 'EpollNum',  width: 100, label: 'ePoll',
			sortable: true},
		{dataKey: 'BallotID',  width: 200, label: 'ePoll Name',
			sortable: true},
		{dataKey: 'Document',  width: 200, label: 'Document',
			sortable: true},
		{dataKey: 'Topic',     width: 500, label: 'Topic',
			sortable: true},
		{dataKey: 'Start',     width: 100, label: 'Start',
			sortable: true,
			cellRenderer: renderDate},
		{dataKey: 'End',       width: 100, label: 'End',
			sortable: true,
			cellRenderer: renderDate},
		{dataKey: 'Votes',     width: 100, label: 'Result',
			sortable: true},
		{dataKey: '', label: '',
			sortable: false,
			width: 200,
			cellRenderer: renderActions,
			isLast: true}
	]

	const primaryDataKey = columns[0].dataKey

	const history = useHistory()

	const numberEpolls = useRef(20)

	const [tableSize, setTableSize] = useState({
		height: 400,
		width: 300,
	});

	function updateTableSize() {
		const maxWidth = columns.reduce((acc, col) => acc + col.width, 0)
		const headerEl = document.getElementsByTagName('header')[0];
		const topRowEl = document.getElementById('top-row')

		const height = window.innerHeight - headerEl.offsetHeight - topRowEl.offsetHeight - 5;
		const width = window.innerWidth - 1;

		if (height !== tableSize.height || width !== tableSize.width) {
			setTableSize({height, width: Math.min(width, maxWidth)});
		}
	}

	useEffect(() => {
		updateTableSize();
		window.addEventListener("resize", updateTableSize);
		return () => {
			window.removeEventListener("resize", updateTableSize);
		}
	}, [])

	useEffect(() => {
		if (!props.epollsValid) {
			props.dispatch(getEpolls(numberEpolls.current))
		}
	}, [])

	function importClick(rowData) {
		console.log(rowData)
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

	function renderDate({rowData, dataKey}) {
		// rowData[dataKey] is an ISO time string. We convert this to eastern time
		// and display only the date (not time).
		var d = new Date(rowData[dataKey])
		var str = d.toLocaleString('en-US', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York'})
		return str
	}

	return (
		<div id='Epolls' style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', width: tableSize.width, justifyContent: 'space-between'}}>
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
				height={tableSize.height}
				width={tableSize.width}
				loading={props.getEpolls}
				//editRow={editRow}
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
	const {epolls} = state

	return {
		filters: epolls.filters,
		sortBy: epolls.sortBy,
		sortDirection: epolls.sortDirection,
		epollsValid: epolls.epollsValid,
		epolls: epolls.epolls,
		epollsMap: epolls.epollsMap,
		getEpolls: epolls.getEpolls,
	}
}
export default connect(mapStateToProps)(Epolls)
