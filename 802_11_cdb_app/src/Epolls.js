import React from 'react';
import Modal from 'react-modal';
import {connect} from 'react-redux';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import {sortClick} from './filter'
import {setEpollsSort, setEpollsFilter, getEpolls} from './actions/epolls';
import {addBallot} from './actions/ballots';
import './Epolls.css'
import styles from './AppTable.css'

class Epolls extends React.Component {
	constructor(props) {
		super(props)

		this.columns = [
			{dataKey: 'Import',    width: 100, label: '',
				sortable: false,
				cellRenderer: this.renderImport},
			{dataKey: 'EpollNum',  width: 100, label: 'ePoll',
				cellRenderer: this.renderText},
			{dataKey: 'BallotID',  width: 200, label: 'ePoll Name',
				cellRenderer: this.renderText},
			{dataKey: 'Document',  width: 200, label: 'Document',
				cellRenderer: this.renderText},
			{dataKey: 'Topic',     width: 500, label: 'Topic',
				cellRenderer: this.renderText},
			{dataKey: 'Start',     width: 100, label: 'Start',
				cellRenderer: this.renderDate},
			{dataKey: 'End',       width: 100, label: 'End',
				cellRenderer: this.renderDate},
			{dataKey: 'Votes',     width: 100, label: 'Result'},
		];

		this.state = {
			showImportModal: false,
			ballotImportWait: false,
			ballotImport: {},
			height: 100,
			width: 100
		}

		// List of filterable columns
		const filterable = ['EpollNum', 'BallotID', 'Document', 'Topic'];
		if (Object.keys(props.filters).length === 0) {
			filterable.forEach(dataKey => {
				this.props.dispatch(setEpollsFilter(dataKey, ''));
			});
		}
		this.sortable = ['EpollNum', 'BallotID', 'Document', 'Topic', 'Start', 'End'];

		this.rowHeightCache = new CellMeasurerCache({
			minHeight: 18,
			fixedWidth: true
		});

		this.numberEpolls = 20;
	}
  
	static getDerivedStateFromProps(props, state) {
		var newState = {}
		if (state.ballotImportWait && !props.addBallot) {
			Object.assign(newState, {ballotImportWait: false})
			if (!props.addBallotError) {
				Object.assign(newState, {showImportModal: false})
			}
		}
		return newState
	}

	componentDidMount() {
		this.updateDimensions()
		window.addEventListener("resize", this.updateDimensions);

		if (!this.props.epollsDataValid) {
			this.props.dispatch(getEpolls(this.numberEpolls))
		}
	}
	componentWillUnmount() {
		window.removeEventListener("resize", this.updateDimensions);
	}
	updateDimensions = () => {
		var header = document.getElementsByTagName('header')[0]
		var top = document.getElementById('top-row')
		var height = window.innerHeight - header.offsetHeight - top.offsetHeight - 5
		var width = window.innerWidth - 1; //parent.offsetWidth
		//console.log('update ', width, height)
		this.setState({height, width})
	}

	importClick = (rowData) => {
		console.log(rowData)
		this.setState({
			showImportModal: true,
			ballotImport: Object.assign({}, rowData)
		})
	}
	hideImportModal = () => {
		this.setState({showImportModal: false});
	}
	handleImportChange = (e) => {
		this.setState({ballotImport: Object.assign({}, this.state.ballotImport, {[e.target.name]: e.target.value})})
	}
	importEpolls = (e) => {
		this.props.dispatch(addBallot(this.state.ballotImport))
		this.setState({ballotImportWait: true})
	}
	refresh = () => {
		this.props.dispatch(getEpolls(this.numberEpolls))
	}
	getMore = () => {
		this.numberEpolls += 10;
		this.props.dispatch(getEpolls(this.numberEpolls))
	}
	sortChange = (event, dataKey) => {
		const {sortBy, sortDirection} = sortClick(event, dataKey, this.props.sortBy, this.props.sortDirection);
		this.props.dispatch(setEpollsSort(sortBy, sortDirection));
		this.rowHeightCache.clearAll()
	}
	filterChange = (event, dataKey) => {
		this.props.dispatch(setEpollsFilter(dataKey, event.target.value));
		this.rowHeightCache.clearAll()
	}

	renderImport = ({rowData}) => {
		if (rowData.InDatabase) {
			return (
				<span>Already Present</span>
			)
		} else {
			return (
				<button onClick={e => {this.importClick(rowData)}}>Import</button>
			)
		}
	}

	renderText = ({rowIndex, rowData, dataKey, columnIndex}) => {
		return (
			<div
				dangerouslySetInnerHTML={{__html: rowData[dataKey]}}
			/>
		)
	}

