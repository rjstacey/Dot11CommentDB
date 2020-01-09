import PropTypes from 'prop-types';
import React, {useRef, useState, useEffect} from 'react';
import {useHistory, useParams} from 'react-router-dom'
import update from 'immutability-helper';
import {connect} from 'react-redux';
import BallotSelector from './BallotSelector';
import ColumnSelector from './ColumnSelector';
import ContentEditable from './ContentEditable';
import AppModal from './AppModal';
import AppTable from './AppTable';
import {ActionButton} from './Icons';
import {sortClick, filterValidate} from './filter';
import {setCommentsSort, setCommentsFilters, getComments, uploadResolutions} from './actions/comments';
import {setBallotId} from './actions/ballots';
import styles from './Comments.css';


function SelectCommentsModal(props) {
	const [list, setList] = useState('');
	const listRef = useRef(null);

	function onOpen() {
		const {commentData, selected} = props
		const cidValid = cid => commentData.filter(row => row.CommentID === cid).length > 0
		const list = selected.map(cid => cidValid(cid)? cid.toString(): '<span style="color: red">' + cid + '</span>').join(', ')
		setList(list)
	}

	function changeList(e) {
		const {commentData} = props
		const cidValid = cid => commentData.filter(row => row.CommentID === cid).length > 0
		const listArr = listRef.current.innerText.match(/\d+[^\d]*/g)
		if (listArr) {
			var list = ''
			listArr.forEach(cidStr => {
				const m = cidStr.match(/(\d+)(.*)/)		// split number from separator
				const cid = m[1]
				const sep = m[2]
				console.log(m)
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
		const listArr = listRef.current.innerText.match(/\d+/g)	// split out numbers
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
				ref={listRef}
				value={list}
				onInput={changeList}
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

/*
 * The data cell rendering functions are pure functions (dependent only on input parameters)
 */
function renderDataCellCheck({rowIndex, rowData, dataKey}) {
	return rowData[dataKey]? '\u2714': ''
}

function renderDataCellAssignee({rowData}) {
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

function renderDataCellResolution({rowData}) {
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

function renderDataCellEditing({rowData}) {
	return rowData.EditStatus? <React.Fragment><b>{rowData.EditStatus}:</b> {rowData.EditNotes}</React.Fragment>: rowData.EditNotes
}

function renderDataCellCommentID({rowData}) {
	const {CommentID, ResolutionCount} = rowData
	return ResolutionCount > 1? CommentID.toFixed(1): CommentID
}

const allColumns = [
	{dataKey: 'CommentID', label: 'CID',
		sortable: true,
		filterable: true,
		width: 60, flexGrow: 0, flexShrink: 0,
		cellRenderer: renderDataCellCommentID},
	{dataKey: 'CommenterName', label: 'Commenter',
		sortable: true,
		filterable: true,
		width: 100, flexGrow: 0, flexShrink: 0},
	{dataKey: 'MustSatisfy', label: 'MS',
		sortable: true,
		filterable: true,
		width: 36, flexGrow: 0, flexShrink: 0,
		cellRenderer: renderDataCellCheck},
	{dataKey: 'Category', label: 'Cat',
		sortable: true,
		filterable: true,
		width: 36, flexGrow: 0, flexShrink: 0},
	{dataKey: 'Clause', label: 'Clause',
		sortable: true,
		filterable: true,
		width: 100, flexGrow: 0, flexShrink: 0},
	{dataKey: 'Page', label: 'Page',
		sortable: true,
		filterable: true,
		width: 80, flexGrow: 0, flexShrink: 0},
	{dataKey: 'Comment', label: 'Comment',
		sortable: true,
		filterable: true,
		width: 400, flexGrow: 1, flexShrink: 1}, 
	{dataKey: 'ProposedChange', label: 'Proposed Change',
		sortable: true,
		filterable: true,
		width: 400, flexGrow: 1, flexShrink: 1},
	{dataKey: 'AssigneeName', label: 'Assignee',
		sortable: true,
		filterable: true,
		width: 150, flexGrow: 1, flexShrink: 1/*,
		cellRenderer: renderDataCellAssignee*/},
	{dataKey: 'Resolution', label: 'Resolution',
		sortable: false,
		filterable: false,
		width: 400, flexGrow: 1, flexShrink: 1/*,
		cellRenderer: renderDataCellResolution*/},
	{dataKey: 'Editing', label: 'Editing',
		sortable: false,
		filterable: false,
		width: 300, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderDataCellEditing,
		isLast: true}
];

function Comments(props) {
	const history = useHistory()
	const {ballotId} = useParams()
	const {commentData, commentDataMap, dispatch} = props;

	const [columns, setColumns] = useState(allColumns)
	const [showImport, setShowImport] = useState(false)
	const [showSelected, setShowSelected] = useState(false)
	const [selected, setSelected] = useState([])

	const [tableSize, setTableSize] = useState({
		height: 400,
		width: 300,
	});

	function updateTableSize() {
		const headerEl = document.getElementsByTagName('header')[0];
		const topRowEl = document.getElementById('top-row');
		const headerHeight = headerEl.offsetHeight + topRowEl.offsetHeight;

		const height = window.innerHeight - headerHeight - 5;
		const width = window.innerWidth - 1;

		if (height !== tableSize.height || width !== tableSize.width) {
			setTableSize({height, width});
		}
	}

	useEffect(() => {
		updateTableSize()
		window.addEventListener("resize", updateTableSize);
		return () => {
			window.removeEventListener("resize", updateTableSize);
		}
	}, [])

	useEffect(() => {
		if (Object.keys(props.filters).length === 0) {
			var filters = {};
			for (let col of allColumns) {
				if (col.filterable) {
					filters[col.dataKey] = filterValidate(col.dataKey, '')
				}
			}
			dispatch(setCommentsFilters(filters));
		}
	}, [])

	console.log(commentData)

	useEffect(() => {
		if (ballotId) {
			if (ballotId !== props.ballotId) {
				// Routed here with parameter ballotId specified, but not matching stored ballotId
				// Store the ballotId and get results for this ballotId
				dispatch(setBallotId(ballotId))
				dispatch(getComments(ballotId)).then(console.log(commentData))
			}
			else if (!props.getComments && (!props.commentDataValid || props.commentBallotId !== ballotId)) {
				dispatch(getComments(ballotId)).then(console.log(commentData))
			}
		}
		else if (props.ballotId) {
			history.replace(`/Comments/${props.ballotId}`)
		}
	}, [ballotId, props.ballotId])

	function refresh() {
		dispatch(getComments(ballotId))
			.then(console.log(commentData))
	}

	function toggleColumnVisible(dataKey) {
		const i = columns.findIndex(col => col.dataKey === dataKey)
		if (i > -1) {
			setColumns(update(columns, {$splice: [[i, 1]]}))
		}
		else {
			const newColumns = allColumns.filter(col1 =>
				col1.dataKey === dataKey || columns.findIndex(col2 => col2.dataKey === col1.dataKey) > -1
			)
			setColumns(newColumns)
		}
	}

	function isColumnVisible(dataKey) {
		return columns.findIndex(col => col.dataKey === dataKey) > -1
	}

	function ballotSelected(ballotId) {
		// Redirect to page with selected ballot
		history.push(`/Comments/${ballotId}`)
		dispatch(getComments(ballotId));
	}

	function sortChange(event, dataKey) {
		const {sortBy, sortDirection} = sortClick(event, dataKey, props.sortBy, props.sortDirection);
		dispatch(setCommentsSort(sortBy, sortDirection));
	}

	function filterChange(event, dataKey) {
		var filter = filterValidate(dataKey, event.target.value)
		dispatch(setCommentsFilters({[dataKey]: filter}));
	}

	function editComment({event, index, rowData}) {
		const {CommentID, ResolutionCount} = rowData
		const cidStr = CommentID.toFixed(ResolutionCount > 1? 1: 0)
		history.push(props.location.pathname + '?CID=' + cidStr)
	}

	function editComments() {
		history.push(props.location.pathname + `?CIDs=${selected.join(',')}`)
	}

	function rowGetter({index}) {
		const c = commentData[props.commentDataMap[index]];
		if (index > 0 && Math.floor(commentData[commentDataMap[index - 1]].CommentID) === Math.floor(c.CommentID)) {
			// Previous row holds the same comment
			return {
				...c,
				CommenterName: '',
				MustSatisfy: '',
				Category: '',
				Clause: '',
				Page: '',
				Comment: '',
				ProposedChange: ''
			}
		}
		return c;
	}

	return (
		<div id='Comments'>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', width: tableSize.width, justifyContent: 'space-between'}}>
				<span>
    				<BallotSelector onBallotSelected={ballotSelected} />
    			</span>
    			<span>
    				<ActionButton name='group' title='Group Selected' />
					<ActionButton name='assignment' title='Assign Selected' />
					<ActionButton name='edit' title='Edit Selected' onClick={editComments} />
    			</span>
    			<span>
    				<ActionButton name='upload' title='Upload Resolutions' onClick={e => setShowImport(true)} />
    				<ColumnSelector list={allColumns} toggleItem={toggleColumnVisible} isChecked={isColumnVisible}/>
    				<ActionButton name='refresh' title='Refresh' onClick={refresh} />
    			</span>
			</div>

			<AppTable
				hasRowSelector={true}
				hasRowExpander={true}
				columns={columns}
				rowHeight={54}
				height={tableSize.height}
				width={tableSize.width}
				loading={props.getComments}
				editRow={editComment}
				filters={props.filters}
				sortBy={props.sortBy}
				sortDirection={props.sortDirection}
				sortChange={sortChange}
				filterChange={filterChange}
				showSelected={() => setShowSelected(true)}
				setSelected={(cids) => setSelected(cids)}
				selected={selected}
				data={props.commentData}
				dataMap={props.commentDataMap}
				primaryDataKey={'CommentID'}
				rowGetter={rowGetter}
			/>

			<ImportModal
				ballotId={props.ballotId}
				isOpen={showImport}
				close={() => setShowImport(false)}
				dispatch={props.dispatch}
			/>

			<SelectCommentsModal
				isOpen={showSelected}
				close={() => setShowSelected(false)}
				setSelected={cids => setSelected(cids)}
				selected={selected}
				commentData={props.commentData}
				commentDataMap={props.commentDataMap}
			/>
		</div>
	)
}
Comments.propTypes = {
	filters: PropTypes.object.isRequired,
	sortBy: PropTypes.array.isRequired,
	sortDirection: PropTypes.object.isRequired,
	ballotId: PropTypes.string.isRequired,
	commentBallotId: PropTypes.string.isRequired,
	commentDataValid: PropTypes.bool.isRequired,
	commentData: PropTypes.array.isRequired,
	commentDataMap: PropTypes.array.isRequired,
	getComments: PropTypes.bool.isRequired,
	dispatch: PropTypes.func.isRequired
}

function mapStateToProps(state) {
	const {comments, ballots} = state
	return {
		filters: comments.filters,
		sortBy: comments.sortBy,
		sortDirection: comments.sortDirection,
		ballotId: ballots.ballotId,
		commentBallotId: comments.ballotId,
		commentDataValid: comments.commentDataValid,
		commentData: comments.commentData,
		commentDataMap: comments.commentDataMap,
		getComments: comments.getComments
	}
}
export default connect(mapStateToProps)(Comments);