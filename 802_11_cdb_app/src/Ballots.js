import PropTypes from 'prop-types';
import React from 'react';
import {Link} from "react-router-dom";
import Modal from 'react-modal';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import Draggable from 'react-draggable';
import {setBallotsFilters, setBallotsSort, getBallots, deleteBallots, updateBallot} from './actions/ballots';
import {getVotingPool} from './actions/voters';
import {deleteCommentsWithBallotId, importComments, uploadComments} from './actions/comments'
import {deleteResults, importResults, uploadResults} from './actions/results'
import {sortClick, filterValidate} from './filter'
import {IconImport, IconSort, IconDelete} from './Icons'
import styles from './AppTable.css'

class ImportModal extends React.PureComponent {

	static propTypes = {
		ballotId: PropTypes.string.isRequired,
		epollNum: PropTypes.number.isRequired,
		importType: PropTypes.oneOf(['', 'results', 'comments']),
		isOpen: PropTypes.bool.isRequired,
		close: PropTypes.func.isRequired,
		appElement: PropTypes.any
	}

	constructor(props) {
		super(props)
		this.fileInputRef = React.createRef();

		this.state = {
			fromFile: false
		}
	}

	submit = () => {
		if (this.state.fromFile) {
			this.props.dispatch(
				this.props.importType === 'results'?
					uploadResults(this.props.ballotId, this.fileInputRef.current.files[0]):
					uploadComments(this.props.ballotId, this.fileInputRef.current.files[0])
			)
		}
		else {
			this.props.dispatch(
				this.props.importType === 'results'?
					importResults(this.props.ballotId, this.props.epollNum):
					importComments(this.props.ballotId, this.props.epollNum, 1)
			)
		}
		this.props.close()
	}

	render() {
		return (
			<Modal
				className='ModalContent'
				overlayClassName='ModalOverlay'
				isOpen={this.props.isOpen}
				appElement={this.props.appElement}
			>
				<p>Import {this.props.importType} for {this.props.ballotId}. Current {this.props.importType} (if any) will be deleted.</p>
				<p>Select whether to import from the ePoll associated with the ballot or from a local .csv file.</p>
				<label>
					<input
						name='FromEpoll'
						type='radio'
						checked={!this.state.fromFile}
						onChange={e => this.setState({fromFile: !e.target.checked})}
					/>
					From ePoll
				</label>
				<br />
				<label>
					<input
						name='FromFile'
						type='radio'
						checked={this.state.fromFile}
						onChange={e => this.setState({fromFile: e.target.checked})}
					/>
					From file&nbsp;&nbsp;
					<input
						type='file'
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						ref={this.fileInputRef}
					/>
				</label>
				<br />
				<button onClick={this.submit}>OK</button>
				<button onClick={this.props.close}>Cancel</button>
			</Modal>
		)
	}
}

class ContentEditable extends React.Component {

	static propTypes = {
		deferUpdate: PropTypes.bool.isRequired,
		value: PropTypes.string.isRequired,
		onChange: PropTypes.func.isRequired
	}

	constructor(props) {
		super(props);
		this.divRef = React.createRef();
		this.lastValue = ''
	}

	render() {
		return (
			<div
				ref={this.divRef}
				onBlur={this.emitChange}
				contentEditable
				dangerouslySetInnerHTML={{__html: this.props.value}}
			/>
		)
	}

	shouldComponentUpdate(nextProps) {
		return !nextProps.deferUpdate && nextProps.value !== this.divRef.current.innerHTML;
	}

	componentDidUpdate() {
		if (this.props.value !== this.divRef.current.innerHTML) {
			this.divRef.current.innerHTML = this.props.value;
		}
	}

	emitChange = () => {
		var currentValue = this.divRef.current.innerHTML;
		if (this.props.onChange && currentValue !== this.lastValue) {
			this.props.onChange({target: {value: currentValue}});
		}
		this.lastValue = currentValue;
	}
}

