import PropTypes from 'prop-types'
import React from 'react'
import {useHistory, useParams, useLocation} from 'react-router-dom'
import {connect} from 'react-redux'
import {Container, Row, Col} from 'react-grid-system'
//import BaseTable, { AutoResizer } from 'react-base-table'
//import 'react-base-table/styles.css'
import AutoSizer from 'react-virtualized-auto-sizer'
import BallotSelector from '../ballots/BallotSelector'
import ColumnSelector from './ColumnSelector'
import CommentsFilter from './CommentsFilter'
import AppModal from '../modals/AppModal'
import AppTable, {ColumnLabel} from '../table/AppTable'
import {ActionButton, Checkbox} from '../general/Icons'
import {setCommentsSort, setCommentsFilter, setCommentsSelected, toggleCommentsSelected, setCommentsExpanded, getComments, uploadResolutions} from '../actions/comments'
import {setBallotId} from '../actions/ballots'
import {setError} from '../actions/error'
import fetcher from '../lib/fetcher'
import {editorCss} from './ResolutionEditor'
import {CommentIdSelector} from './CommentIdList'
import CommentDetail from './CommentDetail'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'


function _UploadCommentsModal({isOpen, close, ballotId, upload}) {
	const fileInputRef = React.useRef()
	const [algo, setAlgo] = React.useState('cid')
	const [matchAll, setMatchAll] = React.useState(false)

	function submit() {
		upload(ballotId, algo, matchAll, fileInputRef.current.files[0])
		close()
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
			isOpen={isOpen}
			onRequestClose={close}
		>
			<p>Import resolutions for {ballotId}. Current resolutions (if any) will be deleted.</p>
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
			<button onClick={close}>Cancel</button>
		</AppModal>
	)
}

_UploadCommentsModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	ballotId: PropTypes.string.isRequired,
	upload: PropTypes.func.isRequired
}

const UploadCommentsModal = connect(
	null,
	(dispatch, ownProps) => {
		return {
			upload: (...args) => dispatch(uploadResolutions(...args))
		}
	} 
)(_UploadCommentsModal)

function _ExportModal({isOpen, close, ballotId, setError}) {
	const [forMyProject, setForMyProject] = React.useState(false)

	async function submit(e) {
		try {
			await fetcher.getFile('/exportComments/myProject', {BallotID: ballotId})
		}
		catch(error) {
			setError(`Unable to export comments for ${ballotId}`, error)
		}
		close()
	}

	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<p>Export comments for {ballotId}:</p>
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
			<button onClick={close}>Cancel</button>
		</AppModal>
	)
}

_ExportModal.propTypes = {
	ballotId: PropTypes.string.isRequired,
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
}

const ExportModal = connect(
	null,
	(dispatch, ownProps) => {
		return {
			setError: (...args) => dispatch(setError(...args))
		}
	} 
)(_ExportModal)

/*
 * The data cell rendering functions are pure functions (dependent only on input parameters)
 */
function renderDataCellCheck({rowData, dataKey}) {
	return rowData[dataKey]? '\u2714': ''
}

function renderDataCellEditing({rowData}) {
	return rowData.EditStatus? <React.Fragment><b>{rowData.EditStatus}:</b> {rowData.EditNotes}</React.Fragment>: rowData.EditNotes
}

function renderDataCellResolution({rowData}) {
	const resnColor = {
		'A': '#d3ecd3',
		'V': '#f9ecb9',
		'J': '#f3c0c0'
	}
	return (
		<div
			css={editorCss}
			style={{backgroundColor: resnColor[rowData.ResnStatus]}}
			dangerouslySetInnerHTML={{__html: rowData.Resolution}}
		/>
	)
}

function commentsSortStateMap(state, ownProps) {
	return {
		sort: state.comments.sort
	}
}
function commentsSortDispatchMap(dispatch, ownProps) {
	return {
		setSort: (dataKey, event) => dispatch(setCommentsSort(event, dataKey))
	}
}
const ConnectedColumnLabel = connect(commentsSortStateMap, commentsSortDispatchMap)(ColumnLabel)

const rowCss = css`
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap`

const elementCss = (width, paddingRight=0) => css`
	box-sizing: border-box;
	width: ${width}px;
	padding-right: ${paddingRight}px`

function renderHeaderCellStacked1() {

	return (
		<React.Fragment>
			<div css={rowCss}>
				<ConnectedColumnLabel css={elementCss(100, 5)} dataKey='CID' label='CID' />
				<ConnectedColumnLabel css={elementCss(40, 5)} dataKey='Category' label='Cat' />
				<ConnectedColumnLabel css={elementCss(32)} dataKey='MustSatisfy' label='MS' />
			</div>
			<div css={rowCss}>
				<ConnectedColumnLabel css={elementCss(100, 5)} dataKey='Clause' label='Clause' />
				<ConnectedColumnLabel css={elementCss(50, 0)} dataKey='Page' label='Page' />
			</div>
			<div css={rowCss}>
				<ConnectedColumnLabel css={elementCss(100, 5)} dataKey='CommenterName' label='Commenter' />
				<ConnectedColumnLabel css={elementCss(50, 0)} dataKey='Vote' label='Vote' />
			</div>
		</React.Fragment>
	)
}

