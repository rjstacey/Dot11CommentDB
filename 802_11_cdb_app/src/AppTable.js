import React from 'react';
import Modal from 'react-modal';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import Draggable from 'react-draggable';
import LinesEllipsis from 'react-lines-ellipsis'
import BallotSelector from './BallotSelector'
import CommentDetail from './CommentDetail'
import {sortClick, allSelected, toggleVisible} from './filter'
import {setCommentsSort, setCommentsFilter, getComments, uploadResolutions} from './actions/comments'
import {setBallotId} from './actions/ballots'
import styles from './AppTable.css';


class AppTable extends React.PureComponent {
	constructor(props) {

		super(props);


		// List of filterable columns
    	const filterable = ['CommentID', 'CommenterName', 'MustSatisfy', 'Category', 'Clause', 'Page', 'Comment', 'ProposedChange', 'Assignee'];
		if (Object.keys(props.filters).length === 0) {
			filterable.forEach(dataKey => this.props.dispatch(setCommentsFilter(dataKey, '')))
		}
		this.sortable = filterable;

		var columnVisible = {};
		var columnWidth = {};
		this.columns.forEach(col => {
			if (col.dataKey) {
				columnVisible[col.dataKey] = !col.hiddenByDefault;
				columnWidth[col.dataKey] = col.width
			}
		});

		this.state = {
			editIndex: 0,
			showCommentDetail: false,

			selectedComments: [],
			expandedComments: [],

			columnVisible,
			columnWidth,

			height: 500,
			width: 600
		}

		this.lastBallotId = ''
		this.lastRenderedWidth = this.width
		this.rowHeightCache = new CellMeasurerCache({
			minHeight: 54,
			fixedWidth: true
		})

		this.renderMeasuredCell = this.renderMeasuredCell.bind(this)
		this.clearCachedRowHeight = this.clearCachedRowHeight.bind(this)
		this.clearAllCachedRowHeight = this.clearAllCachedRowHeight.bind(this)
		this.renderTable = this.renderTable.bind(this)
	}