	renderDate = ({rowData, dataKey}) => {
		// rowData[dataKey] is a UTC time string. We convert this to easter time
		// and display only the date (not time).
		var d = new Date(rowData[dataKey])
		var str = d.toLocaleString('en-US', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York'})
		return (
			<div
				dangerouslySetInnerHTML={{__html: str}}
			/>
		)
	}

	renderMeasuredCell = ({rowIndex, rowData, dataKey, columnIndex, columnData, parent}) => {
		return (
			<CellMeasurer
				cache={this.rowHeightCache}
				rowIndex={rowIndex}
				columnIndex={columnIndex}
				parent={parent}
				key={dataKey}
			>
				{columnData.cellRenderer({rowIndex, rowData, dataKey, columnIndex, parent})}
			</CellMeasurer>
		)
	}

	renderSortLabel = (props) => {
		const {dataKey, label, style} = props;
		const sortDirection = this.props.sortBy.includes(dataKey)? this.props.sortDirection[dataKey]: 'NONE'
		return (
			<span
				key={'label-' + dataKey}
				title={label}
				onClick={e => this.sortChange(e, dataKey)}
				style={{cursor: 'pointer', userSelect: 'none', ...style}}
			>
				{label}
				{sortDirection === 'NONE' || <i className={sortDirection === 'ASC'? "fa fa-sort-alpha-down": "fa fa-sort-alpha-up"} />}
			</span>
		);
	}
	renderLabel = (props) => {
		const {label, style} = props;
		return (
			<span
				key={'label-' + label}
				title={label}
				style={style}
			>
				{label}
			</span>
		);
	}
	renderFilter = (dataKey) => {
		return (
			<input
				key={'filt-' + dataKey}
				type='text'
				className={styles.headerFilt}
				placeholder='Filter'
				onChange={e => this.filterChange(e, dataKey)}
				value={this.props.filters[dataKey]}
				style={{width: '100%'}}
			/>
		);
	}
	renderHeaderCell = ({columnData, dataKey, label}) => {
		const labelElement = this.sortable.includes(dataKey)? this.renderSortLabel({dataKey, label}): this.renderLabel({label});
		const showFilter = this.props.filters.hasOwnProperty(dataKey)
		return (
			<div>
				{labelElement}
				{showFilter && this.renderFilter(dataKey)}
			</div>
		);
	}

	noRowsRenderer = () => {
		return <div className={styles.noRows}>{this.props.getEpolls? 'Loading...': 'No rows'}</div>
	}

	rowClassName = ({index}) => {
		if (index < 0) {
			return styles.headerRow;
		} else {
			return index % 2 === 0 ? styles.evenRow : styles.oddRow;
		}
	}

	renderTable = () => {
		return (
			<Table
				className={styles.Table}
				height={this.state.height}
				width={this.state.width}
				rowHeight={this.rowHeightCache.rowHeight}
				deferredMeasurementCache={this.rowHeightCache}
				headerHeight={60}
				noRowsRenderer={this.noRowsRenderer}
				headerClassName={styles.headerColumn}
				rowClassName={this.rowClassName}
				rowCount={this.props.epollsDataMap.length}
				rowGetter={({index}) => this.props.epollsData[this.props.epollsDataMap[index]]}
			>
				{this.columns.map((col, index) => {
					const {cellRenderer, headerRenderer, ...otherProps} = col;
					return (
						<Column 
							key={index}
							columnData={col}
							headerRenderer={headerRenderer? headerRenderer: this.renderHeaderCell}
							cellRenderer={cellRenderer? this.renderMeasuredCell: undefined}
							{...otherProps}
						/>
				)})}
			</Table>
		)
	}

	render() {

		return (
			<div id='Epolls' style={{height: '100%'}}>
				<div id='top-row'>
					<button onClick={this.props.close}>Back</button>
					<button onClick={this.refresh}>Refresh</button>
					<button onClick={this.getMore}>Get More</button>
				</div>

				{this.renderTable()}

				<Modal 
					className='ImportModalContent'
					overlayClassName='ImportModalOverlay'
					isOpen={this.state.showImportModal}
					appElement={document.querySelector('#Epolls')}
				>
					<label>ePoll:<input type='text' name='EpollNum' value={this.state.ballotImport.EpollNum} readOnly /></label><br />
					<label>Ballot ID:<input type='text' name='BallotID' value={this.state.ballotImport.BallotID} onChange={this.handleImportChange}/></label><br />
					<label>Project:<input type='text' name='Project' value={this.state.ballotImport.Project} onChange={this.handleImportChange}/></label><br />
					<label>Document:<input type='text' name='Document' value={this.state.ballotImport.Document} onChange={this.handleImportChange}/></label><br />
					<label>Topic:<input type='text' name='Topic' value={this.state.ballotImport.Topic} onChange={this.handleImportChange}/></label><br />
					<label>Start:<input type='text' name='Start' value={this.state.ballotImport.Start} onChange={this.handleImportChange}/></label><br />
					<label>End:<input type='text' name='End' value={this.state.ballotImport.End} onChange={this.handleImportChange}/></label><br />
					<label>Result:<input type='text' name='Votes' value={this.state.ballotImport.Votes} onChange={this.handleImportChange}/></label><br />
					<button type='submit' onClick={this.importEpolls}>Import</button>
					<button onClick={this.hideImportModal}>Cancel</button>
				</Modal>
			</div>
		)
	}
}

function mapStateToProps(state) {
	const {epolls, ballots} = state;

	return {
		filters: epolls.filters,
		sortBy: epolls.sortBy,
		sortDirection: epolls.sortDirection,
		epollsDataValid: epolls.epollsDataValid,
		epollsData: epolls.epollsData,
		epollsDataMap: epolls.epollsDataMap,
		getEpolls: epolls.getEpolls,
		addBallot: ballots.addBallot,
		ballotsErrorMsg: ballots.errorMsgs.length? ballots.errorMsgs[0]: null,
		epollsErrorMsg: epolls.errorMsgs.length? epolls.errorMsgs[0]: null
	}
}
export default connect(mapStateToProps)(Epolls);