function renderDataCellStacked1({rowData}) {
	const commenterStr = rowData['CommenterName'] + (rowData['Vote']? ' (' + rowData['Vote'] + ')': '')
	return (
		<React.Fragment>
			<div css={rowCss}>
				<div css={[elementCss(100,5), {fontWeight: 'bold'}]}>{rowData['CID']}</div>
				<div css={elementCss(40, 5)}>{rowData['Category']}</div>
				<div css={elementCss(30)}>{rowData['MustSatisfy']? '\u2714': ''}</div>
			</div>
			<div css={rowCss}>
				<div css={[elementCss(100, 5), {fontStyle: 'italic'}]}>{rowData['Clause']}</div>
				<div css={elementCss(50)}>{rowData['Page']}</div>
			</div>
			<div css={rowCss}>{commenterStr}<span role='img' title='Approve'>&#128077;&#128078;</span></div>
		</React.Fragment>
	)
}

function renderHeaderCellStacked2() {
	const cols = [
		{dataKey: 'AssigneeName', label: 'Assignee'},
		{dataKey: 'Submission', label: 'Submission'}
	]
	return cols.map(c => (<ConnectedColumnLabel key={c.dataKey} dataKey={c.dataKey} label={c.label} />))
}

function renderDataCellStacked2({rowData}) {
	return (
		<React.Fragment>
			<div>{rowData['AssigneeName'] || 'Not Assigned'}</div>
			<div>{rowData['Submission'] || 'None'}</div>
		</React.Fragment>
	)
}

function renderHeaderCell({dataKey, label, column}) {
	if (dataKey) {
		return <ConnectedColumnLabel dataKey={dataKey} label={label} />
	}
	else {
		return <ConnectedColumnLabel key={column.key} dataKey={column.dataKey} label={column.label} />
	}
}

function renderCommentsSelector(props) {
	return <CommentIdSelector focusOnMount {...props} />
}

const renderTextBlock = ({rowData, column}) => {
	const cellData = rowData[column.dataKey]
	return typeof cellData === 'string'?
		cellData.split('\n').map((line, i, arr) => {
				const lline = <span key={i}>{line}</span>
				if (i === arr.length - 1) {
					return lline
				} else {
					return [lline, <br key={i + 'br'} />]
			}
		}):
		cellData
}

const renderRowSelector = ({rowData, column}) => (
	<Checkbox
		key='selector'
		title="Select Row"
		checked={rowData.Selected}
		onChange={e => column.toggleSelected([rowData['CID']])}
	/>
)

