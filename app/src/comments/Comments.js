import PropTypes from 'prop-types'
import React from 'react'
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import {Container, Row, Col} from 'react-grid-system'
import BallotSelector from '../ballots/BallotSelector'
import ColumnSelector from './ColumnSelector'
import CommentsFilter from './CommentsFilter'
import AppModal from '../modals/AppModal'
import AppTable, {ColumnLabel} from '../table/AppTable'
import {ActionButton, Checkbox, Expander, DoubleExpander, Handle} from '../general/Icons'
import {setCommentsSort, setCommentsFilter, setCommentsSelected, setCommentsExpanded, getComments, uploadResolutions} from '../actions/comments'
import {allSelected, toggleVisible} from '../lib/select'
import {setBallotId} from '../actions/ballots'
import {setError} from '../actions/error'
import fetcher from '../lib/fetcher'
import {editorCss} from './ResolutionEditor'
import {CommentIdSelector} from './CommentIdList'
import CommentDetail from './CommentDetail'
import ClickOutside from '../general/ClickOutside'
import styled from '@emotion/styled'

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


function useTableSize(getTableSize, dependencies) {
	const [tableSize, setTableSize] = React.useState({
		height: 400,
		width: 300,
	})

	function onResize() {
		const {height, width} = getTableSize()
		if (height !== tableSize.height || width !== tableSize.width) {
			setTableSize({height, width})
		}
	}

	React.useLayoutEffect(() => {
		onResize()
		window.addEventListener("resize", onResize)
		return () => {
			window.removeEventListener("resize", onResize)
		}
	}, [])

	React.useEffect(onResize, dependencies)

	return tableSize
}

const FlexColumn = styled.div`
	display: flex;
	flex-direction: column;`

const FlexRow = styled.div`
	display: flex;
	flex-direction: row;`

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

const elementCss = (width, paddingRight=0) => css`
	box-sizing: border-box;
	width: ${width}px;
	padding-right: ${paddingRight}px`

function renderHeaderCellStacked1({sort, setSort}) {

	return (
		<React.Fragment>
			<FlexRow>
				<ColumnLabel css={elementCss(100, 5)} dataKey='CID' label='CID' sort={sort} setSort={setSort} />
				<ColumnLabel css={elementCss(40, 5)} dataKey='Category' label='Cat' sort={sort} setSort={setSort} />
				<ColumnLabel css={elementCss(32)} dataKey='MustSatisfy' label='MS' sort={sort} setSort={setSort} />
			</FlexRow>
			<FlexRow>
				<ColumnLabel css={elementCss(100, 5)} dataKey='Clause' label='Clause' sort={sort} setSort={setSort} />
				<ColumnLabel css={elementCss(50, 0)} dataKey='Page' label='Page' sort={sort} setSort={setSort} />
			</FlexRow>
			<FlexRow>
				<ColumnLabel css={elementCss(100, 5)} dataKey='CommenterName' label='Commenter' sort={sort} setSort={setSort} />
				<ColumnLabel css={elementCss(50, 0)} dataKey='Vote' label='Vote' sort={sort} setSort={setSort} />
			</FlexRow>
		</React.Fragment>
	)
}

function renderDataCellStacked1({rowData}) {
	const commenterStr = rowData['CommenterName'] + (rowData['Vote']? ' (' + rowData['Vote'] + ')': '')
	return (
		<React.Fragment>
			<FlexRow>
				<div css={[elementCss(100,5), {fontWeight: 'bold'}]}>{rowData['CID']}</div>
				<div css={elementCss(40, 5)}>{rowData['Category']}</div>
				<div css={elementCss(30)}>{rowData['MustSatisfy']? '\u2714': ''}</div>
			</FlexRow>
			<FlexRow>
				<div css={[elementCss(100, 5), {fontStyle: 'italic'}]}>{rowData['Clause']}</div>
				<div css={elementCss(50)}>{rowData['Page']}</div>
			</FlexRow>
			<FlexRow>{commenterStr}<span role='img' aria-label='Approve'>&#128077;&#128078;</span></FlexRow>
		</React.Fragment>
	)
}

function renderHeaderCellStacked2({sort, setSort}) {
	const cols = [
		{dataKey: 'AssigneeName', label: 'Assignee'},
		{dataKey: 'Submission', label: 'Submission'}
	]
	return cols.map(c => (<ColumnLabel key={c.dataKey} dataKey={c.dataKey} label={c.label} sort={sort} setSort={setSort} />))
}

function renderDataCellStacked2({rowData}) {
	return (
		<React.Fragment>
			<div>{rowData['AssigneeName'] || 'Not Assigned'}</div>
			<div>{rowData['Submission'] || 'None'}</div>
		</React.Fragment>
	)
}

function renderHeaderCell({column, sort, setSort}) {
	return <ColumnLabel key={column.key} dataKey={column.key} label={column.label} sort={sort} setSort={setSort} />
}