class Ballots extends React.PureComponent {
	constructor(props) {

		super(props);

		this.columns = [
			/*{dataKey: '',             label: '',
				width: 40, flexGrow: 0, flexShrink: 0,
				headerRenderer: this.renderHeaderCheckbox,
				cellRenderer: this.renderCheckbox},*/
			{dataKey: 'Project',      label: 'Project',
				width: 65, flexShrink: 0, flexGrow: 0,
				cellRenderer: this.renderEditable},
			{dataKey: 'BallotID',     label: 'Ballot ID',
				width: 75, flexShrink: 0, flexGrow: 0,
				cellRenderer: this.renderEditable},
			{dataKey: 'Document',     label: 'Document',
				width: 150, flexShrink: 1, flexGrow: 1,
				cellRenderer: this.renderEditable},
			{dataKey: 'Topic',        label: 'Topic',
				width: 300, flexShrink: 1, flexGrow: 1,
				cellRenderer: this.renderEditable},
			{dataKey: 'EpollNum',     label: 'ePoll',
				width: 80, flexGrow: 0, flexShrink: 0},
			{dataKey: 'Start',        label: 'Start',
				width: 86, flexShrink: 0,
				cellRenderer: this.renderDate},
			{dataKey: 'End',          label: 'End',
				width: 86, flexShrink: 0,
				cellRenderer: this.renderDate},
	        {dataKey: ['VotingPoolID', 'PrevBallotID'], label: 'Voting Pool/Prev Ballot',
	        	width: 100, flexShrink: 1, flexGrow: 1,
	    		cellRenderer: this.renderVotingPool},
			{dataKey: 'Results',      label: 'Result',
				width: 150, flexShrink: 1, flexGrow: 1,
				cellRenderer: this.renderResultsSummary},
			{dataKey: 'Comments',	label: 'Comments',
				width: 100, flexShrink: 1, flexGrow: 1,
				cellRenderer: this.renderCommentsSummary,
				isLast: true}
		];

		this.state = {
			height: 100,
			width: 100,
			ballotImport: {},
			selectedBallots: [],
			showImport: false,
			importType: '',
			importBallot: {BallotID: '', EpollNum: 0}
		}

		// List of filterable columns
    	const filterable = ['BallotID', 'Project', 'Document', 'Topic', 'EpollNum'];
		if (Object.keys(props.filters).length === 0) {
			var filters = {};
			filterable.forEach(dataKey => {filters[dataKey] = ''});
			this.props.dispatch(setBallotsFilters(filters));
		}

		this.sortable = ['BallotID', 'Project', 'Document', 'Topic', 'EpollNum', 'Start', 'End'];

		this.rowHeightCache = new CellMeasurerCache({
			minHeight: 18,
			fixedWidth: true
		})
	}
	componentDidMount() {
		this.updateDimensions()
		window.addEventListener("resize", this.updateDimensions);

		if (!this.props.ballotsDataValid) {
			this.props.dispatch(getBallots())
		}
		if (!this.props.votingPoolDataValid) {
			this.props.dispatch(getVotingPool())
		}
		this.rowHeightCache.clearAll()
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
		this.setState({columnWidth: update(this.state.columnWidth, {$set: {[this.columns[i].dataKey]: this.columns[i].width}})})
	}

