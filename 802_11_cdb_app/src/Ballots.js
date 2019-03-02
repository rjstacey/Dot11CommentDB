import React from 'react';
import {Link} from "react-router-dom";
import Modal from 'react-modal';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import {setBallotsFilter, setBallotsSort, getBallots, deleteBallots, updateBallot} from './actions/ballots';
import {getVotingPool} from './actions/voters';
import {deleteCommentsWithBallotId, importComments, uploadComments} from './actions/comments'
import {deleteResults, importResults, uploadResults} from './actions/results'
import {sortClick, allSelected, toggleVisible, SortIndicator} from './filter'
import Epolls from './Epolls'
import styles from './AppTable.css'

class UploadModal extends React.PureComponent {
	constructor(props) {
		super(props)
		this.fileInputRef = React.createRef();
	}
	submit = () => {
		this.props.dispatch(
			this.props.uploadType === 'results'?
				uploadResults(this.props.ballotId, this.fileInputRef.current.files[0]):
				uploadComments(this.props.ballotId, this.fileInputRef.current.files[0])
		);
	}
	render() {
		return (
			<Modal
				className='ModalContent'
				overlayClassName='ModalOverlay'
				isOpen={this.props.isOpen}
				appElement={this.props.appElement}
			>
				<p>Upload {this.props.uploadType} for {this.props.ballotId}</p>
				<input
					type='file'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={this.fileInputRef}
				/>
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
			{dataKey: '',             label: '',
				width: 40, flexGrow: 0, flexShrink: 0,
				headerRenderer: this.renderHeaderCheckbox,
				cellRenderer: this.renderCheckbox},
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
				width: 100, flexShrink: 0,
				cellRenderer: this.renderDate},
			{dataKey: 'End',          label: 'End',
				width: 100, flexShrink: 0,
				cellRenderer: this.renderDate},
	        {dataKey: 'VotingPoolID', label: 'Voting Pool',
	        	width: 80,
	    		cellRenderer: this.renderVotingPool},
	    	{dataKey: 'PrevBallotID', label: 'Previous Ballot In Series',
	        	width: 80,
	    		cellRenderer: this.renderPrevBallot},
			{dataKey: 'Results',      label: 'Voting Result',
				width: 150,
				cellRenderer: this.renderResultsSummary},
			{dataKey: 'Comments', label: 'Comments',
				width: 100,
				cellRenderer: this.renderCommentsSummary}
		];

