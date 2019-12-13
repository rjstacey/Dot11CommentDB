import PropTypes from 'prop-types';
import React, {useRef, useState} from 'react';
import {Redirect} from 'react-router-dom'
import update from 'immutability-helper';
import {connect} from 'react-redux';
import {Column, Table, CellMeasurer, CellMeasurerCache} from 'react-virtualized';
import Draggable from 'react-draggable';
import LinesEllipsis from 'react-lines-ellipsis';
import BallotSelector from './BallotSelector';
import ColumnSelector from './ColumnSelector';
import AppModal from './AppModal';
import {sortClick, allSelected, toggleVisible, filterValidate} from './filter';
import {setCommentsSort, setCommentsFilters, getComments, uploadResolutions} from './actions/comments';
import {setBallotId} from './actions/ballots';
import {IconSort} from './Icons';
import styles from './AppTable.css';


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


/**
 * @function
 * @description This function is used to determine the text node and it's index within
 * a "root" DOM element.
 *
 * @param  {DOMElement} rootEl The root
 * @param  {Integer} index     The index within the root element of which you want to find the text node
 * @return {Object}            An object that contains the text node, and the index within that text node
 */
function getTextNodeAtPosition(rootEl, index) {
    const treeWalker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, elem => {
        if (index > elem.textContent.length) {
            index -= elem.textContent.length;
            return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
    });
    const node = treeWalker.nextNode();

    return {
        node: node? node: rootEl,
        position: node? index: 0,
    };
};


class ContentEditable extends React.Component {
	constructor(props) {
		super(props)
		this.ref = props.innerRef
	}
    shouldComponentUpdate = (nextProps) => {
        return nextProps.html !== this.ref.current.innerHTML;
    }
	componentWillUpdate() {
		this.selection = window.getSelection();
		if (this.selection && this.selection.rangeCount) {
			const container = this.ref.current
			const range = this.selection.getRangeAt(0);
			const clone = range.cloneRange();

			// find the range start index
			clone.selectNodeContents(container);
			clone.setStart(container, 0);
			clone.setEnd(range.startContainer, range.startOffset);
			this.startIndex = clone.toString().length;

			// find the range end index
			clone.selectNodeContents(container);
			clone.setStart(container, 0);
			clone.setEnd(range.endContainer, range.endOffset);
			this.endIndex = clone.toString().length;
		}
	}
    componentDidUpdate() {
    	if (this.selection && this.selection.rangeCount) { 
	    	const container = this.ref.current
			const start = getTextNodeAtPosition(container, this.startIndex);
			const end = getTextNodeAtPosition(container, this.endIndex);
			const newRange = new Range();

			newRange.setStart(start.node, start.position);
			newRange.setEnd(end.node, end.position);

			this.selection.removeAllRanges();
			this.selection.addRange(newRange);
			container.focus();
		}
    }
    emitChange = () => {
        var html = this.ref.current.innerHTML;
        if (this.props.onChange && html !== this.lastHtml) {
            this.props.onChange({
                target: {
                    value: this.ref.current.innerText
                }
            });
        }
        this.lastHtml = html;
    }
    render() {
        return <div
        	className={this.props.className}
        	ref={this.ref}
            onInput={this.emitChange}
            onBlur={this.emitChange}
            contentEditable
            dangerouslySetInnerHTML={{__html: this.props.html}} />;
    }
}

