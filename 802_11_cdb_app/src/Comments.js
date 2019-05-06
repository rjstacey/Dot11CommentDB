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
import './CommentSelector.css';


function html_preserve_newline(text) {
	return typeof text === 'string'?
		text.split('\n').map((line, i, arr) => {
			const lline = <span key={i}>{line}</span>;
			if (i === arr.length - 1) {
				return lline;
			} else {
				return [lline, <br key={i + 'br'} />];
		}
	}):
	text;
}

class ImportModal extends React.PureComponent {
	constructor(props) {
		super(props)
		this.fileInputRef = React.createRef();
	}
	submit = () => {
		this.props.dispatch(uploadResolutions(this.props.ballotId, this.fileInputRef.current.files[0]))
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
				<p>Import resolutions for {this.props.ballotId}. Current resolutions (if any) will be deleted.</p>
				<label>
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

class ColumnSelector extends React.PureComponent {
	constructor(props) {
		super(props)
		this.state = {
			isOpen: false
		}
	}

	componentDidUpdate() {
		setTimeout(() => {
			if (this.state.isOpen) {
				window.addEventListener('click', this.close)
			}
			else{
				window.removeEventListener('click', this.close)
			}
		}, 0)
	}

	componentWillUnmount() {
		window.removeEventListener('click', this.close)
	}

	close = () => {
		this.setState({isOpen: false})
	}

	render() {
		const {list} = this.props
		const {isOpen} = this.state
		return (
			<div className="dd-wrapper">
				<div className="dd-header" onClick={() => this.setState({isOpen: !this.state.isOpen})}>
					<div className="dd-header-title">Select Columns</div><i className={isOpen? "fa fa-angle-up": "fa fa-angle-down"} />
				</div>
				{isOpen &&
					<ul className="dd-list">
						{list.map((item, index) => (
							<li className="dd-list-item" key={item.dataKey} onClick={() => this.props.toggleItem(item.dataKey)}>
								{item.label} {this.props.isChecked(item.dataKey) && <i className="fa fa-check" />}
							</li>
						))}
					</ul>
				}
			</div>
		)
	}
}

class Comments extends React.Component {
	constructor(props) {
		super(props);
		this.columns = [
			{dataKey: '', label: '',
				width: 40, flexGrow: 0, flexShrink: 0,
				headerRenderer: this.renderHeaderCellCheckbox,
				cellRenderer: this.renderDataCellCheckbox},
			{dataKey: 'CommentID', label: 'CID',
				width: 60, flexGrow: 0, flexShrink: 0},
			{dataKey: 'CommenterName', label: 'Commenter',
				width: 100, flexGrow: 0, flexShrink: 0},
			{dataKey: 'MustSatisfy', label: 'MS',
				width: 36, flexGrow: 0, flexShrink: 0},
			{dataKey: 'Category', label: 'Cat',
				width: 36, flexGrow: 0, flexShrink: 0},
			{dataKey: 'Clause', label: 'Clause',
				width: 100, flexGrow: 0, flexShrink: 0},
			{dataKey: 'Page', label: 'Page',
				width: 80, flexGrow: 0, flexShrink: 0},
			{dataKey: 'Comment', label: 'Comment',
				width: 400, flexGrow: 1, flexShrink: 1}, 
			{dataKey: 'ProposedChange', label: 'Proposed Change',
				width: 400, flexGrow: 1, flexShrink: 1},
			{dataKey: 'Assignee', label: 'Assignee',
				width: 150, flexGrow: 1, flexShrink: 1,
				cellRenderer: this.renderDataCellAssignee},
			{dataKey: 'Resolution', label: 'Resolution',
				width: 400, flexGrow: 1, flexShrink: 1,
				cellRenderer: this.renderDataCellResolution},
			{dataKey: 'Editing', label: 'Editing',
				width: 300, flexGrow: 1, flexShrink: 1,
				cellRenderer: this.renderDataCellEditing},
		];
		this.columns[this.columns.length-1].isLast = true;

		// List of filterable columns
    	const filterable = ['CommentID', 'CommenterName', 'MustSatisfy', 'Category', 'Clause', 'Page', 'Comment', 'ProposedChange', 'Assignee'];
		if (Object.keys(props.filters).length === 0) {
			filterable.forEach(dataKey => {
				this.props.dispatch(setCommentsFilter(dataKey, ''));
			});
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
		this.updateDimensions()
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
		//this.columns[i+1].width -= deltaX;
		//this.setState({columnWidth: update(this.state.columnWidth, {$set: {[this.columns[i].dataKey]: this.columns[i].width, [this.columns[i+1].dataKey]: this.columns[i+1].width}})})
		this.setState({columnWidth: update(this.state.columnWidth, {$set: {[this.columns[i].dataKey]: this.columns[i].width}})})
		//this.tableRef.recomputeGridSize()
		//console.log('col=', i, ' deltaX=', deltaX, ' width=', this.columns[i].width)
	}

	toggleColumnVisible = (dataKey) => {
		this.setState({columnVisible: update(this.state.columnVisible, {$toggle: [dataKey]})})
	}

	isColumnVisible = (dataKey) => {
		return this.state.columnVisible[dataKey]
	}

	ballotSelected = (ballotId) => {
		// Redirect to results page with selected ballot
		this.props.history.push(`/Comments/${ballotId}`)
		if (ballotId) {
			this.props.dispatch(getComments(ballotId));
			this.rowHeightCache.clearAll()
		}
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
		const expanded = allSelected(expandedComments, commentDataMap, commentData, 'CommentID')
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
		);
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
		const sortable = this.sortable.includes(dataKey);
		const sortDirection = this.props.sortBy.includes(dataKey)? this.props.sortDirection[dataKey]: 'NONE';
		if (sortable) {
			var style = {cursor: 'pointer'};
			var onClick = e => this.sortChange(e, dataKey);
		}
		return (
			<div
				className={styles.headerLabelContainer}
				title={label}
				style={style}
				onClick={onClick}
			>
				<span className={styles.headerLabel}>{label}</span>
				{sortable && (sortDirection === 'NONE' || <span className={styles.headerSortIcon + " " + (sortDirection === 'ASC'? "fa fa-sort-alpha-down": "fa fa-sort-alpha-up")} />)}
			</div>
		)
	}

	renderFilter = ({dataKey}) => {
		return (
			<input
				type='text'
				className={styles.headerFilt}
				placeholder='Filter'
				onChange={e => {this.filterChange(e, dataKey)}}
				value={this.props.filters[dataKey]}
				style={{width: 'calc(100% - 5px)'}}
			/>
		)
	}

	renderHeaderCell = ({columnData, dataKey, label}) => {
		const col = columnData;
		const showFilter = this.props.filters.hasOwnProperty(dataKey);

		if (col.isLast) {
			return (
				<React.Fragment key={dataKey}>
					{this.renderLabel({dataKey, label})}
					{showFilter && this.renderFilter({dataKey})}
				</React.Fragment>
			)
		}
		return (
			<React.Fragment key={dataKey}>
				<div className={styles.headerBox}>
					{this.renderLabel({dataKey, label})}
					{showFilter && this.renderFilter({dataKey})}
				</div>
				<Draggable
					axis="x"
					defaultClassName={styles.dragHandle}
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