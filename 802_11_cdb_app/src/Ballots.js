import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import {getBallots, clearGetBallotsError, 
  deleteBallots, clearDeleteBallotsError, 
  updateBallot, clearUpdateBallotError} from './actions/ballots';
import {deleteCommentsWithBallotId, clearDeleteCommentsWithBallotIdError,
  importComments, clearImportCommentsError} from './actions/comments'
import {deleteResults, clearDeleteResultsError,
  importResults, clearImportResultsError} from './actions/results'
import {deleteVoters, clearDeleteVotersError, uploadVoters, clearUploadVotersError} from './actions/voters'
import {filterData, sortData, sortClick, allSelected, toggleVisible, SortIndicator} from './filter'
import Epolls from './Epolls'
import styles from './AppTable.css'


class Ballots extends React.Component {
	constructor(props) {

		super(props);

		this.columns = [
			{dataKey: '',             width: 40,  label: '',
				sortable: false,
				headerRenderer: this.renderHeaderCheckbox,
				cellRenderer: this.renderCheckbox},
			{dataKey: 'BallotID',     width: 80,  label: 'Ballot ID',
				cellRenderer: this.renderEditable},
	        {dataKey: 'BallotSeries',	width: 80, label: 'Ballot Series'},
			{dataKey: 'Project',      width: 80,  label: 'Project',
				cellRenderer: this.renderEditable},
			{dataKey: 'Document',     width: 150, label: 'Document',
				flexGrow: 1,
				cellRenderer: this.renderEditable},
			{dataKey: 'Topic',        width: 300, label: 'Topic',
				flexGrow: 1,
				cellRenderer: this.renderEditable},
			{dataKey: 'EpollNum',     width: 80,  label: 'ePoll'},
				{dataKey: 'Start',        width: 100, label: 'Start'},
			{dataKey: 'End',          width: 100, label: 'End'},
			{dataKey: 'VoterCount',	width: 100, label: 'Voters',
				cellRenderer: this.renderVotersCount},
			{dataKey: 'Results',      width: 100, label: 'Voting Result',
				cellRenderer: this.renderResult},
			{dataKey: 'CommentCount', width: 100, label: 'Comments',
				cellRenderer: this.renderCommentCount}
		];

		// Object of dataKeys for filters
		// If dataKey is present, filter box will appear in header cell 
		const filters = {
			BallotID: '',
			Project: '',
			Document: '',
			Topic: '',
			EpollNum: ''
		}

		this.state = {
			showEpolls: false,
			height: 100,
			width: 100,
			ballotDataMap: [],
			ballotImport: {},
			selectedBallots: [],
			sortBy: [],
			sortDirection: [],
			filters,
			votersBallotID: 0,
			showVotersImport: false
		}

		this.votersFileInputRef = React.createRef();

		this.lastRenderedWidth = this.state.width;
		this.rowHeightCache = new CellMeasurerCache({
			minHeight: 18,
			fixedWidth: true
		})
	}

	static getDerivedStateFromProps(props, state) {
		if (props.ballotData.length !== state.ballotDataMap.length) {
			// rebuild selectedBallots since entries may have been removed
			let selectedBallots = []
			props.ballotData.forEach(b => {
				if (state.selectedBallots.includes(b.BallotID)) {
					selectedBallots.push(b.BallotID)
				}
			})
			const newState = {
				ballotDataMap: sortData(filterData(props.ballotData, state.filters), props.ballotData, state.sortBy, state.sortDirection),
				selectedBallots
			}
			return newState;
		}
		return null;
	}