// Renderer that will preserve newlines
const renderTextBlock = ({rowData, column}) => {
	const cellData = rowData[column.key]
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

function RowSelector(props) {
	const [open, setOpen] = React.useState(false)

	const Container = styled(ClickOutside)`
		height: 22px;
		border-radius: 6px;`
	const CommentIdEntry = styled(CommentIdSelector)`
		position: absolute;
		min-width: 300px;
		border: 1px solid #ccc;
		padding: 0;
		background: #fff;
		border-radius: 2px;
		box-shadow: 0 0 10px 0 rgba(0,0,0,0.2);
		z-index: 9;`
	return (
		<Container onClick={() => setOpen(!open)} onClickOutside={() => setOpen(false)}  >
			<Handle title="Select List" open={open} onClick={(e) => {setOpen(!open); e.stopPropagation()}} />
			{open && <CommentIdEntry focusOnMount {...props} />}
		</Container>
	)
}


const ControlHeader = ({comments, commentsMap, selected, setSelected, expanded, setExpanded}) => {
	const isSelected = allSelected(selected, commentsMap, comments, 'CID')
	const isIndeterminate = !isSelected && selected.length
	const isExpanded = allSelected(expanded, commentsMap, comments, 'CID')

	const Selector = styled.div`
		display: flex;
		flex-direction: column;
		border-radius: 6px;
		:hover,
		:focus-within {
			background-color: #ddd;
		}`

	return (
		<FlexColumn>
			<Selector>
				<Checkbox
					title={isSelected? "Clear All": isIndeterminate? "Clear Selected": "Select All"}
					checked={isSelected}
					indeterminate={isIndeterminate}
					onChange={e => {
						const cids = toggleVisible(selected, commentsMap, comments, 'CID')
						setSelected(cids)
					}}
				/>
				<RowSelector />
			</Selector>
			<DoubleExpander
				key='expander'
				title="Expand All"
				open={isExpanded}
				onClick={e => {
					const cids = toggleVisible(expanded, commentsMap, comments, 'CID')
					setExpanded(cids)
				}}
			/>
		</FlexColumn>
	)
}

const ControlCell = ({rowData, selected, setSelected, expanded, setExpanded}) => {
	const id = rowData['CID']
	return (
		<div style={{display: 'flex', flexDirection: 'column'}}>
			<Checkbox
				key='selector'
				title="Select Row"
				checked={selected.includes(id)}
				onChange={() => {
					const i = selected.indexOf(id)
					const s = selected.slice()
					if (i >= 0) {s.splice(i, 1)} else {s.push(id)}
					setSelected(s)
				}}
			/>
			<Expander
				key='expander'
				title="Expand Row"
				open={expanded.includes(id)}
				onClick={() => {
					const i = expanded.indexOf(id)
					const e = expanded.slice()
					if (i >= 0) {e.splice(i, 1)} else {e.push(id)}
					setExpanded(e)
				}}
			/>
		</div>
	)
}

const mapControlState = (state, ownProps) => ({
	selected: state.comments.selected,
	expanded: state.comments.expanded,
	comments: state.comments.comments,
	commentsMap: state.comments.commentsMap
});

const mapControlDispatch = (dispatch, ownProps) => ({
	setSelected: cids => dispatch(setCommentsSelected(cids)),
	setExpanded: cids => dispatch(setCommentsExpanded(cids))
});

const ConnectedControlHeader = connect(mapControlState, mapControlDispatch)(ControlHeader);
const ConnectedControlCell = connect(mapControlState, mapControlDispatch)(ControlCell);

const flatColumns = [
	{key: 'CID',
		label: 'CID',
		width: 60, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell},
	{key: 'CommenterName',
		label: 'Commenter',
		width: 100, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Vote',
		label: 'Vote',
		width: 50, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'MustSatisfy',
		label: 'MS',
		width: 36, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDataCellCheck},
	{key: 'Category',
		label: 'Cat',
		width: 36, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell},
	{key: 'Clause',
		label: 'Clause',
		width: 100, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell},
	{key: 'Page',
		label: 'Page',
		width: 80, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell},
	{key: 'Comment',
		label: 'Comment',
		width: 400, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderTextBlock}, 
	{key: 'ProposedChange',
		label: 'Proposed Change',
		width: 400, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderTextBlock},
	{key: 'CommentGroup',
		label: 'Comment Group',
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'AssigneeName',
		label: 'Assignee',
		width: 150,
		flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Submission',
		label: 'Submission',
		 width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Status',
		label: 'Status',
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'ApprovedByMotion',
		label: 'Motion Number',
		width: 80, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Resolution',
		label: 'Resolution',
		width: 400, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDataCellResolution},
	{key: 'Editing',
		label: 'Editing',
		width: 300, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDataCellEditing}
]

const stackedColumns = [
	{key: 'Stack1',
		label: 'CID/Cat/MS/...',
		width: 200, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCellStacked1,
		cellRenderer: renderDataCellStacked1},
	{key: 'Comment',
		label: 'Comment',
		width: 400, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'ProposedChange',
		label: 'Proposed Change',
		width: 400, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'CommentGroup',
		label: 'Group',
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Status',
		label: 'Status',
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Stack2',
		label: 'Assignee/Submission',
		width: 250, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCellStacked2,
		cellRenderer: renderDataCellStacked2},
	{key: 'ApprovedByMotion',
		label: 'Motion Number',
		width: 80, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Resoultion',
		label: 'Resolution',
		width: 400, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDataCellResolution},
	{key: 'Editing',
		label: 'Editing',
		width: 300, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDataCellEditing}
]
	
function Comments(props) {
	const history = useHistory()
	const {ballotId} = useParams()

	const [editMode, setEditMode] = React.useState(false)
	const [showImport, setShowImport] = React.useState(false)
	const [showExport, setShowExport] = React.useState(false)

	const [columnVisibility, setColumnVisibility] = React.useState(() => {
		const v1 = stackedColumns.reduce((o, c) => {return {...o, [c.key]: true}}, {})
		const v2 = flatColumns.reduce((o, c) => {return {...o, [c.key]: true}}, {})
		return {...v1, ...v2}
	})
	const [isStacked, setStacked] = React.useState(true)
	const [fixed, setFixed] = React.useState(false)

	const columns = React.useMemo(() => {
		let columns
		if (editMode) {
			columns = [stackedColumns[0]]
		}
		else {
			columns = (isStacked? stackedColumns: flatColumns).filter(c => !columnVisibility.hasOwnProperty(c.key) || columnVisibility[c.key])
		}
		columns = columns.map(c => ({
			...c,
			// column controls
			setFilter: props.setFilter,
			setSort: props.setSort
		}))
		const controlColumn = {
			key: 'CID',
			width: 40,
			flexShrink: 0,
			flexGrow: 0,
			headerRenderer: props => <ConnectedControlHeader {...props}/>,
			cellRenderer: props => <ConnectedControlCell {...props} />
		}

		return [controlColumn, ...columns]
	}, [columnVisibility, editMode, isStacked])

	React.useEffect(() => {
		if (ballotId) {
			if (ballotId !== props.ballotId) {
				// Routed here with parameter ballotId specified, but not matching stored ballotId
				// Store the ballotId and get comments for this ballotId
				props.setBallotId(ballotId)
				props.getComments(ballotId)
			}
			else if (!props.loading && (!props.commentsValid || props.commentBallotId !== ballotId)) {
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
/*
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
*/
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
		const topRowEl = document.getElementById('Comments')
		const headerHeight = headerEl.offsetHeight + topRowEl.offsetHeight

		const height = window.innerHeight - headerHeight - 1
		const width = columns.length > 1? window.innerWidth - 30: columns[0].width + 43 + 17

		return {height, width}
	}

	//const {height} = useTableSize(getTableSize, [])

	const table = ({height, width}) => (
		<AppTable
			fixed={fixed}
			headerHeight={isStacked? 66: 22}
			columns={columns}
			width={width}
			height={height}
			estimatedRowHeight={64}
			data={props.comments}
			dataMap={props.commentsMap}
			selected={props.selected}
			expanded={props.expanded}
			rowGetter={rowGetter}
			loading={props.loading}
			filters={props.filters}
			sort={props.sort}
			setSort={props.setSort}
			setFilter={props.setFilter}
			rowKey='CID'
		/>
	)

	const tableView = table({height: '70vh', width: 'calc(100vw - 16px)'})

	const editView = (
		<div style={{display: 'flex'}}>
			{table({height: '70vh', width: columns[0].width + columns[1].width + 17})}
			<Container><CommentDetail cidsStr={props.selected.join(',')} /></Container>
		</div>
	)

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
							toggleStacked={() => setStacked(!isStacked)}
							isFixed={fixed}
							toggleFixed={() => setFixed(!fixed)}
							toggleItem={toggleColumnVisible}
							isChecked={isColumnVisible}
						/>
						<ActionButton name='refresh' title='Refresh' onClick={refresh} />
					</Col>
				</Row>

				<Row>
					<CommentsFilter css={css`max-width: calc(100vw - 16px)`}/>
				</Row>
			</Container>

			{editMode? editView: tableView}

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
			setFilter: (dataKey, value) => dispatch(setCommentsFilter(dataKey, value)),
			setSort: (dataKey, event) => dispatch(setCommentsSort(event, dataKey)),
			setSelected: cids => dispatch(setCommentsSelected(cids)),
			setExpanded: cids => dispatch(setCommentsExpanded(cids)),
			getComments: ballotId => dispatch(getComments(ballotId)),
			setBallotId: ballotId => dispatch(setBallotId(ballotId))
		}
	}
)(Comments);