import PropTypes from 'prop-types'
import React, {useRef, useState, useEffect} from 'react'
import {useHistory, useParams, useLocation} from 'react-router-dom'
import {connect} from 'react-redux'
import BallotSelector from '../ballots/BallotSelector'
import ColumnSelector from './ColumnSelector'
import CommentsFilter from './CommentsFilter'
import BulkActions from './BulkActions'
import AppModal from '../modals/AppModal'
import AppTable, {ColumnLabel} from '../general/AppTable'
import {ActionButton} from '../general/Icons'
import {setCommentsSort, setCommentsFilter, setCommentsSelected, setCommentsExpanded, getComments, uploadResolutions} from '../actions/comments'
import {setBallotId} from '../actions/ballots'
import {setError} from '../actions/error'
import fetcher from '../lib/fetcher'
import editorStyles from '../css/ResolutionEditor.css'
import {CommentIdSelector} from './CommentIdList'
import CommentDetail from './CommentDetail'

/** @jsx jsx */
import { css, jsx } from '@emotion/core'


function _ImportModal({isOpen, close, ballotId, uploadResolutions}) {
	const fileInputRef = useRef();
	const [algo, setAlgo] = useState('cid')
	const [matchAll, setMatchAll] = useState(false)

	function submit() {
		uploadResolutions(ballotId, algo, matchAll, fileInputRef.current.files[0])
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

_ImportModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	ballotId: PropTypes.string.isRequired,
	upload: PropTypes.func.isRequired
}

const ImportModal = connect(
	null,
	(dispatch, ownProps) => {
		return {
			upload: (...args) => dispatch(uploadResolutions(...args))
		}
	} 
)(_ImportModal)

function _ExportModal({isOpen, close, ballotId, setError}) {
	const [forMyProject, setForMyProject] = useState(false)

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
			className={editorStyles.editor}
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
	flex-direction: row;`

function renderHeaderCellStacked1() {

	return (
		<React.Fragment>
			<div css={rowCss} >
				<ConnectedColumnLabel css={{width: 80}} dataKey='CID' label='CID' />
				<ConnectedColumnLabel css={{width: 40, marginLeft: 25}} dataKey='Category' label='Cat' />
				<ConnectedColumnLabel css={{width: 25, marginLeft: 15}} dataKey='MustSatisfy' label='MS' />
			</div>
			<div css={rowCss} >
				<ConnectedColumnLabel css={{width: 100}} dataKey='Clause' label='Clause' />
				<ConnectedColumnLabel css={{width: 50, marginLeft: 5}} dataKey='Page' label='Page' />
			</div>
			<div css={rowCss} >
				<ConnectedColumnLabel css={{width: 100}} dataKey='CommenterName' label='Commenter' />
				<ConnectedColumnLabel css={{width: 50, marginLeft: 5}} dataKey='Vote' label='Vote' />
			</div>
		</React.Fragment>
	)
}

function renderDataCellStacked1({rowData}) {
	const commenterStr = rowData['CommenterName'] + (rowData['Vote']? ' (' + rowData['Vote'] + ')': '')
	return (
		<React.Fragment>
			<div css={rowCss} >
				<div css={{width: 80, fontWeight: 'bold'}}>{rowData['CID']}</div>
				<div css={{width: 40, marginLeft: 25}}>{rowData['Category']}</div>
				<div css={{width: 25, marginLeft: 15}}>{rowData['MustSatisfy']? '\u2714': ''}</div>
			</div>
			<div css={rowCss} >
				<div css={{width: 100, fontStyle: 'italic'}}>{rowData['Clause']}</div>
				<div css={{marginLeft: 5}}>{rowData['Page']}</div>
			</div>
			<div css={rowCss} >{commenterStr}</div>
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

function renderHeaderCell({dataKey, label}) {
	return <ConnectedColumnLabel dataKey={dataKey} label={label} />
}

function renderCommentsSelector(props) {
	return <CommentIdSelector focusOnMount {...props} />
}

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
		headerRenderer: renderHeaderCell}, 
	{dataKey: 'ProposedChange',	label: 'Proposed Change',width: 400,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
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
	{dataKey: 'Stack1',			label: 'CID/Cat/MS/...',width: 200,
		flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCellStacked1,
		cellRenderer: renderDataCellStacked1},
	{dataKey: 'Comment',		label: 'Comment',		width: 400,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell}, 
	{dataKey: 'ProposedChange', label: 'Proposed Change',width: 400,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{dataKey: 'CommentGroup',	label: 'Group',			width: 150,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{dataKey: 'Status',			label: 'Status',		width: 150,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{dataKey: 'Stack2', label: 'Assignee/Submission',	width: 250,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCellStacked2,
		cellRenderer: renderDataCellStacked2},
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
	

function Comments(props) {
	const history = useHistory()
	const {ballotId} = useParams()
	const query = new URLSearchParams(useLocation().search)
	const cidsStr = query.get('CIDs')
	const cids = cidsStr? cidsStr.split(','): []

	const [showImport, setShowImport] = useState(false)
	const [showExport, setShowExport] = useState(false)

	const [columnVisibility, setColumnVisibility] = useState(() => {
		const v1 = stackedColumns.reduce((o, c) => {return {...o, [c.dataKey]: true}}, {})
		const v2 = flatColumns.reduce((o, c) => {return {...o, [c.dataKey]: true}}, {})
		return {...v1, ...v2}
	})
	const [isStacked, setStacked] = useState(true)

	let columns = (isStacked? stackedColumns: flatColumns).filter(c => !columnVisibility.hasOwnProperty(c.dataKey) || columnVisibility[c.dataKey])
	if (cids.length) {
		columns = [columns[0]]
	}

	useEffect(() => {
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

	function editComment({event, index, rowData}) {
		history.push(props.location.pathname + '?CIDs=' + rowData.CID)
	}

	function editComments(cids) {
		history.push(props.location.pathname + `?CIDs=${cids.join(',')}`)
	}

	function rowGetter({index}) {
		const {comments, commentsMap} = props;
		const c = comments[commentsMap[index]]
		if (index > 0 && Math.floor(comments[commentsMap[index - 1]].CommentID) === Math.floor(c.CommentID)) {
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
		const width = columns.length > 1? window.innerWidth - 1: columns[0].width + 43

		return {height, width}
	}


	const width = window.innerWidth - 5;
	return (
		<div id='Comments'>
			<div id='top-row' style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between'}}>
				<span>
					<BallotSelector onBallotSelected={ballotSelected} />
				</span>
				<span>
					<BulkActions
						editSelected={editComments}
					/>
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

			<CommentsFilter css={css`max-width: ${width}px`}/>

			<div style={{display: 'flex', flexDirection: 'row'}}>
				<AppTable
					headerHeight={isStacked? 60: 22}
					columns={columns}
					rowHeight={54}
					getTableSize={getTableSize}
					loading={props.loading}
					editRow={editComment}
					filters={props.filters}
					sort={props.sort}
					setSort={props.setSort}
					setFilter={props.setFilter}
					selector={renderCommentsSelector}
					setSelected={props.setSelected}
					selected={props.selected}
					setExpanded={props.setExpanded}
					expanded={props.expanded}
					data={props.comments}
					dataMap={props.commentsMap}
					primaryDataKey={'CID'}
					rowGetter={rowGetter}
				/>
				{cids.length && <CommentDetail />}
			</div>

			<ImportModal
				ballotId={props.ballotId}
				isOpen={showImport}
				close={() => setShowImport(false)}
			/>

			<ExportModal
				ballotId={props.ballotId}
				isOpen={showExport}
				close={() => setShowExport(false)}
			/>

		</div>
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
			loading: comments.getComments
		}
	},
	(dispatch, ownProps) => {
		return {
			setSelected: cids => dispatch(setCommentsSelected(cids)),
			setExpanded: cids => dispatch(setCommentsExpanded(cids)),
			setFilter: (dataKey, value) => dispatch(setCommentsFilter(dataKey, value)),
			setSort: (dataKey, event) => dispatch(setCommentsSort(event, dataKey)),
			getComments: ballotId => dispatch(getComments(ballotId)),
			setBallotId: ballotId => dispatch(setBallotId(ballotId))
		}
	}
)(Comments);