	showEpolls = (e) => {
		this.setState({showEpolls: true});
		e.preventDefault()
	}
	hideEpolls = () => {
		this.setState({showEpolls: false});
	}
	handleImportChange = (e) => {
		const ballotImport = update(this.state.ballotImport, {[e.target.name]: {$set: e.target.value}});
		this.setState({ballotImport});
	}
	deleteVotersClick = (e, rowData) => {
		console.log('ballotId=', rowData.BallotID)
		this.props.dispatch(deleteVoters(rowData.BallotID));
	}
	importVotersClick = (e, rowData) => {
		console.log('ballotId=', rowData.BallotID)
		this.setState({
			votersBallotID: rowData.BallotID,
			showVotersImport: true
		})
	}
	deleteCommentsClick = (e, rowData) => {
		console.log('ballotId=', rowData.BallotID)
		this.props.dispatch(deleteCommentsWithBallotId(rowData.BallotID));
	}
	importCommentsClick = (e, rowData) => {
		this.props.dispatch(importComments(rowData.BallotID, rowData.EpollNum, 1));
	}
	deleteResultsClick = (e, rowData) => {
		console.log('ballotId=', rowData.BallotID)
		this.props.dispatch(deleteResults(rowData.BallotID));
	}
	importResultsClick = (e, rowData) => {
		this.props.dispatch(importResults(rowData.BallotID, rowData.EpollNum, 1));
	}
	handleRemoveSelected = () => {
		const {ballotData} = this.props;
		const {ballotDataMap} = this.state;
		var delBallotIds = [];
		for (var i = 0; i < ballotDataMap.length; i++) { // only select checked items that are visible
			let ballotId = ballotData[ballotDataMap[i]].BallotID
			if (this.state.selectedBallots.includes(ballotId)) {
				delBallotIds.push(ballotId)
			}
		}
		if (delBallotIds.length) {
			this.props.dispatch(deleteBallots(delBallotIds))
		}
	}
	sortChange = (event, dataKey) => {
		const {sortBy, sortDirection} = sortClick(event, dataKey, this.state.sortBy, this.state.sortDirection);
		this.setState({
			sortBy: sortBy,
			sortDirection: sortDirection,
			ballotDataMap: sortData(this.state.ballotDataMap, this.props.ballotData, sortBy, sortDirection)
		});
		this.rowHeightCache.clearAll()
	}
	filterChange = (event, dataKey) => {
		const {ballotData} = this.props;
		const {sortBy, sortDirection} = this.state;
		const filters = update(this.state.filters, {[dataKey]: {$set: event.target.textContent}});
		this.setState({
			filters: filters,
			ballotDataMap: sortData(filterData(ballotData, filters), ballotData, sortBy, sortDirection)
		});
		this.rowHeightCache.clearAll()
	}
	updateBallotField = (rowIndex, dataKey, fieldData) => {
		const b = this.props.ballotData[this.state.ballotDataMap[rowIndex]];
		this.props.dispatch(updateBallot({
			BallotID: b.BallotID,
			[dataKey]: fieldData
		}));
	}
	updateBallotFieldIfChanged = (rowIndex, columnIndex, dataKey, fieldData) => {
		const b = this.props.ballotData[this.state.ballotDataMap[rowIndex]];
		if (b[dataKey] !== fieldData) {
			this.props.dispatch(updateBallot({
				BallotID: b.BallotID,
				[dataKey]: fieldData
			}))
			this.rowHeightCache.clear(rowIndex, columnIndex)
		}
	}