function SelectCommentsModal(props) {
	const [list, setList] = useState('');
	const listRef = useRef();

	function onOpen() {
		const {commentData, selected} = props
		const cidValid = cid => commentData.filter(row => row.CommentID === cid).length > 0
		const list = selected.map(cid => cidValid(cid)? cid.toString(): '<span style="color: red">' + cid + '</span>').join(', ')
		setList(list)
	}

	function changeList(e) {
		const {commentData} = props
		const cidValid = cid => commentData.filter(row => row.CommentID === cid).length > 0
		const listArr = e.target.value.match(/\d+[^\d]*/g)
		if (listArr) {
			var list = ''
			listArr.forEach(cidStr => {
				const m = cidStr.match(/(\d+)(.*)/)		// split number from separator
				const cid = m[1]
				const sep = m[2]
				if (cidValid(parseInt(cid, 10))) {
					list += cid + sep
				}
				else {
					list += '<span style="color: red">' + cid + '</span>' + sep
				}
			})
			setList(list)
		}
	}

	function selectShown() {
		const {commentData, commentDataMap} = props
		const list = commentDataMap.map(i => commentData[i].CommentID).join(', ')
		setList(list)
	}

	function clear() {
		setList('')
	}

	function submit() {
		//const listStr = this.state.list.replace(/<span[^>]*>|<\/span>/g, '')	// strip out <span> and </span>
		const listStr = listRef.current.innerText
		const listArr = listStr.match(/\d+/g)	// split out numbers
		const cids = listArr? listArr.map(cid => parseInt(cid, 10)): []
		props.setSelected(cids)
		props.close()
	}

	return (
		<AppModal
			className={styles.SelectCommentsContent}
			isOpen={props.isOpen}
			onRequestClose={props.close}
			onAfterOpen={onOpen}
		>
			<div className={styles.ModalArrow}></div>
			<button onClick={selectShown}>Select Filtered</button>
			<button onClick={clear}>Clear</button>
			<p>Enter a list of CIDs:</p>
			<ContentEditable
				className={styles.ModalDialog}
				innerRef={listRef}
				html={list}
				onChange={changeList}
			/>
			<br />
			<button onClick={submit}>OK</button>
			<button onClick={submit}>Edit Selected</button>
			<button onClick={props.close}>Cancel</button>
		</AppModal>
	)
}
SelectCommentsModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	setSelected: PropTypes.func.isRequired,
	selected: PropTypes.array.isRequired,
	commentData: PropTypes.array.isRequired,
	commentDataMap: PropTypes.array.isRequired,
}

