import PropTypes from 'prop-types';
import React, {useState} from 'react';
import AppModal from './AppModal';
import {connect} from 'react-redux';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import Draggable from 'react-draggable';
import {sortClick, filterValidate} from './filter'
import {IconRefresh, IconImport, IconClose, IconMore} from './Icons'
import {setEpollsSort, setEpollsFilters, getEpolls} from './actions/epolls';
import {addBallot} from './actions/ballots';
import styles from './AppTable.css'

function EpollImportModal(props) {
	const [ballotImport, setBallotImport] = useState(props.ballotImport);

	function onOpen() {
		console.log('open ', props.ballotImport)
		setBallotImport(props.ballotImport)
	}

	function change(e) {
		setBallotImport({...ballotImport, [e.target.name]: e.target.value})
	}

	function submit() {
		props.dispatch(addBallot(ballotImport)).then(props.close)
	}

	return (
		<AppModal
			isOpen={props.isOpen}
			onAfterOpen={onOpen}
			onRequestClose={props.close}
		>
			<label>ePoll:<input type='text' name='EpollNum' value={ballotImport.EpollNum} readOnly /></label><br />
			<label>Ballot ID:<input type='text' name='BallotID' value={ballotImport.BallotID} onChange={change}/></label><br />
			<label>Project:<input type='text' name='Project' value={ballotImport.Project} onChange={change}/></label><br />
			<label>Document:<input type='text' name='Document' value={ballotImport.Document} onChange={change}/></label><br />
			<label>Topic:<input type='text' name='Topic' value={ballotImport.Topic} onChange={change}/></label><br />
			<label>Start:<input type='text' name='Start' value={ballotImport.Start} onChange={change}/></label><br />
			<label>End:<input type='text' name='End' value={ballotImport.End} onChange={change}/></label><br />
			<label>Result:<input type='text' name='Votes' value={ballotImport.Votes} onChange={change}/></label><br />
			<button type='submit' onClick={submit}>Import</button>
			<button onClick={props.close}>Cancel</button>
		</AppModal>
	)
}
EpollImportModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	dispatch: PropTypes.func.isRequired,
	ballotImport: PropTypes.object.isRequired
}

