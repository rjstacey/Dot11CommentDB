import React from 'react';
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import LinesEllipsis from 'react-lines-ellipsis'
import BallotSelector from './BallotSelector'
import CommentDetail from './CommentDetail'
import {sortClick, allSelected, toggleVisible, SortIndicator} from './filter'
import {setCommentsSort, setCommentsFilter, getComments} from './actions/comments'
import styles from './AppTable.css';


function ExpandIcon(props) {
	const {showPlus, ...otherProps} = props;
	return (
		<svg width={18} height={18} aria-label={showPlus? 'Expand': 'Shrink'} {...otherProps}>
			<g stroke='black'>
			<circle cx={9} cy={9} r={8} strokeWidth={1} fill='none'/>
			<path
				d={showPlus? 'M 4,9 h 10 M 9,4 v 10': 'M 4,9 h 10'}
				strokeWidth={2}
				strokeLinecap='round'
			/>
			</g>
		</svg>
	)
}


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

class Comments extends React.Component {
	constructor(props) {
		super(props);

		this.columns = [
			{dataKey: '', label: '',
				width: 60, flexGrow: 0, flexShrink: 0,
				headerRenderer: this.renderHeaderCheckbox,
				cellRenderer: this.cellRendererCheckbox},
			{dataKey: 'CommentID', label: 'CID',
				width: 60, flexGrow: 0, flexShrink: 0},
			{dataKey: ['Commenter', 'Vote', 'MustSatisfy'], label: 'Commenter',
				width: 150, flexGrow: 0, flexShrink: 0,
				cellRenderer: this.cellRendererVertical},
			{dataKey: 'Category', label: 'Category',
				width: 80, flexGrow: 0, flexShrink: 0},
			{dataKey: 'Clause', label: 'Clause',
				width: 100, flexGrow: 0, flexShrink: 0},
			{dataKey: 'Page', label: 'Page',
				width: 100, flexGrow: 0, flexShrink: 0},
			{dataKey: 'Comment', label: 'Comment',
				width: 400}, 
			{dataKey: 'ProposedChange', label: 'Proposed Change',
				width: 400},
			{dataKey: 'Assignee', label: 'Assignee',
				width: 100},
			{dataKey: ['ResnStatus', 'Resolution'], label: 'Resolution',
				width: 400,
				cellRenderer: this.cellRendererHorizontal},
			{dataKey: ['EditStatus', 'EditNotes'], label: 'Editing',
				width: 300,
				cellRenderer: this.cellRendererHorizontal},
		];

		// List of filterable columns
    	const filterable = ['CommentID', 'Commenter', 'MustSatisfy', 'Category', 'Clause', 'Page', 'Comment', 'ProposedChange', 'Assignee'];
		if (Object.keys(props.filters).length === 0) {
			filterable.forEach(dataKey => {
				this.props.dispatch(setCommentsFilter(dataKey, ''));
			});
		}

		this.sortable = ['CommentID', 'Commenter', 'MustSatisfy', 'Vote', 'Category', 'Clause', 'Page', 'Comment', 'ProposedChange'];

		const show = {
			Commenter: false,
			Assignee: false,
			Resolution: false,
			Editing: false,
		}

		this.state = {
			editIndex: 0,
			showCommentDetail: false,

			selectedComments: [],
			expandedComments: [],

			show,

			height: 500,
			width: 600
		}

		this.lastBallotId = ''
		this.lastRenderedWidth = this.state.width
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
		var wrapper = document.getElementById('Comments');
		this.setState({height: wrapper.offsetHeight - 19, width: wrapper.offsetWidth})
		if (!this.props.commentsValid && this.props.ballotId) {
			this.props.dispatch(getComments(this.props.ballotId));
			this.rowHeightCache.clearAll()
		}
	}