	showEpolls = (e) => {
		this.props.history.push('/Epolls/');
	}
	deleteCommentsClick = (e, rowData) => {
		console.log('ballotId=', rowData.BallotID)
		this.props.dispatch(deleteCommentsWithBallotId(rowData.BallotID));
	}
	importCommentsClick = (e, rowData) => {
		this.setState({
			showImport: true,
			importType: 'comments',
			importBallot: rowData
		})
	}
	deleteResultsClick = (e, rowData) => {
		console.log('ballotId=', rowData.BallotID)
		this.props.dispatch(deleteResults(rowData.BallotID));
	}
	importResultsClick = (e, rowData) => {
		this.setState({
			showImport: true,
			importType: 'results',
			importBallot: rowData
		})
	}
	handleRemoveSelected = () => {
		const {ballotsData, ballotsDataMap} = this.props;
		var delBallotIds = [];
		for (var i = 0; i < ballotsDataMap.length; i++) { // only select checked items that are visible
			let ballotId = ballotsData[ballotsDataMap[i]].BallotID
			if (this.state.selectedBallots.includes(ballotId)) {
				delBallotIds.push(ballotId)
			}
		}
		if (delBallotIds.length) {
			this.props.dispatch(deleteBallots(delBallotIds))
			this.rowHeightCache.clearAll()
		}
	}
	sortChange = (event, dataKey) => {
		const {sortBy, sortDirection} = sortClick(event, dataKey, this.props.sortBy, this.props.sortDirection);
		this.props.dispatch(setBallotsSort(sortBy, sortDirection));
		this.rowHeightCache.clearAll()
		event.preventDefault()
	}
	filterChange = (event, dataKey) => {
		var filter = filterValidate(dataKey, event.target.value)
		this.props.dispatch(setBallotsFilters({[dataKey]: filter}));
		this.rowHeightCache.clearAll()
	}
	updateBallotField = (rowIndex, dataKey, fieldData) => {
		const b = this.props.ballotsData[this.props.ballotsDataMap[rowIndex]];
		this.props.dispatch(updateBallot(b.BallotID, {[dataKey]: fieldData}))
	}
	updateBallotFieldIfChanged = (rowIndex, columnIndex, dataKey, fieldData) => {
		const b = this.props.ballotsData[this.props.ballotsDataMap[rowIndex]];
		if (b[dataKey] !== fieldData) {
			this.props.dispatch(updateBallot(b.BallotID, {[dataKey]: fieldData}))
				//.then(() => {console.log('updated'); this.tableRef.forceUpdate()})
			this.rowHeightCache.clear(rowIndex, columnIndex)
		}
	}

	renderDate = ({rowData, dataKey}) => {
		// rowData[dataKey] is a UTC time string. We convert this to US eastern time
		// and display only the date in format "yyyy-mm-dd" (ISO format).
		var d = new Date(rowData[dataKey])
		d = new Date(d.toLocaleString('en-US', {timeZone: 'America/New_York'}))
		return d.toISOString().substring(0,10)
	}

	renderEditable = ({rowIndex, rowData, dataKey, columnIndex}) => {
		return (
			<ContentEditable
				value={rowData[dataKey]}
				deferUpdate={this.props.updateBallot}
				onChange={e => this.updateBallotFieldIfChanged(rowIndex, columnIndex, dataKey, e.target.value)}
			/>
		)
	}
	
	renderVotingPool = ({rowIndex, columnIndex, rowData, dataKey}) => {
		var project = rowData.Project;
		const showSelectVotingPool = !rowData[dataKey[1]]
		const showSelectBallot = !rowData[dataKey[0]]
		return (
			<div>
				{showSelectVotingPool &&
					<select
						name={dataKey}
						value={rowData[dataKey[0]]}
						onChange={e => this.updateBallotFieldIfChanged(rowIndex, columnIndex, dataKey[0], e.target.value)}
					>
						<option key={0} value={''}>Select Pool</option>
						{this.props.votingPoolData.map(i => {
							return (<option key={i.VotingPoolID} value={i.VotingPoolID}>{i.Name}</option>)
						})}
					</select>}
				{showSelectBallot &&
					<select
						name={dataKey}
						value={rowData[dataKey[1]]}
						onChange={e => this.updateBallotFieldIfChanged(rowIndex, columnIndex, dataKey[1], e.target.value)}
					>
						<option key={0} value={''}>Select Ballot</option>
						{project && this.props.ballotsByProject[project].map(i => {
							return (i !== rowData.BallotID? <option key={i} value={i}>{i}</option>: null)
						})}
					</select>}
			</div>
		)
	}
	renderPrevBallot = ({rowIndex, columnIndex, rowData, dataKey}) => {
		var project = rowData.Project;
		return (
			<select
				name={dataKey}
				value={rowData[dataKey]}
				onChange={e => this.updateBallotFieldIfChanged(rowIndex, columnIndex, dataKey, e.target.value)}
			>
				<option key={0} value={''}>None</option>
				{project && this.props.ballotsByProject[project].map(i => {
					return (i !== rowData.BallotID? <option key={i} value={i}>{i}</option>: null)
				})}
			</select>
		)
	}
	renderResultsSummary = ({rowIndex, rowData, dataKey}) => {
		var results = rowData[dataKey];
		var resultsStr = '';
		if (results && results.TotalReturns) {
			let p = parseFloat(100*results.Approve/(results.Approve+results.Disapprove));
			resultsStr = `${results.Approve}/${results.Disapprove}/${results.Abstain}`
			if (!isNaN(p)) {
				resultsStr += ` (${p.toFixed(1)}%)`
			}
		}
		return resultsStr
			? <React.Fragment>
				<Link to={`/Results/${rowData.BallotID}`}>{resultsStr}</Link>&nbsp;
				<IconDelete title="Delete Results" className={styles.actionCell} onClick={e => this.deleteResultsClick(e, rowData)} />&nbsp;
				<IconImport title="Import Results" className={styles.actionCell} onClick={e => this.importResultsClick(e, rowData)} />
			  </React.Fragment>
			: <React.Fragment>
				None&nbsp;
				<IconImport title="Import Results" className={styles.actionCell} onClick={e => this.importResultsClick(e, rowData)} />
			  </React.Fragment>
	}