	renderHeaderCheckbox = ({dataKey}) => {
		const {ballotDataMap, selectedBallots} = this.state;
		const {ballotData} = this.props;
		const checked = allSelected(selectedBallots, ballotDataMap, ballotData, 'BallotID');
		return (
			<input
				type="checkbox"
				checked={checked}
				onChange={e => this.setState({selectedBallots: toggleVisible(selectedBallots, ballotDataMap, ballotData, 'BallotID')})}
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
	renderCommentCount = ({rowIndex, rowData, dataKey}) => {
		var count = rowData[dataKey];
		if (count > 0) {
			return (
				<div>
					<span>{count}</span>
					<button onClick={(e) => {return this.deleteCommentsClick(e, rowData)}}>Delete</button>
				</div>
			)
		}
		else {
			return (
				<button onClick={(e) => {return this.importCommentsClick(e, rowData)}}>Import</button>
			)
		}
	}

	renderResult = ({rowIndex, rowData, dataKey}) => {
		var result = rowData.Result;
		if (result !== '0/0/0') {
			return (
				<div>
					<span>{result}</span>
					<button onClick={(e) => {return this.deleteResultsClick(e, rowData)}}>Delete</button>
				</div>
			)
		}
		else {
			return (
				<button onClick={(e) => {return this.importResultsClick(e, rowData)}}>Import</button>
			)
		}
	}

	refresh = () => {
		this.props.dispatch(getBallots())
	}

	componentDidMount() {
		var wrapper = document.getElementById('Ballots');
		this.setState({height: wrapper.offsetHeight - 19, width: wrapper.offsetWidth})

		if (!this.props.ballotDataValid) {
			this.props.dispatch(getBallots())
		}
	}

	renderOkModal = () => {
		const open = this.props.getBallotsError
		|| this.props.updateBallotError
		|| this.props.deleteBallotsError
		|| this.props.importCommentsError
		|| this.props.deleteCommentsWithBallotIdError
		|| this.props.importResultsError
		|| this.props.clearDeleteResultsError

		var msg = this.props.errMsg;
		var dispatchObj = null
		if (this.props.getBallotsError) {
			msg = this.props.getBallotsMsg
			dispatchObj = clearGetBallotsError()
		}
		else if (this.props.updateBallotError) {
			msg = this.props.updateBallotMsg
			dispatchObj = clearUpdateBallotError()
		}
		else if (this.props.deleteBallotsError) {
			msg = this.props.deleteBallotsMsg
			dispatchObj = clearDeleteBallotsError()
		}
		else if (this.props.importCommentsError) {
			msg = this.props.importCommentsMsg
			dispatchObj = clearImportCommentsError()
		}
		else if (this.props.clearDeleteCommentsWithBallotIdError) {
			msg = this.props.delteCommentsWithBallotIdMsg
			dispatchObj = clearDeleteCommentsWithBallotIdError()
		}
		else if (this.props.importResultsError) {
			msg = this.props.importResultsMsg
			dispatchObj = clearImportResultsError()
		}
		else if (this.props.clearDeleteResultsError) {
			msg = this.props.delteResultsMsg
			dispatchObj = clearDeleteResultsError()
		}

		return (
			<Modal
				className='ModalContent'
				overlayClassName='ModalOverlay'
				isOpen={open}
				appElement={document.querySelector('#Ballots')}
			>
				<p>{msg}</p>
				<button onClick={() => this.props.dispatch(dispatchObj)}>OK</button>
			</Modal>
		)
	}

	handleUpload = (e) => {
		//e.preventDefault();
		console.log(this.votersFileInputRef.current.files[0]);
		this.props.dispatch(uploadVoters(this.state.votersBallotID, this.votersFileInputRef.current.files[0]));
	}

  renderVotersImportModal = () => {
  	return (
      <Modal
        className='ModalContent'
        overlayClassName='ModalOverlay'
        isOpen={this.state.showVotersImport}
        appElement={document.querySelector('#Ballots')}
      >
        <p>Import voters list for {this.state.votersBallotID}</p>
        <input
        	type='file'
        	accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        	ref={this.votersFileInputRef}
        />
        <br />
        <button onClick={this.handleUpload}>OK</button>
        <button onClick={() => this.setState({showVotersImport: false})}>Cancel</button>
      </Modal>
    )
  }

  renderHeaderCell = ({columnData, dataKey, label}) => {
    const sortDirection = this.state.sortBy.includes(dataKey)? this.state.sortDirection[dataKey]: 'NONE';
    const showIndicator = columnData.hasOwnProperty('sortable')? columnData.sortable: true;
    const showFilter = this.state.filters.hasOwnProperty(dataKey);

    return (
      <div>
        <span
          title={label}
          onClick={e => this.sortChange(e, dataKey)}
          style={{cursor: 'pointer'}}>
          {label}
          {showIndicator && <SortIndicator sortDirection={sortDirection} />}
        </span><br />
        {showFilter &&
          <div
            className={styles.headerFilt}
            placeholder='Filter'
            contentEditable
            onInput={e => {this.filterChange(e, dataKey)}}
          />}
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
				headerHeight={60}
				noRowsRenderer={this.noRowsRenderer}
				headerClassName={styles.headerColumn}
				rowClassName={this.rowClassName}
				rowCount={this.state.ballotDataMap.length}
				rowGetter={({index}) => {return this.props.ballotData[this.state.ballotDataMap[index]]}}
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
					<button onClick={this.refresh}>Refresh</button>
					<button>Add</button>
					<button onClick={this.handleRemoveSelected}>Remove Selected</button>
					<button onClick={this.showEpolls}>Import ePoll</button>
					{this.renderTable()}
					{this.renderOkModal()}
					{this.renderVotersImportModal()}
				</div>)
			}
			</div>
		)
	}
}

function mapStateToProps(state) {
	const {ballots, comments, results} = state
	return {
		ballotDataValid: ballots.ballotDataValid,
		ballotData: ballots.ballotData,
		getBallots: ballots.getBallots,
		getBallotsError: ballots.getBallotsError,
		getBallotsMsg: ballots.getBallotsMsg,
		updateBallot: ballots.updateBallot,
		updateBallotError: ballots.updateBallotError,
		updateBallotMsg: ballots.updateBallotMsg,
		deleteBallots: state.ballots.deleteBallots,
		deleteBallotsError: state.ballots.deleteBallotsError,
		deleteBallotsMsg: state.ballots.deleteBallotsMsg,
		importComments: comments.importComments,
		importCommentsError: comments.importCommentsError,
		importCommentsMsg: comments.importCommentsMsg,
		importCommentsCount: comments.importCommentsCount,
		deleteResults: results.deleteResults,
		deleteResultsError: results.deleteResultsError,
		deleteResultsMsg: results.deleteResultsMsg,
		importResults: results.importResults,
		importResultsError: results.importResultsError,
		importResultsMsg: results.importResultsMsg,
	}
}
export default connect(mapStateToProps)(Ballots);