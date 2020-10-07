import PropTypes from 'prop-types'
import React from 'react'
import ReactDOM from 'react-dom'
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import BallotSelector from '../ballots/BallotSelector'
import ColumnSelector from './ColumnSelector'
import AppTable from '../table/AppTable'
import {ActionButton, Checkbox, Expander, DoubleExpander, Handle, VoteYesIcon, VoteNoIcon} from '../general/Icons'
import {getComments} from '../actions/comments'
import {setSort} from '../actions/sort'
import {setFilter, removeFilter, clearFilters} from '../actions/filter'
import {setSelected, toggleSelected} from '../actions/select'
import {setExpanded, toggleExpanded} from '../actions/expand'
import {getDataMap} from '../selectors/dataMap'
import {getAllFieldOptions, getAvailableFieldOptions} from '../selectors/options'
import {setBallotId} from '../actions/ballots'
import {editorCss} from './ResolutionEditor'
import {CommentIdSelector} from './CommentIdList'
import CommentDetail from './CommentDetail'
import CommentsImportModal from './CommentsImport'
import CommentsExportModal from './CommentsExport'
import ClickOutside from '../general/ClickOutside'
import ColumnDropdown from '../table/ColumnDropdown'
import styled from '@emotion/styled'

const commentFieldLabel = dataKey => ({
	CommenterName: 'Commenter',
	MustSatisfy: 'Must Satisfy',
	Category: 'Cat',
	Page: 'Page',
	ProposedChange: 'Proposed Change',
	CommentGroup: 'Comment Group',
	AssigneeName: 'Assignee',
	Status: 'Status',
	ApprovedByMotion: 'Motion Number',
	ResnStatus: 'Resn Status',
	Resolution: 'Resolution',
	EditStatus: 'Editing Status',
	EditInDraft: 'In Draft',
	EditNotes: 'Editing Notes'
}[dataKey] || dataKey);

const CommentsColumnDropdown = connect(
	(state, ownProps) => {
		const {dataKey} = ownProps
		return {
			label: commentFieldLabel(dataKey),
			filter: state.comments.filters[dataKey],
			sort: state.comments.sort,
			allOptions: getAllFieldOptions(state, 'comments', dataKey), //state.comments.filters[dataKey].options
			availableOptions: getAvailableFieldOptions(state, 'comments', dataKey)
		}
	},
	(dispatch, ownProps) => {
		const {dataKey} = ownProps
		return {
			setFilter: (value) => dispatch(setFilter('comments', dataKey, value)),
			setSort: (dataKey, direction) => dispatch(setSort('comments', dataKey, direction)),
		}
	}
)(ColumnDropdown);

const FlexColumn = styled.div`
	display: flex;
	flex-direction: column;`

const FlexRow = styled.div`
	display: flex;
	flex-direction: row;
	margin: 0 5px;
	align-items: center;`

/*
 * The data cell rendering functions are pure functions (dependent only on input parameters)
 */
function renderDataCellCheck({rowData, dataKey}) {
	return rowData[dataKey]? '\u2714': ''
}

function renderDataCellEditing({rowData}) {
	return rowData.EditStatus? <React.Fragment><b>{rowData.EditStatus}:</b> {rowData.EditNotes}</React.Fragment>: rowData.EditNotes
}

const ResolutionContainter = styled.div`
	${editorCss}
	background-color: ${({color}) => color};
`;

function renderDataCellResolution({rowData}) {
	const resnColor = {
		'A': '#d3ecd3',
		'V': '#f9ecb9',
		'J': '#f3c0c0'
	}
	return (
		<ResolutionContainter
			color={resnColor[rowData.ResnStatus]}
			dangerouslySetInnerHTML={{__html: rowData.Resolution}}
		/>
	)
}

const DataSubcomponent = styled.div`
	flex: 1 1 ${({width}) => width && typeof width === 'string'? width: width + 'px'};
	height: 18px;
	padding-right: 5px;
	box-sizing: border-box;
	overflow: hidden;
`;

const HeaderSubcomponent = DataSubcomponent.withComponent(CommentsColumnDropdown);


function renderHeaderCellStacked1(props) {
	return (
		<React.Fragment>
			<FlexRow>
				<HeaderSubcomponent width={70} dataKey='CID' {...props} />
				<HeaderSubcomponent width={40} dataKey='Category' {...props} />
			</FlexRow>
			<FlexRow>
				<HeaderSubcomponent width={70} dataKey='Clause' {...props} />
				<HeaderSubcomponent width={40} dataKey='Page' {...props} />
			</FlexRow>
			<FlexRow>
				<HeaderSubcomponent width={90} dataKey='CommenterName' {...props} />
				<HeaderSubcomponent width={30} dataKey='Vote' {...props} />
				<HeaderSubcomponent width={30} dataKey='MustSatisfy' label='MS' {...props} />
			</FlexRow>
		</React.Fragment>
	)
}