class Epolls extends React.Component {
	constructor(props) {
		super(props)

		this.columns = [
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
			{dataKey: 'Votes',     width: 100, label: 'Result',
				cellRenderer: this.renderText},
			{dataKey: '', label: '',
				width: 200,
				headerRenderer: this.renderHeaderActions,
				cellRenderer: this.renderActions,
				isLast: true}
		];

		this.state = {
			showImportModal: false,
			ballotImport: {},
			height: 100,
			width: 100
		}

		// List of filterable columns
		const filterable = ['EpollNum', 'BallotID', 'Document', 'Topic'];
		if (Object.keys(props.filters).length === 0) {
			var filters = {};
			filterable.forEach(dataKey => {filters[dataKey] = ''});
			this.props.dispatch(setEpollsFilters(filters));
		}
		this.sortable = ['EpollNum', 'BallotID', 'Document', 'Topic', 'Start', 'End'];

		this.rowHeightCache = new CellMeasurerCache({
			minHeight: 18,
			fixedWidth: true
		});

		this.numberEpolls = 20;
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

	resizeColumn = ({dataKey, deltaX}) => {
		var i = this.columns.findIndex(c => c.dataKey === dataKey)
		this.columns[i].width += deltaX;
		//this.setState({columnWidth: update(this.state.columnWidth, {$set: {[this.columns[i].dataKey]: this.columns[i].width}})})
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
		var filter = filterValidate(dataKey, event.target.value)
		this.props.dispatch(setEpollsFilters({[dataKey]: filter}));
		this.rowHeightCache.clearAll()
	}

	renderHeaderActions = ({rowIndex}) => {
		return (
			<React.Fragment>
				<IconRefresh title='Refresh' onClick={this.refresh} />&nbsp;
				<IconClose title='Close' onClick={this.props.close} />&nbsp;
				<IconMore title='Load More' onClick={this.getMore} />
			</React.Fragment>
		)
	}

	renderActions = ({rowData}) => {
		if (rowData.InDatabase) {
			return (
				<span>Already Present</span>
			)
		} else {
			return (
				<IconImport title='Import' onClick={() => this.importClick(rowData)} />
			)
		}
	}

	renderText = ({rowIndex, rowData, dataKey, columnIndex}) => {
		return <span>{rowData[dataKey]}</span>
	}

	renderDate = ({rowData, dataKey}) => {
		// rowData[dataKey] is a UTC time string. We convert this to eastern time
		// and display only the date (not time).
		var d = new Date(rowData[dataKey])
		var str = d.toLocaleString('en-US', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/New_York'})
		return <span>{str}</span>
	}

	renderMeasuredCell = (props) => {
		var {rowIndex, dataKey, columnIndex, columnData, parent} = props;
		return (
			<CellMeasurer
				cache={this.rowHeightCache}
				rowIndex={rowIndex}
				columnIndex={columnIndex}
				parent={parent}
				key={dataKey}
			>
				{columnData.cellRenderer(props)}
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

	renderLabel = ({dataKey, label}) => {
		if (this.sortable.includes(dataKey)) {
			const sortDirection = this.props.sortBy.includes(dataKey)? this.props.sortDirection[dataKey]: 'NONE';
			return (
				<div
					className={styles.headerLabel}
					title={label}
					style={{cursor: 'pointer'}}
					onClick={e => this.sortChange(e, dataKey)}
				>
					<div className={styles.headerLabelItem} style={{width: sortDirection === 'NONE'? '100%': 'calc(100% - 12px)'}}>{label}</div>
					<div className={styles.headerLabelItem} style={{width: sortDirection === 'ASC'? '12px': '0'}}><i className="fa fa-sort-alpha-down" /></div>
					<div className={styles.headerLabelItem} style={{width: sortDirection === 'DESC'? '12px': '0'}}><i className="fa fa-sort-alpha-up" /></div>
				</div>
			)
		}
		else {
			return (
				<div
					className={styles.headerLabel}
					title={label}
				>
					{label}
				</div>
			)
		}
	}

	renderFilter = ({dataKey}) => {
		var filter = this.props.filters[dataKey]
		var classNames = styles.headerFilt
		if (filter && !filter.valid) {
			classNames += ' ' + styles.headerFiltInvalid
		}
		return (
			<input
				type='text'
				className={classNames}
				placeholder='Filter'
				onChange={e => {this.filterChange(e, dataKey)}}
				value={filter.filtStr}
			/>
		)
	}

	renderHeaderCell = ({columnData, dataKey, label}) => {
		const col = columnData;
		const showFilter = this.props.filters.hasOwnProperty(dataKey);

		if (col.isLast) {
			return (
				<div className={styles.headerLabelBox} style={{flex: '0 0 100%'}}>
					{this.renderLabel({dataKey, label})}
					{showFilter && this.renderFilter({dataKey})}
				</div>
			)
		}
		return (
			<React.Fragment>
				<div className={styles.headerLabelBox} style={{flex: '0 0 calc(100% - 12px)'}}>
					{this.renderLabel({dataKey, label})}
					{showFilter && this.renderFilter({dataKey})}
				</div>
				<Draggable
					axis="x"
					defaultClassName={styles.headerDrag}
					defaultClassNameDragging={styles.dragHandleActive}
					onDrag={(event, {deltaX}) => this.resizeColumn({dataKey, deltaX})}
					position={{x: 0}}
					zIndex={999}
				>
					<span className={styles.dragHandleIcon}>⋮</span>
				</Draggable>
			</React.Fragment>
		)
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
				headerHeight={40}
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
				</div>

				{this.renderTable()}

				<EpollImportModal
					isOpen={this.state.showImportModal}
					close={this.hideImportModal}
					ballotImport={this.state.ballotImport}
					setBallotImport={this.setBallotImport}
					dispatch={this.props.dispatch}
				/>
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
	}
}
export default connect(mapStateToProps)(Epolls);