	renderCommentsSummary = ({rowIndex, rowData, dataKey}) => {
		var comments = rowData.Comments;
		return (comments && comments.Count > 0)
			? <React.Fragment>
				<Link to={`/Comments/${rowData.BallotID}`}>{comments.CommentIDMin}-{comments.CommentIDMax} ({comments.Count})</Link>&nbsp;
				<IconDelete title="Delete Comments" className={styles.actionCell} onClick={e => this.deleteCommentsClick(e, rowData)} />&nbsp;
				<IconImport title="Import Comments" className={styles.actionCell} onClick={e => this.importCommentsClick(e, rowData)} />
			  </React.Fragment>
			: <React.Fragment>
				None&nbsp;
				<IconImport title="Import Comments" className={styles.actionCell} onClick={e => this.importCommentsClick(e, rowData)} />
			  </React.Fragment>
	}

	refresh = () => {
		this.props.dispatch(getBallots())
		this.rowHeightCache.clearAll()
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
					<div className={styles.headerLabelItem} style={{width: sortDirection === 'NONE'? '100%': 'calc(100% - 13px)'}}>{label}</div>
					{sortDirection !== 'NONE' && <IconSort direction={sortDirection} />}
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
		return <div className={styles.noRows}>{this.props.getBallots? 'Loading...': 'No rows'}</div>
	}

	rowClassName = ({index}) => {
		if (index < 0) {
			return styles.headerRow;
		} else {
			return index % 2 === 0 ? styles.evenRow : styles.oddRow;
		}
	}

	renderMeasuredCell = (props) => {
		const {rowIndex, dataKey, columnIndex, columnData, parent} = props;
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

	setTableRef = (ref) => {
		this.tableRef = ref;
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
				rowCount={this.props.ballotsDataMap.length}
				rowGetter={({index}) => {return this.props.ballotsData[this.props.ballotsDataMap[index]]}}
				ref={this.setTableRef}
			>
				{this.columns.map((col, index) => {
					const {cellRenderer, headerRenderer, ...otherProps} = col;
					return (
						<Column 
							key={index}
							className={styles.rowColumn}
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
			<div id='Ballots'>
				<div id='top-row'>
					<button disabled={this.props.getBallots} onClick={this.refresh}>Refresh</button>
					<button>Add</button>
					<button onClick={this.handleRemoveSelected}>Remove Selected</button>
					<button onClick={this.showEpolls}>Import ePoll</button>
				</div>
				{this.renderTable()}
				<ImportModal
					ballotId={this.state.importBallot.BallotID}
					epollNum={this.state.importBallot.EpollNum}
					importType={this.state.importType}
					isOpen={this.state.showImport}
					close={() => this.setState({showImport: false})}
					dispatch={this.props.dispatch}
					appElement={document.querySelector('#Ballots')}
				/>
			</div>
		)
	}
}

function mapStateToProps(state) {
	const {ballots, voters} = state
	return {
		filters: ballots.filters,
		sortBy: ballots.sortBy,
		sortDirection: ballots.sortDirection,
		ballotsDataValid: ballots.ballotsDataValid,
		ballotsData: ballots.ballotsData,
		ballotsDataMap: ballots.ballotsDataMap,
		ballotsByProject: ballots.ballotsByProject,
		getBallots: ballots.getBallots,
		updateBallot: ballots.updateBallot,
		votingPoolDataValid: voters.votingPoolDataValid,
		votingPoolData: voters.votingPoolData,
	}
}
export default connect(mapStateToProps)(Ballots);