function renderDataCellStacked1({rowData}) {
	const commenterStr = rowData.CommenterName
	let voteIcon
	if (rowData.Vote === 'Approve')
		voteIcon = <VoteYesIcon />
	else if (rowData.Vote === 'Disapprove')
		voteIcon = <VoteNoIcon />
	const mbs = rowData.MustSatisfy? <span style={{color: 'red', fontSize: 'smaller', fontWeight: 'bold'}}>&nbsp;MS</span>: null
	return (
		<React.Fragment>
			<FlexRow>
				<DataSubcomponent width={70} style={{fontWeight: 'bold'}}>{rowData['CID']}</DataSubcomponent>
				<DataSubcomponent width={40}>{rowData['Category']}</DataSubcomponent>
			</FlexRow>
			<FlexRow>
				<DataSubcomponent width={70} style={{fontStyle: 'italic'}}>{rowData['Clause']}</DataSubcomponent>
				<DataSubcomponent width={40}>{rowData['Page']}</DataSubcomponent>
			</FlexRow>
			<FlexRow>{voteIcon}{commenterStr}{mbs}</FlexRow>
		</React.Fragment>
	)
}

function renderHeaderCellStacked2(props) {
	return (
		<React.Fragment>
			<HeaderSubcomponent dataKey='AssigneeName' {...props} />
			<HeaderSubcomponent dataKey='Submission' {...props} />
		</React.Fragment>
	)
}

function renderDataCellStacked2({rowData}) {
	return (
		<React.Fragment>
			<div>{rowData['AssigneeName'] || 'Not Assigned'}</div>
			<div>{rowData['Submission'] || 'None'}</div>
		</React.Fragment>
	)
}

function renderHeaderCellResolution(props) {
	return (
		<React.Fragment>
			<HeaderSubcomponent dataKey='ResnStatus' {...props} />
			<HeaderSubcomponent dataKey='Resolution' {...props} />
		</React.Fragment>
	)
}

const renderHeaderCell = (props) => <CommentsColumnDropdown dataKey={props.column.key} {...props} />

