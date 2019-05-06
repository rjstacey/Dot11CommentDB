import React from 'react';
import {Link} from "react-router-dom";
import Modal from 'react-modal';
import {connect} from 'react-redux';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import {setBallotsFilter, setBallotsSort, getBallots, deleteBallots, updateBallot} from './actions/ballots';
import {getVotingPool} from './actions/voters';
import {deleteCommentsWithBallotId, importComments, uploadComments} from './actions/comments'
import {deleteResults, importResults, uploadResults} from './actions/results'
import {sortClick} from './filter'
import styles from './AppTable.css'

class ImportModal extends React.PureComponent {
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

class Ballots extends React.Component {
	constructor(props) {

		super(props);

		this.columns = [
			/*{dataKey: '',             label: '',
				width: 40, flexGrow: 0, flexShrink: 0,
				headerRenderer: this.renderHeaderCheckbox,
				cellRenderer: this.renderCheckbox},*/
			{dataKey: 'Project',      label: 'Project',
				width: 65, flexShrink: 0,
				cellRenderer: this.renderEditable},
			{dataKey: 'BallotID',     label: 'Ballot ID',
				width: 75, flexShrink: 0,
				cellRenderer: this.renderEditable},
			{dataKey: 'Document',     label: 'Document',
				width: 150, flexGrow: 1,
				cellRenderer: this.renderEditable},
			{dataKey: 'Topic',        label: 'Topic',
				width: 300, flexGrow: 1,
				cellRenderer: this.renderEditable},
			{dataKey: 'EpollNum',     label: 'ePoll',
				width: 80, flexGrow: 0, flexShrink: 0},
			{dataKey: 'Start',        label: 'Start',
				width: 84, flexShrink: 0,
				cellRenderer: this.renderDate},
			{dataKey: 'End',          label: 'End',
				width: 84, flexShrink: 0,
				cellRenderer: this.renderDate},
	        {dataKey: ['VotingPoolID', 'PrevBallotID'], label: 'Voting Pool/\nPrev Ballot',
	        	width: 100,
	    		cellRenderer: this.renderVotingPool},
			{dataKey: 'Results',      label: 'Result',
				width: 150,
				cellRenderer: this.renderResultsSummary},
			{dataKey: 'Comments',	label: 'Comments',
				width: 100,
				cellRenderer: this.renderCommentsSummary}
		];

		this.state = {
			height: 100,
			width: 100,
			ballotImport: {},
			selectedBallots: [],
			showImport: false,
			importType: '',
			importBallot: {}
		}

		// List of filterable columns
    	const filterable = ['BallotID', 'Project', 'Document', 'Topic', 'EpollNum'];
		if (Object.keys(props.filters).length === 0) {
			filterable.forEach(dataKey => {
				this.props.dispatch(setBallotsFilter(dataKey, ''));
			});
		}

		this.sortable = ['BallotID', 'Project', 'Document', 'Topic', 'EpollNum', 'Start', 'End'];

		this.rowHeightCache = new CellMeasurerCache({
			minHeight: 18,
			fixedWidth: true
		})
	}
	componentDidMount() {
		console.log('did mount')
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
		this.props.dispatch(setBallotsFilter(dataKey, event.target.value));
		this.rowHeightCache.clearAll()
	}
	updateBallotField = (rowIndex, dataKey, fieldData) => {
		const b = this.props.ballotsData[this.props.ballotsDataMap[rowIndex]];
		this.props.dispatch(updateBallot({
			BallotID: b.BallotID,
			[dataKey]: fieldData
		}));
	}
	updateBallotFieldIfChanged = (rowIndex, columnIndex, dataKey, fieldData) => {
		const b = this.props.ballotsData[this.props.ballotsDataMap[rowIndex]];
		if (b[dataKey] !== fieldData) {
			this.props.dispatch(updateBallot({
				BallotID: b.BallotID,
				[dataKey]: fieldData
			}))
			this.rowHeightCache.clear(rowIndex, columnIndex)
		}
	}

	renderDate = ({rowData, dataKey}) => {
		// rowData[dataKey] is a UTC time string. We convert this to US eastern time
		// and display only the date in format "yyyy-mm-dd" (ISO format).
		var d = new Date(rowData[dataKey])
		d = new Date(d.toLocaleString('en-US', {timeZone: 'America/New_York'}))
		var str = d.toISOString().substring(0,10)
		return (
			<div
				dangerouslySetInnerHTML={{__html: str}}
			/>
		)
	}
	renderEditable = ({rowIndex, rowData, dataKey, columnIndex}) => {
		return (
			<div
				contentEditable
				onBlur={e => {
					this.updateBallotFieldIfChanged(rowIndex, columnIndex, dataKey, e.target.innerHTML)
				}}
				dangerouslySetInnerHTML={{__html: rowData[dataKey]}}
			/>
		);
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
		if (results && results.Total) {
			let p = parseFloat(100*results.Approve/(results.Approve+results.Disapprove));
			resultsStr = `${results.Approve}/${results.Disapprove}/${results.Abstain}`
			if (!isNaN(p)) {
				resultsStr += ` (${p.toFixed(1)}%)`
			}
		}
		return (
			<div>
				<Link to={`/Results/${rowData.BallotID}`}>
					<span>{resultsStr}</span>
				</Link>
				<button onClick={e => this.deleteResultsClick(e, rowData)}>Delete</button>
				<button onClick={e => this.importResultsClick(e, rowData)}>Import</button>
			</div>
		)
	}

	renderCommentsSummary = ({rowIndex, rowData, dataKey}) => {
		var comments = rowData.Comments;
		if (comments && comments.Count > 0) {
			return (
				<div>
					<Link to={`/Comments/${rowData.BallotID}`}>{comments.CommentIDMin}-{comments.CommentIDMax} ({comments.Count})</Link><br />
					<button onClick={(e) => {return this.deleteCommentsClick(e, rowData)}}>Delete</button>
				</div>
			)
		}
		else {
			return (
				<div>
					<button onClick={(e) => {return this.importCommentsClick(e, rowData)}}>Import</button>
				</div>
			)
		}
	}

	refresh = () => {
		this.props.dispatch(getBallots())
		this.rowHeightCache.clearAll()
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
	const {ballots, voters, comments, results} = state
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
		deleteBallots: ballots.deleteBallots,
		votingPoolDataValid: voters.votingPoolDataValid,
		votingPoolData: voters.votingPoolData,
		importComments: comments.importComments,
		importCommentsCount: comments.importCommentsCount,
		deleteResults: results.deleteResults,
		importResults: results.importResults,
	}
}
export default connect(mapStateToProps)(Ballots);