		this.state = {
			showEpolls: false,
			height: 100,
			width: 100,
			ballotImport: {},
			selectedBallots: [],
			showUpload: false,
			uploadType: '',
			uploadBallotID: 0
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
		this.updateDimensions()
		window.addEventListener("resize", this.updateDimensions);

		if (!this.props.ballotsDataValid) {
			this.props.dispatch(getBallots())
		}
		if (!this.props.votingPoolDataValid) {
			this.props.dispatch(getVotingPool())
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

	showEpolls = (e) => {
		this.setState({showEpolls: true});
		e.preventDefault()
	}
	hideEpolls = () => {
		this.setState({showEpolls: false});
	}
	deleteCommentsClick = (e, rowData) => {
		console.log('ballotId=', rowData.BallotID)
		this.props.dispatch(deleteCommentsWithBallotId(rowData.BallotID));
	}
	importCommentsClick = (e, rowData) => {
		this.props.dispatch(importComments(rowData.BallotID, rowData.EpollNum));
	}
	uploadCommentsClick = (e, rowData) => {
		this.setState({
			showUpload: true,
			uploadType: 'comments',
			uploadBallotID: rowData.BallotID
		})
	}
	deleteResultsClick = (e, rowData) => {
		console.log('ballotId=', rowData.BallotID)
		this.props.dispatch(deleteResults(rowData.BallotID));
	}
	importResultsClick = (e, rowData) => {
		this.props.dispatch(importResults(rowData.BallotID, rowData.EpollNum));
	}
	uploadResultsClick = (e, rowData) => {
		this.setState({
			showUpload: true,
			uploadType: 'results',
			uploadBallotID: rowData.BallotID
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

	renderHeaderCheckbox = ({dataKey}) => {
		const {selectedBallots} = this.state;
		const {ballotsData, ballotsDataMap} = this.props;
		const checked = allSelected(selectedBallots, ballotsDataMap, ballotsData, 'BallotID');
		return (
			<input
				type="checkbox"
				checked={checked}
				onChange={e => this.setState({selectedBallots: toggleVisible(selectedBallots, ballotsDataMap, ballotsData, 'BallotID')})}
			/>
		);
	}
	renderCheckbox = ({rowIndex, rowData, dataKey, parent}) => {
		const ballotId = rowData.BallotID;
		return (
			<input
				type="checkbox"
				checked={this.state.selectedBallots.includes(ballotId)}
				onChange={e => {
					// if commentId is present in selectedComments (i > 0) then remove it; otherwise add it
					let i = this.state.selectedBallots.indexOf(ballotId);
					this.setState({
						selectedBallots: update(this.state.selectedBallots, (i > -1)? {$splice: [[i, 1]]}: {$push: [ballotId]})
					})
				}}
			/>
		);
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
	renderVotersCount = ({rowIndex, rowData, dataKey}) => {
		var count = rowData[dataKey];
		if (count > 0) {
			return (
				<div>
					<span>{count}</span>
					<button onClick={(e) => {return this.deleteVotersClick(e, rowData)}}>Delete</button>
				</div>
			)
		}
		else {
			return (
				<button onClick={(e) => {return this.importVotersClick(e, rowData)}}>Import</button>
			)
		}
	}
	
	renderVotingPool = ({rowIndex, columnIndex, rowData, dataKey}) => {
		return (
			<select
				name={dataKey}
				value={rowData[dataKey]}
				onChange={e => this.updateBallotFieldIfChanged(rowIndex, columnIndex, dataKey, e.target.value)}
			>
				<option key={0} value={null}>None</option>
				{this.props.votingPoolData.map(i => {
					return (<option key={i.VotingPoolID} value={i.VotingPoolID}>{i.Name}</option>)
				})}
			</select>
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
				{this.props.ballotsByProject[project].map(i => {
					return (i !== rowData.BallotID? <option key={i} value={i}>{i}</option>: null)
				})}
			</select>
		)
	}
	renderResultsSummary = ({rowIndex, rowData, dataKey}) => {
		var results = rowData.Results;
		let el = [];
		if (results && results.Total) {
			let p = parseFloat(100*results.Approve/(results.Approve+results.Disapprove));
			let percentStr = isNaN(p)? '': ` (${p.toFixed(1)}%)`;
			el.push(<span key={el.length}>{`${results.Approve}/${results.Disapprove}/${results.Abstain}` + percentStr}</span>)
			el.push(<br key={el.length}/>)
			if (rowData.VotingPoolID) {
				el.push(<span key={el.length}>{`Invalid Abstain: ${results.InvalidAbstain}`}</span>)
				el.push(<br key={el.length}/>)
				el.push(<span key={el.length}>{`Invalid Vote: ${results.InvalidVote}`}</span>)
				el.push(<br key={el.length}/>)
			}
			el.push(<button key={el.length} onClick={(e) => {return this.deleteResultsClick(e, rowData)}}>Delete</button>)
		}
		else {
			el.push(<button key={el.length} onClick={(e) => {return this.importResultsClick(e, rowData)}}>Import</button>)
			el.push(<button key={el.length} onClick={(e) => {return this.uploadResultsClick(e, rowData)}}>Upload</button>)
		}
		return <Link to={`/Results/${rowData.BallotID}`}>{el}</Link>
	}

	renderCommentsSummary = ({rowIndex, rowData, dataKey}) => {
		var comments = rowData.Comments;
		if (comments.Count > 0) {
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
					<button onClick={(e) => {return this.uploadCommentsClick(e, rowData)}}>Upload</button>
				</div>
			)
		}
	}


	refresh = () => {
		this.props.dispatch(getBallots())
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
				<SortIndicator sortDirection={sortDirection} />
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
		if (this.lastRenderedWidth !== this.state.width) {
			this.lastRenderedWidth = this.state.width
			this.rowHeightCache.clearAll()
		}
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
			<div id='Ballots' style={{height: '100%'}}>
			{this.state.showEpolls?
				(<Epolls close={() => this.setState({showEpolls: false})} />):
				(<div>
					<div id='top-row'>
						<button disabled={this.props.getBallots} onClick={this.refresh}>Refresh</button>
						<button>Add</button>
						<button onClick={this.handleRemoveSelected}>Remove Selected</button>
						<button onClick={this.showEpolls}>Import ePoll</button>
					</div>
					{this.renderTable()}
					<UploadModal
						ballotId={this.state.uploadBallotID}
						uploadType={this.state.uploadType}
						isOpen={this.state.showUpload}
						close={() => this.setState({showUpload: false})}
						dispatch={this.props.dispatch}
						appElement={document.querySelector('#Ballots')}
					/>
				</div>)
			}
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