	ballotSelected = (ballotId) => {
		this.props.dispatch(getComments(ballotId));
		this.rowHeightCache.clearAll()
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
	renderHeaderCheckbox = ({dataKey}) => {
		const {selectedComments, expandedComments} = this.state;
		const {commentDataMap, commentData} = this.props;
		const checked = allSelected(selectedComments, commentDataMap, commentData, 'CommentID');
		const expanded = allSelected(expandedComments, commentDataMap, commentData, 'CommentID')
		return (
			<div>
				<input type="checkbox"
					checked={checked}
					onChange={e => {
						this.setState({selectedComments: toggleVisible(selectedComments, commentDataMap, commentData, 'CommentID')})
					}}
				/>
				<ExpandIcon 
					style={{cursor: 'pointer'}}
					showPlus={!expanded}
					onClick={e => {
						this.setState({expandedComments: toggleVisible(expandedComments, commentDataMap, commentData, 'CommentID')})
						this.clearAllCachedRowHeight()
					}}
				/>
			</div>
		);
	}
	renderEditable = ({rowIndex, rowData, dataKey}) => {
    	return (
			<div
				contentEditable
				onBlur={e => {
					this.updateCommentFieldIfChanged(rowIndex, dataKey, e.target.innerHTML)
				}}
				dangerouslySetInnerHTML={{__html: rowData[dataKey]}}
			/>
		);
	}

	cellRendererCheckbox = ({rowIndex, rowData, dataKey}) => {
		const commentId = rowData.CommentID;
		return (
			<div>
			<input
				type="checkbox"
				checked={this.state.selectedComments.indexOf(commentId) >= 0}
				onChange={e => {
					// if commentId is present in selectedComments (i > 0) then remove it; otherwise add it
            		let i = this.state.selectedComments.indexOf(commentId);
            		this.setState({
            			selectedComments: update(this.state.selectedComments, (i > -1)? {$splice: [[i, 1]]}: {$push: [commentId]})
            		})
        		}}
        	/>
        	<ExpandIcon 
        		showPlus={!this.state.expandedComments.includes(commentId)}
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
				onChange={e => {this.filterChange(e, dataKey)}}
				value={this.props.filters[dataKey]}
				style={{width: '100%'}}
			/>
		);
	}

	renderHeaderCell = ({columnData, dataKey, label}) => {
		if (Array.isArray(dataKey)) {
			const smallStyle = {fontSize: '0.75em'};
			const subElements = [];
			dataKey.forEach(key => {
				subElements.push(this.sortable.includes(key)? this.renderSortLabel({dataKey: key, label: key, style: smallStyle}): this.renderLabel({label: key, style: smallStyle}));
				if (this.props.filters.hasOwnProperty(key)) {
					subElements.push(this.renderFilter(key))
				}
				subElements.push(<br key={'br-' + key} />)
			})
			return (
				<div>
					{this.renderLabel({label})}<br />
					{subElements}
				</div>
			);
		}
		else {
			const labelElement = this.sortable.includes(dataKey)? this.renderSortLabel({dataKey, label}): this.renderLabel({label});
			const showFilter = this.props.filters.hasOwnProperty(dataKey)
			return (
				<div>
					{labelElement}
					{showFilter && this.renderFilter(dataKey)}
				</div>
			);
		}
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

	cellRendererVertical = (props) => {
		const {rowData, dataKey} = props;
		return (
			<div style={{display: 'flex', flexDirection: 'column'}}>
				{dataKey.map(key => (<div key={'cell-' + key}>{rowData[key]}</div>))}
			</div>
		)
	}

	cellRendererHorizontal = (props) => {
		const {rowData, dataKey} = props;
		return (
			<div style={{display: 'flex', flexDirection: 'row'}}>
				{dataKey.map(key => (<div key={'cell-' + key}>{rowData[key]}</div>))}
			</div>
		)
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
				headerHeight={80}
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
					const {cellRenderer, headerRenderer, ...otherProps} = col;
					return (
						<Column 
							key={index}
							columnData={col}
							headerRenderer={headerRenderer? headerRenderer: this.renderHeaderCell}
							cellRenderer={this.renderMeasuredCell}
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

	renderRow2 = () => {
		return (
			<div className='row'>        
			<label>Show:
				{Object.keys(this.state.show).map(k =>
					<label key={k}>
						<input
							type='checkbox'
							name={k}
							checked={this.state.show[k]}
							onChange={e => this.setState({show: update(this.state.show, {$toggle: [k]})})}
						/>{k}
					</label>
				)}
			</label>
			</div>
		)
	}


	editRow = ({event, index, rowData}) => {
		this.setState({
			editIndex: index,
			showCommentDetail: true
		})
	}

	render() {   
		return (
			<div id='Comments' style={{height: '100%'}}>
        		<BallotSelector onBallotSelected={this.ballotSelected} />
				{this.renderRow2()}

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
		commentsValid: comments.ballotId && comments.ballotId === ballots.ballotId,
		commentData: comments.commentData,
		commentDataMap: comments.commentDataMap,
		getComments: comments.getComments,
		updateComment: comments.updateComment,
	}
}
export default connect(mapStateToProps)(Comments);