function ImportModal(props) {
	const fileInputRef = useRef();

	function submit() {
		props.dispatch(uploadResolutions(props.ballotId, fileInputRef.current.files[0]))
		props.close()
	}

	return (
		<AppModal
			isOpen={props.isOpen}
			onRequestClose={props.close}
		>
			<p>Import resolutions for {props.ballotId}. Current resolutions (if any) will be deleted.</p>
			<label>
			From file&nbsp;&nbsp;
				<input
					type='file'
					accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					ref={fileInputRef}
				/>
			</label>
			<br />
			<button onClick={submit}>OK</button>
			<button onClick={props.close}>Cancel</button>
		</AppModal>
	)
}
ImportModal.propTypes = {
	ballotId: PropTypes.string.isRequired,
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
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
				width: 36, flexGrow: 0, flexShrink: 0,
				cellRenderer: this.renderDataCellCheck},
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
				cellRenderer: this.renderDataCellEditing,
				isLast: true}
		];

		// List of filterable columns
    	const filterable = ['CommentID', 'CommenterName', 'MustSatisfy', 'Category', 'Clause', 'Page', 'Comment', 'ProposedChange', 'Assignee'];
		if (Object.keys(props.filters).length === 0) {
			var filters = {};
			filterable.forEach(dataKey => {filters[dataKey] = ''});
			this.props.dispatch(setCommentsFilters(filters));
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
			showImport: false,
			showSelectComments: false,

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
		if (ballotId && ballotId !== this.props.ballotId) {
			// Routed here with parameter ballotId specified, but not matching stored ballotId
			// Store the ballotId and get results for this ballotId
			this.props.dispatch(setBallotId(ballotId))
			this.props.dispatch(getComments(ballotId))
			this.rowHeightCache.clearAll()
		}
	}

	componentWillUnmount() {
		window.removeEventListener("resize", this.updateDimensions);
	}

	updateDimensions = () => {
		var header = document.getElementsByTagName('header')[0]
		var top = document.getElementById('top-row')
		if (header && top) {
			var height = window.innerHeight - header.offsetHeight - top.offsetHeight - 5
			var width = window.innerWidth - 1; //parent.offsetWidth
			//console.log('update ', width, height)
			this.setState({height, width})
		}
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
		var filter = filterValidate(dataKey, event.target.value)
		this.props.dispatch(setCommentsFilters({[dataKey]: filter}));
		this.rowHeightCache.clearAll()
	}

	rowGetter = ({index}) => {
		return this.props.commentData[this.props.commentDataMap[index]];
	}

	renderHeaderCellCheckbox = ({dataKey}) => {
		const {selectedComments, expandedComments} = this.state;
		const {commentDataMap, commentData} = this.props;
		const checked = allSelected(selectedComments, commentDataMap, commentData, 'CommentID');
		const indeterminate = !checked && selectedComments.length > 0
		const expanded = allSelected(expandedComments, commentDataMap, commentData, 'CommentID');
		return (
			<div>
				<div>{commentDataMap.length}</div>
				<input
					className={styles.checkbox}
					type="checkbox"
					title="Select All"
					checked={checked}
					ref={el => el && (el.indeterminate = indeterminate)}
					onChange={e => {
						this.setState({showSelectComments: true})
						//this.setState({selectedComments: toggleVisible(selectedComments, commentDataMap, commentData, 'CommentID')})
					}}
				/>
				<input
					className={styles.doubleExpandable}
					type="checkbox"
					title="Expand All"
					checked={expanded}
					onChange={e => {
						this.setState({expandedComments: toggleVisible(expandedComments, commentDataMap, commentData, 'CommentID')})
						this.clearAllCachedRowHeight()
					}}
				/>
			</div>
		)
	}

	renderDataCellCheckbox = ({rowIndex, rowData, dataKey}) => {
		const commentId = rowData.CommentID;
		const expanded = this.state.expandedComments.includes(commentId);
		return (
			<React.Fragment>
				<input
					className={styles.checkbox}
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
				<input
					className={styles.expandable}
					type="checkbox"
					title="Expand Row"
					checked={expanded}
					onChange={e => {
						let i = this.state.expandedComments.indexOf(commentId);
						this.setState({
							expandedComments: update(this.state.expandedComments, (i > -1)? {$splice: [[i, 1]]}: {$push: [commentId]})
						})
						this.clearCachedRowHeight(rowIndex)
					}}
				/>
			</React.Fragment>
        );
	}

	renderDataCellCheck = ({rowIndex, rowData, dataKey}) => {
		return rowData[dataKey]? '\u2714': ''
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
				type='search'
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
		var cell = columnData.cellRenderer? columnData.cellRenderer(props): <div>{html_preserve_newline(rowData[dataKey])}</div>;
		if (!cell) {
			cell = <div />
		}
		if (expanded) {
			return (
				<CellMeasurer
					cache={this.rowHeightCache}
					rowIndex={rowIndex}
					columnIndex={columnIndex}
					parent={parent}
					key={dataKey}
				>
					{cell}
				</CellMeasurer>
			)
		}
		else {
			this.rowHeightCache.set(rowIndex, columnIndex, undefined, 0); // force to minHeight
			return cell;
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
		const ballotId = this.props.match.params.ballotId;
		if ((!ballotId && this.props.ballotId) ||
			(ballotId && this.props.ballotId && ballotId !== this.props.ballotId)) {
			// Routed here with parameter ballotId unspecified, but we have a ballotId stored
			// Redirect to the stored ballotId
			// Or the ballotId has changed
			console.log('render ', ballotId, this.props.ballotId)
			return <Redirect push={!ballotId} to={`/Comments/${this.props.ballotId}`} />
		}
		if (this.state.showCommentDetail) {
			return <Redirect push to={this.props.location.pathname + `/${this.props.commentData[this.state.editIndex].CommentID}`} />
		}
		return (
			<div id='Comments'>
				<div id='top-row'>
        			<BallotSelector onBallotSelected={this.ballotSelected} />
        			<button onClick={e => this.setState({showImport: true})}>Upload Resolutions</button>
        			<ColumnSelector list={this.columns} toggleItem={this.toggleColumnVisible} isChecked={this.isColumnVisible}/>
				</div>

				{this.renderTable()}

				<ImportModal
					ballotId={this.props.ballotId}
					isOpen={this.state.showImport}
					close={() => this.setState({showImport: false})}
					dispatch={this.props.dispatch}
					appElement={document.querySelector('#Comments')}
				/>

				<SelectCommentsModal
					isOpen={this.state.showSelectComments}
					close={() => this.setState({showSelectComments: false})}
					setSelected={cids => this.setState({selectedComments: cids})}
					selected={this.state.selectedComments}
					commentData={this.props.commentData}
					commentDataMap={this.props.commentDataMap}
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