const flatColumns = [
	{dataKey: 'CID',			label: 'CID',			width: 60,
		flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell},
	{dataKey: 'CommenterName',	label: 'Commenter',		width: 100,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{dataKey: 'Vote',			label: 'Vote',			width: 50,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{dataKey: 'MustSatisfy',	label: 'MS',			width: 36,
		flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDataCellCheck},
	{dataKey: 'Category',		label: 'Cat',			width: 36,
		flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell},
	{dataKey: 'Clause',			label: 'Clause',		width: 100,
		flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell},
	{dataKey: 'Page',			label: 'Page',			width: 80,
		flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell},
	{dataKey: 'Comment',		label: 'Comment',		width: 400,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderTextBlock}, 
	{dataKey: 'ProposedChange',	label: 'Proposed Change',width: 400,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderTextBlock},
	{dataKey: 'CommentGroup',	label: 'Comment Group',	width: 150,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{dataKey: 'AssigneeName',	label: 'Assignee',		width: 150,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{dataKey: 'Submission',		label: 'Submission',	width: 150,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{dataKey: 'Status',			label: 'Status',		width: 150,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{dataKey: 'ApprovedByMotion',	label: 'Motion Number',	width: 80,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{dataKey: 'Resolution',		label: 'Resolution',	width: 400,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDataCellResolution},
	{dataKey: 'Editing',		label: 'Editing',		width: 300,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDataCellEditing,
		isLast: true}
]

const stackedColumns = [
	{key: 'Stack1', dataKey: 'Stack1',			label: 'CID/Cat/MS/...',width: 200,
		flexGrow: 0, flexShrink: 0, resizable: true,
		headerRenderer: renderHeaderCellStacked1,
		cellRenderer: renderDataCellStacked1},
	{key: 'Comment', dataKey: 'Comment',		label: 'Comment',		width: 400,
		flexGrow: 1, flexShrink: 1,
		resizable: true,
		headerRenderer: renderHeaderCell}, 
	{key: 'PC', dataKey: 'ProposedChange', label: 'Proposed Change',width: 400,
		flexGrow: 1, flexShrink: 1,
		resizable: true,
		headerRenderer: renderHeaderCell},
	{key: 'CG', dataKey: 'CommentGroup',	label: 'Group',			width: 150,
		flexGrow: 1, flexShrink: 1,
		resizable: true,
		headerRenderer: renderHeaderCell},
	{key: 'Status', dataKey: 'Status',			label: 'Status',		width: 150,
		flexGrow: 1, flexShrink: 1,
		resizable: true,
		headerRenderer: renderHeaderCell},
	{key: 'Stack2', dataKey: 'Stack2', label: 'Assignee/Submission',	width: 250,
		flexGrow: 1, flexShrink: 1,
		resizable: true,
		headerRenderer: renderHeaderCellStacked2,
		cellRenderer: renderDataCellStacked2},
	{key: 'ABM', dataKey: 'ApprovedByMotion',	label: 'Motion Number',	width: 80,
		flexGrow: 1, flexShrink: 1,
		resizable: true,
		headerRenderer: renderHeaderCell},
	{key: 'Resoultion', dataKey: 'Resolution',		label: 'Resolution',	width: 400,
		flexGrow: 1, flexShrink: 1,
		resizable: true,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDataCellResolution},
	{key: 'Editing', dataKey: 'Editing',		label: 'Editing',		width: 300,
		flexGrow: 1, flexShrink: 1,
		resizable: true,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDataCellEditing,
		isLast: true}
]
	
function Comments(props) {
	const history = useHistory()
	const {ballotId} = useParams()
	const query = new URLSearchParams(useLocation().search)
	const cidsStr = query.get('CIDs')

	const [editMode, setEditMode] = React.useState(false)
	const [showImport, setShowImport] = React.useState(false)
	const [showExport, setShowExport] = React.useState(false)

	const [columnVisibility, setColumnVisibility] = React.useState(() => {
		const v1 = stackedColumns.reduce((o, c) => {return {...o, [c.dataKey]: true}}, {})
		const v2 = flatColumns.reduce((o, c) => {return {...o, [c.dataKey]: true}}, {})
		return {...v1, ...v2}
	})
	const [isStacked, setStacked] = React.useState(true)

	const columns = React.useMemo(() => {
		let columns 
		if (editMode) {
			columns = [stackedColumns[0]]
		}
		else {
			columns = (isStacked? stackedColumns: flatColumns).filter(c => !columnVisibility.hasOwnProperty(c.dataKey) || columnVisibility[c.dataKey])
		}
		const selectionColumn = {
			key: 'CID',
			width: 40,
			flexShrink: 0,
			resizable: false,
			format: 'checkbox',
			toggleSelected: props.toggleSelected,
			cellRenderer: renderRowSelector
		}
		return [selectionColumn, ...columns]
	}, [columnVisibility, editMode])

	React.useEffect(() => {
		if (ballotId) {
			if (ballotId !== props.ballotId) {
				// Routed here with parameter ballotId specified, but not matching stored ballotId
				// Store the ballotId and get comments for this ballotId
				props.setBallotId(ballotId)
				props.getComments(ballotId)
			}
			else if (!props.getComments && (!props.commentsValid || props.commentBallotId !== ballotId)) {
				props.getComments(ballotId)
			}
		}
		else if (props.ballotId) {
			history.replace(`/Comments/${props.ballotId}`)
		}
	}, [ballotId])

	function refresh() {
		props.getComments(ballotId)
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
		props.getComments(ballotId)
	}

	function editClick({event, index, rowData}) {
		const {comments, commentsMap} = props
		let cids = cidsStr? cidsStr.split(','): []
		const cid = rowData.CID
		if (event.shiftKey) {
			// Shift + click => include all between last and current
			console.log('shift', cids)
			if (cids.length === 0) {
				cids.push(cid)
			}
			else {
				const cid_last = cids[cids.length - 1]
				const i_last = commentsMap.findIndex(i => comments[i].CID === cid_last)
				const i_selected = commentsMap.findIndex(i => comments[i].CID === cid)
				console.log(cid_last, i_last, i_selected)
				if (i_last >= 0 && i_selected >= 0) {
					if (i_last > i_selected) {
						for (let i = i_selected; i < i_last; i++) {
							cids.push(comments[commentsMap[i]].CID)
						}
					}
					else {
						for (let i = i_last + 1; i <= i_selected; i++) {
							cids.push(comments[commentsMap[i]].CID)
						}
					}
				}
			}
		} else if (event.ctrlKey || event.metaKey) {
			console.log('ctrl', cids)
			// Control + click => add or remove
			if (cids.includes(cid)) {
				cids = cids.filter(c => c !== cid)
			}
			else {
				cids.push(cid)
			}
		} else {
			cids = [cid]
		}
		history.push(props.location.pathname + '?CIDs=' + cids.join(','))
	}

	function editComments(cids) {
		history.push(props.location.pathname + `?CIDs=${cids.join(',')}`)
	}

	function rowGetter({rowIndex}) {
		const {comments, commentsMap} = props;
		const c = comments[commentsMap[rowIndex]]
		if (rowIndex > 0 && Math.floor(comments[commentsMap[rowIndex - 1]].CommentID) === Math.floor(c.CommentID)) {
			// Previous row holds the same comment
			return {
				...c,
				CommenterName: '',
				Vote: '',
				MustSatisfy: '',
				Category: '',
				Clause: '',
				Page: '',
				Comment: '',
				ProposedChange: ''
			}
		}
		return c
	}

	function getTableSize() {
		const headerEl = document.getElementsByTagName('header')[0]
		const topRowEl = document.getElementById('top-row')
		const headerHeight = headerEl.offsetHeight + topRowEl.offsetHeight

		const height = window.innerHeight - headerHeight - 1
		const width = columns.length > 1? window.innerWidth - 30: columns[0].width + 43 + 17

		return {height, width}
	}

	const table = (
		<AppTable
			fixed={fixed}
			headerHeight={isStacked? 60: 22}
			columns={columns}
			width={editMode? columns[0].width + columns[1].width + 17: 'calc(100vw-16px)'}
			height={800}
			data={props.commentsMap}
			rowGetter={rowGetter}
			loading={props.loading}
			//editRow={editClick}
			filters={props.filters}
			sort={props.sort}
			setSort={props.setSort}
			setFilter={props.setFilter}
			selector={renderCommentsSelector}
			setSelected={props.setSelected}
			selected={props.selected}
		/>
	)

	const editView = (
		<div style={{display: 'flex'}}>
			{table}
			<Container><CommentDetail cidsStr={props.selected.join(',')} /></Container>
		</div>
	)

	const fixed = false
	return (
		<React.Fragment>
			<Container id='Comments' fluid>
				<Row id='top-row' justify='between' align='center'>
					<Col xs='content'>
						<BallotSelector onBallotSelected={ballotSelected} />
					</Col>
					<Col xs='content'>
						<button onClick={e => setEditMode(!editMode)}>{editMode? 'Edit': 'View'}</button>
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
					</Col>
				</Row>

				<Row>
					<CommentsFilter css={css`max-width: calc(100vw-16px)`}/>
				</Row>
			</Container>
			
			<div style={{height: '70vh', width: 'calc(100vw-16px)', boxSizing: 'border-box'}}>
				{editMode? editView: table}
			</div>

			<UploadCommentsModal
				ballotId={props.ballotId}
				isOpen={showImport}
				close={() => setShowImport(false)}
			/>

			<ExportModal
				ballotId={props.ballotId}
				isOpen={showExport}
				close={() => setShowExport(false)}
			/>

		</React.Fragment>
	)
}

Comments.propTypes = {
	filters: PropTypes.object.isRequired,
	sort: PropTypes.object.isRequired,
	selected: PropTypes.array.isRequired,
	expanded: PropTypes.array.isRequired,
	ballotId: PropTypes.string.isRequired,
	commentBallotId: PropTypes.string.isRequired,
	commentsValid: PropTypes.bool.isRequired,
	comments: PropTypes.array.isRequired,
	commentsMap: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
}

export default connect(
	(state, ownProps) => {
		const {comments, ballots} = state
		return {
			ballotId: ballots.ballotId,
			filters: comments.filters,
			sort: comments.sort,
			selected: comments.selected,
			expanded: comments.expanded,
			commentBallotId: comments.ballotId,
			commentsValid: comments.commentsValid,
			comments: comments.comments,
			commentsMap: comments.commentsMap,
			commentsSortedFiltered: comments.commentsMap.map(i => comments.comments[i]),
			loading: comments.getComments
		}
	},
	(dispatch, ownProps) => {
		return {
			setSelected: cids => dispatch(setCommentsSelected(cids)),
			toggleSelected: cids => dispatch(toggleCommentsSelected(cids)),
			setExpanded: cids => dispatch(setCommentsExpanded(cids)),
			setFilter: (dataKey, value) => dispatch(setCommentsFilter(dataKey, value)),
			setSort: (dataKey, event) => dispatch(setCommentsSort(event, dataKey)),
			getComments: ballotId => dispatch(getComments(ballotId)),
			setBallotId: ballotId => dispatch(setBallotId(ballotId))
		}
	}
)(Comments);