// Renderer that will preserve newlines
const renderTextBlock = ({rowData, dataKey}) => {
	const cellData = rowData[dataKey]
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

const RowSelectorContainer = styled(ClickOutside)`
	height: 22px;
	border-radius: 6px;
`;

const CommentIdEntry = styled(CommentIdSelector)`
	position: absolute;
	min-width: 300px;
	border: 1px solid #ccc;
	padding: 0;
	background: #fff;
	border-radius: 2px;
	box-shadow: 0 0 10px 0 rgba(0,0,0,0.2);
	z-index: 9;
`;

function renderDropdown({anchorRef}) {
	return ReactDOM.createPortal(
		<CommentIdEntry focusOnMount anchorRef={anchorRef} />,
		anchorRef.current
	)
}

function RowSelector(props) {
	const containerRef = React.createRef();
	const [open, setOpen] = React.useState(false);

	const handleClose = (e) => {
		if (!open || props.anchorRef.current.contains(e.target)) {
			// ignore if not open or event target is an element inside the dropdown
			return;
		}
		setOpen(false)
	}

	return (
		<RowSelectorContainer
			ref={containerRef}
			onClickOutside={handleClose}
		>
			<Handle title="Select List" open={open} onClick={() => setOpen(!open)} />
			{open && renderDropdown(props)}
		</RowSelectorContainer>
	)
}

const Selector = styled.div`
	display: flex;
	flex-direction: column;
	border-radius: 3px;
	:hover,
	:focus-within {
		background-color: #ddd;
	}
`;

const ControlHeader = (props) => {
	const {rowKey, data, dataMap, selected, setSelected, expanded, setExpanded} = props;

	const allSelected = React.useMemo(() => (
			dataMap.length > 0 &&	// not if list is empty
			dataMap.filter(i => !selected.includes(data[i][rowKey])).length === 0
		),
		[data, dataMap, selected]
	);

	const isIndeterminate = !allSelected && selected.length;

	const allExpanded = React.useMemo(() => (
			dataMap.length > 0 &&	// not if list is empty
			dataMap.filter(i => !expanded.includes(data[i][rowKey])).length === 0
		),
		[data, dataMap, expanded]
	);

	const toggleAllSelected = () => setSelected(selected.length? []: dataMap.map(i => data[i].CID));

	const toggleAllExpanded = () => setExpanded(expanded.length? []: dataMap.map(i => data[i].CID));

	return (
		<FlexColumn>
			<Selector>
				<Checkbox
					title={allSelected? "Clear All": isIndeterminate? "Clear Selected": "Select All"}
					checked={allSelected}
					indeterminate={isIndeterminate}
					onChange={toggleAllSelected}
				/>
				<RowSelector {...props}/>
			</Selector>
			<DoubleExpander
				key='expander'
				title="Expand All"
				open={allExpanded}
				onClick={toggleAllExpanded}
			/>
		</FlexColumn>
	)
}

const ConnectedControlHeader = connect(
	(state, ownProps) => ({
		selected: state[ownProps.dataSet].selected,
		expanded: state[ownProps.dataSet].expanded,
		data: state[ownProps.dataSet].comments,
		dataMap: getDataMap(state, ownProps.dataSet),
	}),
	(dispatch, ownProps) => ({
		setSelected: cids => dispatch(setSelected(ownProps.dataSet, cids)),
		setExpanded: cids => dispatch(setExpanded(ownProps.dataSet, cids))
	})
)(ControlHeader);

const ControlCell = ({rowKey, rowData, selected, toggleSelected, expanded, toggleExpanded}) => {
	const id = rowData[rowKey]
	return (
		<div style={{display: 'flex', flexDirection: 'column'}}>
			<Checkbox
				key='selector'
				title="Select Row"
				checked={selected.includes(id)}
				onChange={() => toggleSelected(id)}
			/>
			<Expander
				key='expander'
				title="Expand Row"
				open={expanded.includes(id)}
				onClick={() => toggleExpanded(id)}
			/>
		</div>
	)
}

const ConnectedControlCell = connect(
	(state, ownProps) => ({
		selected: state[ownProps.dataSet].selected,
		expanded: state[ownProps.dataSet].expanded
	}),
	(dispatch, ownProps) => ({
		toggleSelected: cid => dispatch(toggleSelected(ownProps.dataSet, [cid])),
		toggleExpanded: cid => dispatch(toggleExpanded(ownProps.dataSet, [cid]))
	})
)(ControlCell)


const editColumns = [
	{key: 'cid', label: 'CID...',
		width: 200, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCellStacked1,
		cellRenderer: renderDataCellStacked1},
];

const flatColumns = [
	{key: 'CID', label: 'CID',
		width: 60, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell},
	{key: 'CommenterName', label: 'Commenter',
		width: 100, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Vote', label: 'Vote',
		width: 50, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'MustSatisfy', label: 'MS',
		width: 36, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDataCellCheck},
	{key: 'Category', label: 'Cat',
		width: 36, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell},
	{key: 'Clause', label: 'Clause',
		width: 100, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell},
	{key: 'Page', label: 'Page',
		width: 80, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCell},
	{key: 'Comment', label: 'Comment',
		width: 400, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderTextBlock}, 
	{key: 'ProposedChange', label: 'Proposed Change',
		width: 400, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderTextBlock},
	{key: 'CommentGroup', label: 'Comment Group',
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'AssigneeName', label: 'Assignee',
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Submission', label: 'Submission',
		 width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Status', label: 'Status',
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'ApprovedByMotion', label: 'Motion Number',
		width: 80, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Resolution', label: 'Resolution',
		width: 400, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCellResolution,
		cellRenderer: renderDataCellResolution},
	{key: 'EditStatus', label: 'Editing',
		width: 300, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDataCellEditing}
];

const stackedColumns = [
	{key: 'Stack1', label: 'CID/Cat/MS/...',
		width: 200, flexGrow: 0, flexShrink: 0,
		headerRenderer: renderHeaderCellStacked1,
		cellRenderer: renderDataCellStacked1},
	{key: 'Comment', label: 'Comment',
		width: 400, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'ProposedChange', label: 'Proposed Change',
		width: 400, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'CommentGroup', label: 'Group',
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Status', label: 'Status',
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Stack2', label: 'Assignee/Submission',
		width: 250, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCellStacked2,
		cellRenderer: renderDataCellStacked2},
	{key: 'ApprovedByMotion', label: 'Motion Number',
		width: 80, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell},
	{key: 'Resoultion', label: 'Resolution',
		width: 400, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCellResolution,
		cellRenderer: renderDataCellResolution},
	{key: 'EditStatus', label: 'Editing',
		width: 300, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCell,
		cellRenderer: renderDataCellEditing}
];

function Comments(props) {
	const history = useHistory()
	const {ballotId} = useParams()

	const [editMode, setEditMode] = React.useState(false)
	const [showImport, setShowImport] = React.useState(false)
	const [showExport, setShowExport] = React.useState(false)

	const [columnVisibility, setColumnVisibility] = React.useState(() => {
		const v1 = stackedColumns.reduce((o, c) => ({...o, [c.key]: true}), {})
		const v2 = flatColumns.reduce((o, c) => ({...o, [c.key]: true}), {})
		return {...v1, ...v2}
	})
	const [isStacked, setStacked] = React.useState(true)
	const [fixed, setFixed] = React.useState(false)

	const columns = React.useMemo(() => {
		let columns
		if (editMode) {
			columns = editColumns
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
			headerRenderer: props => <ConnectedControlHeader dataSet='comments' {...props}/>,
			cellRenderer: props => <ConnectedControlCell dataSet='comments' {...props} />
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

	const refresh = () => props.getComments(ballotId)

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

	function handleKeyDown(event) {
		if (event.keyCode !== 38 && event.keyCode !== 40)
			return

		const {comments, commentsMap, selected, setSelected} = props;

		if (selected.length === 0) {
			if (commentsMap.length > 0)
				setSelected([comments[commentsMap[0]].CID])
			return
		}

		let cid = props.selected[0]
		let i = props.commentsMap.findIndex(i => props.comments[i].CID === cid)
		if (i === -1) {
			if (commentsMap.length > 0)
				setSelected([comments[commentsMap[0]].CID])
			return
		}

		if (event.keyCode === 38) {			// Up arrow
			if (i === 0) 
				i = commentsMap.length - 1;
			else
				i = i - 1 
		}
		else if (event.keyCode === 40) {	// Down arrow
			if (i === (commentsMap.length - 1))
				i = 0
			else
				i = i + 1
		}
		else
			return

		setSelected([comments[commentsMap[i]].CID])
	}

	function editClick({event, rowData}) {
		const {comments, commentsMap, setSelected} = props
		let cids = props.selected.slice()
		const cid = rowData.CID
		if (event.shiftKey) {
			// Shift + click => include all between last and current
			if (cids.length === 0) {
				cids.push(cid)
			}
			else {
				const cid_last = cids[cids.length - 1]
				const i_last = commentsMap.findIndex(i => comments[i].CID === cid_last)
				const i_selected = commentsMap.findIndex(i => comments[i].CID === cid)
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
		setSelected(cids)
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

	const topRow = (
		<div style={{display: 'flex', justifyContent: 'space-between'}} >
			<BallotSelector onBallotSelected={ballotSelected} />
			<div>
				<button onClick={e => setEditMode(!editMode)}>{editMode? 'Edit': 'View'}</button>
				<ActionButton name='export' title='Export to file' onClick={e => setShowExport(true)} disabled={!ballotId} />
				<ActionButton name='upload' title='Upload Resolutions' onClick={e => setShowImport(true)} disabled={!ballotId} />
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
			</div>
		</div>
	)

	const table = ({onRowClick, onRowDoubleClick, contentWidth}) => (
		<AppTable
			fixed={fixed}
			contentWidth={contentWidth}
			headerHeight={isStacked? 66: 22}
			columns={columns}
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
			removeFilter={props.removeFilter}
			clearFilters={props.clearFilters}
			onRowClick={onRowClick}
			onRowDoubleClick={onRowDoubleClick}
			onKeyDown={handleKeyDown}
			rowKey='CID'
			showFilters
		/>
	)

	const tableView = (
		<div style={{flex: 1}}>
			{table({onRowClick: editClick, onRowDoubleClick: () => setEditMode(true)})}
		</div>
	)

	const editView = (
		<div style={{display: 'flex', flex: 1}}>
			{table({onRowClick: editClick, contentWidth: true})}
			<CommentDetail cidsStr={props.selected.join(',')} />
		</div>
	)

	return (
		<React.Fragment>

			{topRow}

			{editMode? editView: tableView}

			<CommentsImportModal
				ballotId={props.ballotId}
				isOpen={showImport}
				close={() => setShowImport(false)}
			/>

			<CommentsExportModal
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
			commentsMap: getDataMap(state, 'comments'),
			loading: comments.getComments
		}
	},
	(dispatch, ownProps) => {
		return {
			setFilter: (dataKey, value) => dispatch(setFilter('comments', dataKey, value)),
			removeFilter: (dataKey, value) => dispatch(removeFilter('comments', dataKey, value)),
			clearFilters: () => dispatch(clearFilters('comments')),
			setSort: (dataKey, event) => dispatch(setSort('comments', event, dataKey)),
			setSelected: cids => dispatch(setSelected('comments', cids)),
			setExpanded: cids => dispatch(setExpanded('comments', cids)),
			getComments: ballotId => dispatch(getComments(ballotId)),
			setBallotId: ballotId => dispatch(setBallotId(ballotId))
		}
	}
)(Comments);