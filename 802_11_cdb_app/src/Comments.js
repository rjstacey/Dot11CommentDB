import PropTypes from 'prop-types'
import React, {useRef, useState, useEffect} from 'react'
import {useHistory, useParams} from 'react-router-dom'
import update from 'immutability-helper'
import {connect} from 'react-redux'
import BallotSelector from './BallotSelector'
import ColumnSelector from './ColumnSelector'
import ContentEditable from './ContentEditable'
import AppModal from './AppModal'
import AppTable, {renderFilter, renderLabel} from './AppTable'
import {ActionButton} from './Icons'
import {sortClick, filterValidate} from './filter'
import {setCommentsSort, setCommentsFilters, getComments, uploadResolutions} from './actions/comments'
import {setBallotId} from './actions/ballots'
import {saveAs} from 'file-saver'
import styles from './Comments.css'
import editorStyles from './ResolutionEditor.css'
var axios = require('axios')


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
	const [algo, setAlgo] = useState('cid')
	const [matchAll, setMatchAll] = useState(false)

	function submit() {
		props.dispatch(uploadResolutions(props.ballotId, algo, matchAll, fileInputRef.current.files[0]))
		props.close()
	}

	function setField(e) {
		setAlgo(e.target.value)
	}

	const algoFields = [
		{value: 'elimination', text: 'Successive elimination'},
		{value: 'perfect', text: 'Multiple fields'},
		{value: 'cid', text: 'CID'}
	]

	return (
		<AppModal
			isOpen={props.isOpen}
			onRequestClose={props.close}
		>
			<p>Import resolutions for {props.ballotId}. Current resolutions (if any) will be deleted.</p>
			<p>
				<label>Match algorithm:</label><br />
				{algoFields.map(a => 
					<React.Fragment key={a.value}>
						<input type='radio' name='algo' value={a.value} checked={algo === a.value} onChange={setField} />
						<label>&nbsp;{a.text}</label><br />
					</React.Fragment>
				)}
			</p>
			<p>
				<label>
				<input type='checkbox' name='matchAll' checked={matchAll} onChange={e => setMatchAll(!matchAll)} />
				&nbsp;Update only if all comments match
				</label>
			</p>
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

function ExportModal(props) {
	const {ballotId} = props
	const [forMyProject, setForMyProject] = useState(false)

	async function submit(e) {
		try {
			const params = {BallotID: props.ballotId}
			const response = await axios.get('/comments/myProjectExport', {params, responseType: 'blob'})
			if (response.status === 200) {
				const filename = ballotId + '_comments.xlsx'
				saveAs(response.data, filename)
			}
			props.close()
		}
		catch(error) {
			console.log(error)
			props.close()
		}
	}

	return (
		<AppModal
			isOpen={props.isOpen}
			onRequestClose={props.close}
		>
			<p>Export comments for {props.ballotId}:</p>
			<p>
				<label>
					<input
						type="radio"
						title={ballotId}
						checked={forMyProject}
						onChange={e => setForMyProject(!forMyProject)}
					/>
					Resolved comments for MyProject upload
				</label>
			</p>
			<p>
				<label>
					<input
						type="radio"
						title={ballotId}
						checked={!forMyProject}
						onChange={e => setForMyProject(forMyProject)}
					/>
					All comments for mentor upload
				</label>
			</p>
			<button onClick={submit}>OK</button>
			<button onClick={props.close}>Cancel</button>
		</AppModal>
	)
}
ExportModal.propTypes = {
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

function renderDataCellEditing({rowData}) {
	return rowData.EditStatus? <React.Fragment><b>{rowData.EditStatus}:</b> {rowData.EditNotes}</React.Fragment>: rowData.EditNotes
}

function renderDataCellCommentID({rowData}) {
	const {CommentID, ResolutionCount} = rowData
	return CommentID.toFixed(ResolutionCount > 1? 1: 0)
}

function renderDataCellResolution({rowData}) {
	const resnColor = {
		'A': 'green',
		'V': 'orange',
		'J': 'red'
	}
	return (
		<div
			className={editorStyles.editor}
			style={{backgroundColor: resnColor[rowData.ResnStatus]}}
			dangerouslySetInnerHTML={{__html: rowData.Resolution}}
		/>
	)
}

function renderHeaderCellStacked1({columnData}) {
	const showFilter = columnData.filters.hasOwnProperty('CommentID')
	const {sortBy, sortDirection, setSort} = columnData

	return (
		<React.Fragment>
		<div style={{display: 'flex', flexDirection: 'row'}} >
			<div style={{display: 'flex', flexDirection: 'column', width: 80}} >
				{renderLabel({dataKey: 'CommentID', label: 'CID', sortable: true, sortBy, sortDirection, setSort})}
				{showFilter && renderFilter({dataKey: 'CommentID', filter: columnData.filters['CommentID'], setFilter: columnData.setFilter})}
			</div>
			<div style={{display: 'flex', flexDirection: 'column', width: 40, marginLeft: 25}} >
				{renderLabel({dataKey: 'Category', label: 'Cat', sortable: true, sortBy, sortDirection, setSort})}
				{showFilter && renderFilter({dataKey: 'Category', filter: columnData.filters['Category'], setFilter: columnData.setFilter})}
			</div>
			<div style={{display: 'flex', flexDirection: 'column', width: 25, marginLeft: 15}} >
				{renderLabel({dataKey: 'MustSatisfy', label: 'MS', sortable: true, sortBy, sortDirection, setSort})}
				{showFilter && renderFilter({dataKey: 'MustSatisfy', filter: columnData.filters['MustSatisfy'], setFilter: columnData.setFilter})}
			</div>
		</div>
		<div style={{display: 'flex', flexDirection: 'row'}} >
			<div style={{display: 'flex', flexDirection: 'column', width: 100}} >
				{renderLabel({dataKey: 'Clause', label: 'Clause', sortable: true, sortBy, sortDirection, setSort, width: 100})}
				{showFilter && renderFilter({dataKey: 'Clause', filter: columnData.filters['Clause'], setFilter: columnData.setFilter})}
			</div>
			<div style={{display: 'flex', flexDirection: 'column', width: 80, marginLeft: 5}} >
				{renderLabel({dataKey: 'Page', label: 'Page', sortable: true, sortBy, sortDirection, setSort, width: 80})}
				{showFilter && renderFilter({dataKey: 'Page', filter: columnData.filters['Page'], setFilter: columnData.setFilter})}
			</div>
		</div>
		<div style={{display: 'flex', flexDirection: 'row'}} >
			<div style={{display: 'flex', flexDirection: 'column', width: 100}} >
				{renderLabel({dataKey: 'CommenterName', label: 'Commenter', sortable: true, sortBy, sortDirection, setSort, width: 100})}
				{showFilter && renderFilter({dataKey: 'CommenterName', filter: columnData.filters['CommenterName'], setFilter: columnData.setFilter})}
			</div>
			<div style={{display: 'flex', flexDirection: 'column', width: 80, marginLeft: 5}} >
				{renderLabel({dataKey: 'Vote', label: 'Vote', sortable: true, sortBy, sortDirection, setSort})}
				{showFilter && renderFilter({dataKey: 'Vote', filter: columnData.filters['Vote'], setFilter: columnData.setFilter})}
			</div>
		</div>
		</React.Fragment>
	)
}

function renderDataCellStacked1({rowData}) {
	return (
		<div style={{display: 'flex', flexDirection: 'column'}}>
			<div>
				<div style={{display: 'inline-block', width: 80, fontWeight: 'bold'}}>{renderDataCellCommentID({rowData})}</div>
				<div style={{display: 'inline-block', width: 40, marginLeft: 25}}>{rowData['Category']}</div>
				<div style={{display: 'inline-block', width: 25, marginLeft: 15}}>{rowData['MustSatisfy']? '\u2714': ''}</div>
			</div>
			<div>
				<div style={{display: 'inline-block', width: '100px', fontStyle: 'italic'}}>{rowData['Clause']}</div>
				<div style={{display: 'inline-block', marginLeft: '5px'}}>{rowData['Page']}</div>
			</div>
			<div>{rowData['CommenterName'] + ' (' + rowData['Vote'] + ')'}</div>
		</div>
		)
}

function renderHeaderCellStacked2({columnData}) {
	const showFilter = columnData.filters.hasOwnProperty('CommentID')
	const {sortBy, sortDirection, setSort} = columnData

	return (
		<React.Fragment>
			<div>
				{renderLabel({dataKey: 'CommentGroup', label: 'Comment Group', sortable: true, sortBy, sortDirection, setSort})}
				{showFilter && renderFilter({dataKey: 'CommentGroup', filter: columnData.filters['CommentGroup'], setFilter: columnData.setFilter})}
			</div>
			<div>
				{renderLabel({dataKey: 'AssigneeName', label: 'Assignee', sortable: true, sortBy, sortDirection, setSort})}
				{showFilter && renderFilter({dataKey: 'AssigneeName', filter: columnData.filters['AssigneeName'], setFilter: columnData.setFilter})}
			</div>
			<div>
				{renderLabel({dataKey: 'Submission', label: 'Submission', sortable: true, sortBy, sortDirection, setSort})}
				{showFilter && renderFilter({dataKey: 'Submission', filter: columnData.filters['Submission'], setFilter: columnData.setFilter})}
			</div>
		</React.Fragment>
	)
}
function renderDataCellStacked2({rowData}) {
	return (
		<div style={{display: 'flex', flexDirection: 'column'}}>
			<div>{rowData['CommentGroup'] || 'None'}</div>
			<div>{rowData['AssigneeName'] || 'Not Assigned'}</div>
			<div>{rowData['Submission'] || 'None'}</div>
		</div>
		)
}

const flatColumns = [
	{dataKey: 'CommentID', label: 'CID',
		sortable: true,
		filterable: true,
		width: 60, flexGrow: 0, flexShrink: 0,
		cellRenderer: renderDataCellCommentID},
	{dataKey: 'CommenterName', label: 'Commenter',
		sortable: true,
		filterable: true,
		width: 100, flexGrow: 1, flexShrink: 1},
	{dataKey: 'Vote', label: 'Vote',
		sortable: true,
		filterable: true,
		width: 50, flexGrow: 1, flexShrink: 1},
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
	{dataKey: 'CommentGroup', label: 'Comment Group',
		sortable: true,
		filterable: true,
		width: 150, flexGrow: 1, flexShrink: 1},
	{dataKey: 'AssigneeName', label: 'Assignee',
		sortable: true,
		filterable: true,
		width: 150, flexGrow: 1, flexShrink: 1},
	{dataKey: 'Submission', label: 'Submission',
		sortable: true,
		filterable: true,
		width: 150, flexGrow: 1, flexShrink: 1},
	{dataKey: 'Resolution', label: 'Resolution',
		sortable: false,
		filterable: false,
		width: 400, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderDataCellResolution},
	{dataKey: 'Editing', label: 'Editing',
		sortable: false,
		filterable: false,
		width: 300, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderDataCellEditing,
		isLast: true}
];

const stackedColumns = [
	{dataKey: 'Stack1', label: 'CID/Cat/MS/...',
		sortable: false,
		filterable: false,
		width: 200, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCellStacked1,
		cellRenderer: renderDataCellStacked1},
	{dataKey: 'Stack2', label: 'Comment Group/Assign...',
		sortable: false,
		filterable: false,
		width: 250, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCellStacked2,
		cellRenderer: renderDataCellStacked2},
	{dataKey: 'Comment', label: 'Comment',
		sortable: true,
		filterable: true,
		width: 400, flexGrow: 1, flexShrink: 1}, 
	{dataKey: 'ProposedChange', label: 'Proposed Change',
		sortable: true,
		filterable: true,
		width: 400, flexGrow: 1, flexShrink: 1},
	{dataKey: 'Resolution', label: 'Resolution',
		sortable: false,
		filterable: false,
		width: 400, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderDataCellResolution},
	{dataKey: 'Editing', label: 'Editing',
		sortable: false,
		filterable: false,
		width: 300, flexGrow: 1, flexShrink: 1,
		cellRenderer: renderDataCellEditing,
		isLast: true}
];

const allFilters = [
	'CommentID', 'CommenterName', 'Vote', 'MustSatisfy', 'Category', 'Clause', 'Page',
	'Comment', 'ProposedChange', 'CommentGroup', 'AssigneeName', 'Submission',
	'Resolution'
]

function Comments(props) {
	const history = useHistory()
	const {ballotId} = useParams()
	const {commentData, commentDataMap, dispatch} = props;

	const [showImport, setShowImport] = useState(false)
	const [showExport, setShowExport] = useState(false)
	const [showSelected, setShowSelected] = useState(false)
	const [selected, setSelected] = useState([])

	const [columnVisibility, setColumnVisibility] = useState(() => {
		const v1 = stackedColumns.reduce((o, c) => {return {...o, [c.dataKey]: true}}, {})
		const v2 = flatColumns.reduce((o, c) => {return {...o, [c.dataKey]: true}}, {})
		return {...v1, ...v2}
	})
	const [isStacked, setStacked] = useState(true)

	const [tableSize, setTableSize] = useState({
		height: 400,
		width: 300,
	});

	const columns = (isStacked? stackedColumns: flatColumns).filter(c => !columnVisibility.hasOwnProperty(c.dataKey) || columnVisibility[c.dataKey])

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
			for (let dataKey of allFilters) {
				filters[dataKey] = filterValidate(dataKey, '')
			}
			dispatch(setCommentsFilters(filters));
		}
	}, [])

	useEffect(() => {
		if (ballotId) {
			if (ballotId !== props.ballotId) {
				// Routed here with parameter ballotId specified, but not matching stored ballotId
				// Store the ballotId and get results for this ballotId
				console.log(ballotId, props.ballotId)
				dispatch(setBallotId(ballotId))
				dispatch(getComments(ballotId))
			}
			else if (!props.getComments && (!props.commentDataValid || props.commentBallotId !== ballotId)) {
				dispatch(getComments(ballotId))
			}
		}
		else if (props.ballotId) {
			history.replace(`/Comments/${props.ballotId}`)
		}
	}, [ballotId])

	function refresh() {
		dispatch(getComments(ballotId))
	}

	function toggleColumns() {
		setStacked(!isStacked)
	}

	function toggleColumnVisible(dataKey) {
		setColumnVisibility({...columnVisibility, [dataKey]: !columnVisibility[dataKey]})
	}

	function isColumnVisible(dataKey) {
		return columnVisibility[dataKey]
	}

	function ballotSelected(ballotId) {
		// Redirect to page with selected ballot
		history.push(`/Comments/${ballotId}`)
		dispatch(getComments(ballotId));
	}

	function setSort(dataKey, event) {
		const {sortBy, sortDirection} = sortClick(event, dataKey, props.sortBy, props.sortDirection)
		dispatch(setCommentsSort(sortBy, sortDirection))
	}

	function setFilter(dataKey, value) {
		var filter = filterValidate(dataKey, value)
		dispatch(setCommentsFilters({[dataKey]: filter}))
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
    				<ActionButton name='export' title='Export to file' onClick={e => setShowExport(true)} />
    				<ActionButton name='upload' title='Upload Resolutions' onClick={e => setShowImport(true)} />
    				<ColumnSelector
    					list={isStacked? stackedColumns: flatColumns}
    					isStacked={isStacked}
    					toggleColumns={toggleColumns}
    					toggleItem={toggleColumnVisible}
    					isChecked={isColumnVisible}
    				/>
    				<ActionButton name='refresh' title='Refresh' onClick={refresh} />
    			</span>
			</div>

			<AppTable
				headerHeight={isStacked? 116: 44}
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
				setSort={setSort}
				setFilter={setFilter}
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

			<ExportModal
				ballotId={props.ballotId}
				isOpen={showExport}
				close={() => setShowExport(false)}
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