	componentDidMount() {
		this.updateDimensions();
		window.addEventListener("resize", this.updateDimensions);

		const ballotId = this.props.match.params.ballotId;
		//console.log(ballotId, this.props.ballotId)
		if (this.props.ballotId !== ballotId && (this.props.ballotId || ballotId)) {
			if (ballotId) {
				// Routed here with parameter ballotId specified, but not matching stored ballotId
				// Store the ballotId and get results for this ballotId
				this.props.dispatch(setBallotId(ballotId))
				this.props.dispatch(getComments(ballotId))
			}
			else {
				// Routed here with parameter ballotId unspecified, but we have a ballotId stored
				// Redirect to the stored ballotId
				this.props.history.replace(`/Comments/${this.props.ballotId}`)
				console.log(`/Comments/${this.props.ballotId}`)
				this.props.dispatch(getComments(this.props.ballotId))
			}
			this.rowHeightCache.clearAll()
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
		this.setState({columnWidth: update(this.state.columnWidth, {$set: {[this.columns[i].dataKey]: this.columns[i].width}})})
	}

	toggleColumnVisible = (dataKey) => {
		this.setState({columnVisible: update(this.state.columnVisible, {$toggle: [dataKey]})})
	}

	isColumnVisible = (dataKey) => {
		return this.state.columnVisible[dataKey]
	}

	sortChange = (event, dataKey) => {
		const {sortBy, sortDirection} = sortClick(event, dataKey, this.props.sortBy, this.props.sortDirection);
		this.props.dispatch(setCommentsSort(sortBy, sortDirection));
		this.rowHeightCache.clearAll();
	}

	filterChange = (event, dataKey) => {
		this.props.dispatch(setCommentsFilter(dataKey, event.target.value));
		this.rowHeightCache.clearAll()
	}

	rowGetter = ({index}) => {
		return this.props.commentData[this.props.commentDataMap[index]];
	}

	renderHeaderCellCheckbox = ({dataKey}) => {
		const {selectedComments, expandedComments} = this.state;
		const {commentDataMap, commentData} = this.props;
		const checked = allSelected(selectedComments, commentDataMap, commentData, 'CommentID');
		const expanded = allSelected(expandedComments, commentDataMap, commentData, 'CommentID');
		return (
			<div>
				<input
					type="checkbox"
					title="Select All"
					checked={checked}
					onChange={e => {
						this.setState({selectedComments: toggleVisible(selectedComments, commentDataMap, commentData, 'CommentID')})
					}}
				/>
				<span
					style={{cursor: 'pointer'}}
					title="Expand All"
					className={expanded? "fa fa-angle-double-down": "fa fa-angle-double-right"}
					onClick={e => {
						this.setState({expandedComments: toggleVisible(expandedComments, commentDataMap, commentData, 'CommentID')})
						this.clearAllCachedRowHeight()
					}}
				/>
				<div>{commentDataMap.length}</div>
			</div>
		)
	}

	renderDataCellCheckbox = ({rowIndex, rowData, dataKey}) => {
		const commentId = rowData.CommentID;
		const expanded = this.state.expandedComments.includes(commentId);
		return (
			<div>
				<input
					type="checkbox"
					title="Select Row"
					checked={this.state.selectedComments.indexOf(commentId) >= 0}
					onChange={e => {
						// if commentId is present in selectedComments (i > 0) then remove it; otherwise add it
						let i = this.state.selectedComments.indexOf(commentId);
						this.setState({
							selectedComments: update(this.state.selectedComments, (i > -1)? {$splice: [[i, 1]]}: {$push: [commentId]})
						})
					}}
				/>
				<span
					style={{cursor: 'pointer'}}
					title="Expand Row"
					className={expanded? "fa fa-angle-down": "fa fa-angle-right"}
					onClick={e => {
						let i = this.state.expandedComments.indexOf(commentId);
						this.setState({
							expandedComments: update(this.state.expandedComments, (i > -1)? {$splice: [[i, 1]]}: {$push: [commentId]})
						})
						this.clearCachedRowHeight(rowIndex)
					}}
				/>
			</div>
        );
	}

	renderMultiline = ({rowIndex, rowData, dataKey, columnIndex, parent}) => {
		const expanded = this.state.expandedComments.includes(rowData.CommentID);
		//console.log('expanded=', expanded, rowIndex, columnIndex)
		return(
			<LinesEllipsis
				text={rowData[dataKey]}
				maxLine={expanded? 1000: 3}
				basedOn='words'
			/>
		)
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
		return (
			<input
				type='text'
				className={styles.headerFilt}
				placeholder='Filter'
				onChange={e => {this.filterChange(e, dataKey)}}
				value={this.props.filters[dataKey]}
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
		return <div className={styles.noRows}>{this.props.getComments? 'Loading...': 'No rows'}</div>
	}

	rowClassName = ({index}) => {
		if (index < 0) {
			return styles.headerRow;
		} else {
			return index % 2 === 0 ? styles.evenRow : styles.oddRow;
		}
	}

	renderMeasuredCell(props) {
		const {rowIndex, rowData, dataKey, columnIndex, columnData, parent} = props;
		const expanded = this.state.expandedComments.includes(rowData.CommentID);
		if (expanded) {
			return (
				<CellMeasurer
					cache={this.rowHeightCache}
					rowIndex={rowIndex}
					columnIndex={columnIndex}
					parent={parent}
					key={dataKey}
				>
					{columnData.cellRenderer? columnData.cellRenderer(props): <div>{html_preserve_newline(rowData[dataKey])}</div>}
				</CellMeasurer>
			)
		}
		else {
			this.rowHeightCache.set(rowIndex, columnIndex, undefined, 0); // force to minHeight
			return columnData.cellRenderer? columnData.cellRenderer(props): <div>{html_preserve_newline(rowData[dataKey])}</div>;
		}
	}

	renderDataCellAssignee = ({rowData}) => {
		const {resolutions} = rowData;
		if (resolutions.length === 0) {
			return null
		} else if (resolutions.length === 1) {
			return resolutions[0].AssigneeName
		}
		return (
			<div style={{display: 'flex', flexDirection: 'column'}}>
				{resolutions.map((r, i) => (<div style={{whiteSpace: 'nowrap'}} key={i}>{r.AssigneeName}</div>))}
			</div>
		)
	}

	renderDataCellResolution = ({rowData}) => {
		const {resolutions} = rowData;
		if (resolutions.length === 0) {
			return null
		} else if (resolutions.length === 1) {
			const r = resolutions[0];
			return r.ResnStatus? <React.Fragment><b>{r.ResnStatus}:</b> {r.Resolution}</React.Fragment>: r.Resolution
		}
		return (
			<div style={{display: 'flex', flexDirection: 'column'}}>
				{resolutions.map((r, i) => (<div key={i} style={{whiteSpace: 'nowrap'}}><b>{r.ResnStatus}:</b> {r.Resolution}</div>))}
			</div>
		)
	}

	renderDataCellEditing = ({rowData}) => {
		return rowData.EditStatus? <React.Fragment><b>{rowData.EditStatus}:</b> {rowData.EditNotes}</React.Fragment>: rowData.EditNotes
	}

	setTableRef = (ref) => {
		this.tableRef = ref;
	}

	renderTable() {
		if (this.lastRenderedWidth !== this.state.width || this.lastBallotId !== this.props.ballotId) {
			this.lastRenderedWidth = this.state.width
			this.lastBallotId = this.props.ballotId
			this.rowHeightCache.clearAll()
		}
		return (
			<Table
				className={styles.Table}
				height={this.state.height}
				width={this.state.width}
				rowHeight={this.rowHeightCache.rowHeight}
				headerHeight={44}
				noRowsRenderer={this.noRowsRenderer}
				headerClassName={styles.headerColumn}
				rowClassName={this.rowClassName}
				rowCount={this.props.commentDataMap.length}
				rowGetter={this.rowGetter}
				onRowDoubleClick={this.editRow}
				//headerRowRenderer={this.headerRowRenderer}
        		ref={this.setTableRef}
        	>
				{this.columns.map((col, index) => {
					const {cellRenderer, headerRenderer, width, ...otherProps} = col;
					if (col.dataKey && !this.isColumnVisible(col.dataKey)) {
						return null
					}
					return (
						<Column 
							key={index}
							columnData={col}
							headerRenderer={headerRenderer? headerRenderer: this.renderHeaderCell}
							cellRenderer={this.renderMeasuredCell}
							width={this.state.columnWidth[col.dataKey]? this.state.columnWidth[col.dataKey]: width}
							{...otherProps}
						/>
					)})}
			</Table>
        )
	}

	clearCachedRowHeight(rowIndex) {
		// Clear all the column heights in the cache.
		for (var i = 0; i < this.columns.length; i++) {
			this.rowHeightCache.clear(rowIndex, i)
		}
		this.tableRef.recomputeRowHeights(rowIndex);
	}

	clearAllCachedRowHeight() {
		this.rowHeightCache.clearAll()
		this.tableRef.recomputeRowHeights(0);
	}

	editRow = ({event, index, rowData}) => {
		this.setState({
			editIndex: index,
			showCommentDetail: true
		})
	}

	render() {   
		return (
			<div id='Comments'>
				<div id='top-row'>
        			<BallotSelector onBallotSelected={this.ballotSelected} />
        			<button onClick={e => this.setState({showImport: true})}>Upload Resolutions</button>
        			<ColumnSelector list={this.columns} toggleItem={this.toggleColumnVisible} isChecked={this.isColumnVisible}/>
				</div>

				{!this.state.showCommentDetail?
					this.renderTable()
					:
					<CommentDetail
						commentData={this.props.commentData}
						commentDataMap={this.props.commentDataMap}
						commentIndex={this.state.editIndex}
						close={() => {this.setState({showCommentDetail: false})}}
					/>
				}
				<ImportModal
					ballotId={this.props.ballotId}
					isOpen={this.state.showImport}
					close={() => this.setState({showImport: false})}
					dispatch={this.props.dispatch}
					appElement={document.querySelector('#Comments')}
				/>
			</div>
		)
	}

}

function mapStateToProps(state) {
	const {comments, ballots} = state
	return {
		filters: comments.filters,
		sortBy: comments.sortBy,
		sortDirection: comments.sortDirection,
		ballotId: ballots.ballotId,
		commentData: comments.commentData,
		commentDataMap: comments.commentDataMap,
		getComments: comments.getComments
	}
}
export default connect(mapStateToProps)(Comments);