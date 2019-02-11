import React from 'react';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import {setBallotsFilter, setBallotsSort, getBallots, deleteBallots, updateBallot} from './actions/ballots';
import {deleteCommentsWithBallotId, importComments} from './actions/comments'
import {deleteResults, importResults} from './actions/results'
import {sortClick, allSelected, toggleVisible, SortIndicator} from './filter'
import Epolls from './Epolls'
import styles from './AppTable.css'


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
	        {dataKey: 'BallotSeries', label: 'Voting Pool',
	        	width: 80,
	    		cellRenderer: this.renderEditable},
			{dataKey: 'Results',      label: 'Voting Result',
				width: 150,
				cellRenderer: this.renderResult},
			{dataKey: 'CommentCount', label: 'Comments',
				width: 100,
				cellRenderer: this.renderCommentCount}
		];

		this.state = {
			showEpolls: false,
			height: 100,
			width: 100,
			ballotImport: {},
			selectedBallots: [],
		}

		// List of filterable columns
    	const filterable = ['BallotID', 'Project', 'Document', 'Topic', 'EpollNum'];
		if (Object.keys(props.filters).length === 0) {
			filterable.forEach(dataKey => {
				this.props.dispatch(setBallotsFilter(dataKey, ''));
			});
		}

		this.sortable = ['BallotID', 'Project', 'Document', 'Topic', 'EpollNum', 'Start', 'End'];

		this.lastRenderedWidth = this.state.width;
		this.rowHeightCache = new CellMeasurerCache({
			minHeight: 18,
			fixedWidth: true
		})
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
	deleteResultsClick = (e, rowData) => {
		console.log('ballotId=', rowData.BallotID)
		this.props.dispatch(deleteResults(rowData.BallotID));
	}
	importResultsClick = (e, rowData) => {
		this.props.dispatch(importResults(rowData.BallotID, rowData.EpollNum));
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
		if (result) {
			let p = parseFloat(100*result.Approve/(result.Approve+result.Disapprove)).toFixed(1);
			let percentStr = isNaN(p)? '': ` (${p})`;
			return (
				<div>
					<span>{`${result.Approve}/${result.Disapprove}/${result.Abstain}` + percentStr}</span><br />
					<span>{`Invalid Abstains: ${result.InvalidAbstain}`}</span><br />
					<span>{`Invalid Votes: ${result.InvalidVote}`}</span><br />
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

		if (!this.props.ballotsDataValid) {
			this.props.dispatch(getBallots())
		}
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
					<button disabled={this.props.getBallots} onClick={this.refresh}>Refresh</button>
					<button>Add</button>
					<button onClick={this.handleRemoveSelected}>Remove Selected</button>
					<button onClick={this.showEpolls}>Import ePoll</button>
					{this.renderTable()}
				</div>)
			}
			</div>
		)
	}
}

function mapStateToProps(state) {
	const {ballots, comments, results} = state
	return {
		filters: ballots.filters,
		sortBy: ballots.sortBy,
		sortDirection: ballots.sortDirection,
		ballotsDataValid: ballots.ballotsDataValid,
		ballotsData: ballots.ballotsData,
		ballotsDataMap: ballots.ballotsDataMap,
		getBallots: ballots.getBallots,
		updateBallot: ballots.updateBallot,
		deleteBallots: state.ballots.deleteBallots,
		importComments: comments.importComments,
		importCommentsCount: comments.importCommentsCount,
		deleteResults: results.deleteResults,
		importResults: results.importResults,
	}
}
export default connect(mapStateToProps)(Ballots);