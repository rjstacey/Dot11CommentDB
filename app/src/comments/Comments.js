import PropTypes from 'prop-types'
import React from 'react'
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import Immutable from 'immutable'
import styled from '@emotion/styled'
import copyToClipboard from 'copy-html-to-clipboard'

import BallotSelector from '../ballots/BallotSelector'
import ColumnSelector from './ColumnSelector'
import AppTable from '../table/AppTable'
import ShowFilters from '../table/ShowFilters'
import {Button, ActionButton} from '../general/Icons'

import {editorCss} from './ResolutionEditor'
import CommentDetail, {renderCommenter, renderPage, renderTextBlock} from './CommentDetail'
import CommentsImport from './CommentsImport'
import CommentsExport from './CommentsExport'
import ColumnDropdown from '../table/ColumnDropdown'
import CommentsTimelineModal from './Timeline'

import {getComments} from '../store/actions/comments'
import {setSelected} from '../store/actions/select'
import {getDataMap} from '../store/selectors/dataMap'
import {setBallotId} from '../store/actions/ballots'
import {uiSetProperty} from '../store/actions/ui'

const FlexRow = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	& > *:not(:last-child) {
		margin-right: 5px;
	}
`;

/*
 * The data cell rendering functions are pure functions (dependent only on input parameters)
 */
const renderDataCellCheck = ({rowData, dataKey}) => rowData[dataKey]? '\u2714': ''

const renderHeaderCellEditing = (props) =>
	<React.Fragment>
		<HeaderSubcomponent {...props} dropdownWidth={150} dataKey='EditStatus' label='Editing Status' />
		<HeaderSubcomponent {...props} dropdownWidth={200} dataKey='EditInDraft' label='In Draft' />
		<HeaderSubcomponent {...props} dataKey='EditNotes' label='Notes' />
	</React.Fragment>

const renderDataCellEditing = ({rowData}) => 
	<React.Fragment>
		{rowData.EditStatus === 'I' && <span>In D{rowData['EditInDraft']}</span>}
		{rowData.EditStatus === 'N' && <span>No change</span>}
		<ResolutionContainter
			dangerouslySetInnerHTML={{__html: rowData['EditNotes']}}
		/>
	</React.Fragment>

const ResolutionContainter = styled.div`
	${editorCss}
	background-color: ${({color}) => color};
`;

const resnStatusMap = {
	'A': 'ACCEPTED',
	'V': 'REVISED',
	'J': 'REJECTED'
};

function renderDataCellResolution({rowData}) {
	const resnColor = {
		'A': '#d3ecd3',
		'V': '#f9ecb9',
		'J': '#f3c0c0'
	}
	const status = resnStatusMap[rowData['ResnStatus']] || ''
	return (
		<ResolutionContainter
			color={resnColor[rowData['ResnStatus']]}
		>
			<div>{status}</div>
			<div dangerouslySetInnerHTML={{__html: rowData['Resolution']}}/>
		</ResolutionContainter>
	)
}

const DataSubcomponent = styled.div`
	flex: 1 1 ${({width}) => width && typeof width === 'string'? width: width + 'px'};
	padding-right: 5px;
	box-sizing: border-box;
	overflow: hidden;
`;

const HeaderSubcomponent = DataSubcomponent.withComponent(ColumnDropdown);

const renderHeaderCellStacked1 = (props) => 
	<React.Fragment>
		<FlexRow>
			<HeaderSubcomponent {...props} width={70} dropdownWidth={400} dataKey='CID' label='CID' />
			<HeaderSubcomponent {...props} width={40} dropdownWidth={140} dataKey='Category' label='Cat' />
		</FlexRow>
		<FlexRow>
			<HeaderSubcomponent {...props} width={70} dropdownWidth={200} dataKey='Clause' label='Clause' />
			<HeaderSubcomponent {...props} width={40} dropdownWidth={150} dataKey='Page' label='Page' dataRenderer={renderPage} />
		</FlexRow>
		<FlexRow>
			<HeaderSubcomponent {...props} width={90} dropdownWidth={300} dataKey='CommenterName' label='Commenter' />
			<HeaderSubcomponent {...props} width={30} dataKey='Vote' label='Vote' />
			<HeaderSubcomponent {...props} width={30} dataKey='MustSatisfy' label='MS' />
		</FlexRow>
	</React.Fragment>

const renderDataCellStacked1 = ({rowData}) => {
	return (
		<React.Fragment>
			<FlexRow>
				<DataSubcomponent width={70} style={{fontWeight: 'bold'}}>{rowData.CID}</DataSubcomponent>
				<DataSubcomponent width={40}>{rowData.Category}</DataSubcomponent>
			</FlexRow>
			<FlexRow>
				<DataSubcomponent width={70} style={{fontStyle: 'italic'}}>{rowData.Clause}</DataSubcomponent>
				<DataSubcomponent width={40}>{renderPage(rowData.Page)}</DataSubcomponent>
			</FlexRow>
			<FlexRow>{renderCommenter(rowData)}</FlexRow>
		</React.Fragment>
	)
}

const renderHeaderCellStacked2 = (props) =>
	<React.Fragment>
		<HeaderSubcomponent {...props} dataKey='AssigneeName' label='Assignee' />
		<HeaderSubcomponent {...props} dataKey='Submission' label='Submission' />
	</React.Fragment>

const renderDataCellStacked2 = ({rowData}) => 
	<React.Fragment>
		<div>{rowData['AssigneeName'] || 'Not Assigned'}</div>
		<div>{rowData['Submission'] || 'None'}</div>
	</React.Fragment>

const renderHeaderCellStacked3 = (props) => 
	<React.Fragment>
		<HeaderSubcomponent {...props} dataKey='AdHoc' label='Ad-hoc' />
		<HeaderSubcomponent {...props} dataKey='CommentGroup' label='Comment Group' dropdownWidth={300} />
	</React.Fragment>

const renderDataCellStacked3 = ({rowData}) =>
	<React.Fragment>
		<div>{rowData['AdHoc'] || ''}</div>
		<div>{rowData['CommentGroup'] || ''}</div>
	</React.Fragment>

const renderHeaderCellResolution = (props) => 
	<React.Fragment>
		<HeaderSubcomponent {...props} dropdownWidth={150} dataKey='ResnStatus' label='Resolution Status' />
		<HeaderSubcomponent {...props} dataKey='Resolution' label='Resolution' />
	</React.Fragment>

const allColumns = Immutable.OrderedMap({
	Stack1:
		{label: 'CID/Cat/MS/...',
			width: 200, flexGrow: 1, flexShrink: 0,
			headerRenderer: renderHeaderCellStacked1,
			cellRenderer: renderDataCellStacked1},
	CID:
		{label: 'CID',
			width: 60, flexGrow: 1, flexShrink: 0,
			dropdownWidth: 400},
	CommenterName:
		{label: 'Commenter',
			width: 100, flexGrow: 1, flexShrink: 1},
	Vote:
		{label: 'Vote',
			width: 50, flexGrow: 1, flexShrink: 1},
	MustSatisfy:
		{label: 'MS',
			width: 36, flexGrow: 1, flexShrink: 0,
			cellRenderer: renderDataCellCheck},
	Category:
		{label: 'Cat',
			width: 36, flexGrow: 1, flexShrink: 0},
	Clause:
		{label: 'Clause',
			width: 100, flexGrow: 1, flexShrink: 0},
	Page:
		{label: 'Page',
			width: 80, flexGrow: 1, flexShrink: 0,
			dataRenderer: renderPage,
			cellRenderer: ({rowData, dataKey}) => renderPage(rowData[dataKey])},
	Comment:
		{label: 'Comment',
			width: 400, flexGrow: 1, flexShrink: 1,
			cellRenderer: ({rowData, dataKey}) => renderTextBlock(rowData[dataKey])},
	ProposedChange:
		{label: 'Proposed Change',
			width: 400, flexGrow: 1, flexShrink: 1,
			cellRenderer: ({rowData, dataKey}) => renderTextBlock(rowData[dataKey])},
	Stack2:
		{label: 'Ad Hoc/Group',
			width: 150, flexGrow: 1, flexShrink: 1,
			headerRenderer: renderHeaderCellStacked3,
			cellRenderer: renderDataCellStacked3},
	AdHoc:
		{label: 'Ad Hoc',
			width: 100, flexGrow: 1, flexShrink: 1},
	CommentGroup:
		{label: 'Group',
			width: 150, flexGrow: 1, flexShrink: 1,
			dropdownWidth: 300},
	Stack3:
		{label: 'Assignee/Submission',
			width: 250, flexGrow: 1, flexShrink: 1,
			headerRenderer: renderHeaderCellStacked2,
			cellRenderer: renderDataCellStacked2},
	AssigneeName:
		{label: 'Assignee',
			width: 150, flexGrow: 1, flexShrink: 1},
	Submission:
		{label: 'Submission',
			width: 150, flexGrow: 1, flexShrink: 1,
			dropdownWidth: 300},
	Status:
		{label: 'Status',
			width: 150, flexGrow: 1, flexShrink: 1,
			dropdownWidth: 250},
	ApprovedByMotion:
		{label: 'Motion Number',
			width: 80, flexGrow: 1, flexShrink: 1,
			dropdownWidth: 200},
	Resolution:
		{label: 'Resolution',
			width: 400, flexGrow: 1, flexShrink: 1,
			headerRenderer: renderHeaderCellResolution,
			cellRenderer: renderDataCellResolution},
	Editing:
		{label: 'Editing',
			width: 300, flexGrow: 1, flexShrink: 1,
			headerRenderer: renderHeaderCellEditing,
			cellRenderer: renderDataCellEditing}
});

const editViewL = [
	{key: 'Stack1'},
	{key: 'Comment'},
	{key: 'ProposedChange'}
];

const editViewM = [
	{key: 'Stack1'},
	{key: 'Comment'}
];

const editViewS = [
	{key: 'Stack1'}
];

const view1L = [
	{key: 'Stack1'},
	{key: 'Comment'},
	{key: 'ProposedChange'},
	{key: 'Stack2'},
	{key: 'Stack3'},
	{key: 'Status'},
	{key: 'ApprovedByMotion'},
	{key: 'Resolution'},
	{key: 'Editing'}
];

const viewsByMedia = {
	L: {'1': view1L, '2': view1L, 'Edit': editViewL},
	M: {'1': view1L, '2': view1L, 'Edit': editViewM},
	S: {'1': view1L, '2': view1L, 'Edit': editViewS}
};

const getDefaultColumnsConfig = (view) => allColumns.map((col, key) => {
	const v = view.find(v => v.key === key);
	return {
		width: (v && v.width)? v.width: col.width,
		visible: !!v
	}
}).toMap();

const getDefaultTableConfig = (view) => {
	let media;
	//console.log(window.matchMedia("(min-width: 1024px)").matches)
	if (window.matchMedia("(max-width: 768px)").matches)
		media = 'S'
	else if (window.matchMedia("(max-width: 1024px)").matches)
		media = 'M'
	else
		media = 'L'
	const columns = getDefaultColumnsConfig(viewsByMedia[media][view])

	return {
		fixed: false,
		columns,
		media
	}
};

const tableViews = ['1', '2', 'Edit'];

const defaultTablesConfig = tableViews.reduce((config, view) => ({...config, [view]: getDefaultTableConfig(view)}), {});

function ColumnViewSelector({tableView, setTableView}) {
	return tableViews.map(view => 
		<Button
			key={view}
			isActive={tableView === view}
			onClick={e => setTableView(view)}
		>
			{view}
		</Button>
	)
}

function setClipboard(selected, comments) {

	const cmts = comments.filter(c => selected.includes(c.CID))

	const td = d => `<td>${d}</td>`
	const th = d => `<th>${d}</th>`
	const header = `
		<tr>
			${th('CID')}
			${th('Page')}
			${th('Clause')}
			${th('Comment')}
			${th('Proposed Change')}
		</tr>`
	const row = c => `
		<tr>
			${td(c.CID)}
			${td(c.Page)}
			${td(c.Clause)}
			${td(c.Comment)}
			${td(c.ProposedChange)}
		</tr>`
	const table = t => `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid black;}
			td {vertical-align: top;}
		</style>
		<table>
			${header}
			${t.map(c => row(c))}
		</table>`

	const text = table(cmts)

	copyToClipboard(text, {asHtml: true});
}

function commentsRowGetter({rowIndex, data, dataMap}) {
	const c = data[dataMap[rowIndex]]
	if (rowIndex > 0 && data[dataMap[rowIndex - 1]].CommentID === c.CommentID) {
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

function Comments(props) {
	const history = useHistory()
	const {ballotId} = useParams()
	const [split, setSplit] = React.useState(0.5);
	const [editKey, setEditKey] = React.useState(new Date().getTime());
	const [showHistory, setShowHistory] = React.useState(false);

	let tableView
	if (tableViews.includes(props.tableView)) {
		tableView = props.tableView
	}
	else {
		tableView = tableViews[0]
		props.setTableView(tableView)
	}
	const tableConfig = props.tablesConfig[tableView] || defaultTablesConfig[tableView];

	React.useEffect(() => setEditKey(new Date().getTime()), [props.selected])

	/* If we change the table config signficantly we want to remount the table component,
	 * so we create a key id for the component that depends on signficant parameters */
	const [tableId, columns] = React.useMemo(() => {
		let id = tableView
		if (tableConfig) {
			if (tableConfig.fixed) id += 'fixed';
			tableConfig.columns.forEach((v, k) => {if (v.visible) id += k});
		}
		let columns = allColumns.filter((col, key) => tableConfig.columns.has(key)? tableConfig.columns.get(key).visible: true)
		return [id, columns]
	}, [tableView, tableConfig]);

	/* Act on a change to the ballotId in the URL */
	React.useEffect(() => {
		if (ballotId) {
			if (ballotId !== props.ballotId) {
				/* Routed here with parameter ballotId specified, but not matching stored ballotId.
				 * Store the ballotId and get comments for this ballotId */
				props.setBallotId(ballotId)
				props.getComments(ballotId)
			}
			else if (!props.loading && (!props.valid || props.commentBallotId !== ballotId)) {
				props.getComments(ballotId)
			}
		}
		else if (props.ballotId) {
			history.replace(`/Comments/${props.ballotId}`)
		}
	}, [ballotId])

	const refresh = () => props.getComments(ballotId);

	const ballotSelected = (ballotId) => history.push(`/Comments/${ballotId}`);

	const setTableDetailSplit = (deltaX) => setSplit(split => split - deltaX/window.innerWidth);

	const table =
		<AppTable
			key={tableId}
			columns={columns}
			defaultTableConfig={defaultTablesConfig[tableView]}
			tableView={tableView}
			headerHeight={62} //{isStacked? 66: 22}
			controlColumn
			estimatedRowHeight={64}
			rowGetter={commentsRowGetter}
			loading={props.loading}
			dataSet='comments'
			rowKey='CID'
			resizeWidth={tableView === 'Edit'? setTableDetailSplit: undefined}
		/>

	const body = (tableView === 'Edit')?
		<React.Fragment>
			<div style={{flex: `${100 - split*100}%`, overflow: 'hidden', boxSizing: 'border-box'}}>
				{table}
			</div>
			<CommentDetail
				style={{flex: `${split*100}%`, height: '100%', overflow: 'auto', boxSizing: 'border-box'}}
				key={editKey} //props.selected}
			/>
		</React.Fragment>:
		table

	return (
		<React.Fragment>

			<TopRow>
				<BallotSelector onBallotSelected={ballotSelected} />
				<div>
					<ColumnViewSelector
						tableView={props.tableView}
						setTableView={props.setTableView}
					/>
					<Button onClick={e => setClipboard(props.selected, props.comments)}>Copy</Button>
					<CommentsExport ballotId={ballotId} />
					<CommentsImport ballotId={ballotId} />
					<ColumnSelector allColumns={allColumns}	/>
					<ActionButton name='history' title='History' isActive={showHistory} onClick={() => setShowHistory(true)} />
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>

			<ShowFilters
				dataSet={dataSet}
			/>

			<TableRow>
				{body}
			</TableRow>

			<CommentsTimelineModal
				isOpen={showHistory}
				close={() => setShowHistory(false)}
			/>

		</React.Fragment>
	)
}

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const TableRow = styled.div`
	flex: 1;	/* remaining height */
	overflow: hidden; /* prevent content increasing height */
	width: 100%;
	display: flex;
	align-content: center;
`;

Comments.propTypes = {
	selected: PropTypes.array.isRequired,
	ballotId: PropTypes.string.isRequired,
	commentBallotId: PropTypes.string.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	comments: PropTypes.arrayOf(PropTypes.object).isRequired,
	commentsMap: PropTypes.arrayOf(PropTypes.number).isRequired,
}

const dataSet = 'comments'
export default connect(
	(state, ownProps) => {
		return {
			ballotId: state.ballots.ballotId,
			selected: state[dataSet].selected,
			expanded: state[dataSet].expanded,
			commentBallotId: state[dataSet].ballotId,
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
			comments: state[dataSet].comments,
			commentsMap: getDataMap(state, dataSet),
			tableView: state[dataSet].ui.tableView,
			tablesConfig: state[dataSet].ui.tablesConfig
		}
	},
	(dispatch, ownProps) => ({
		setSelected: ids => dispatch(setSelected(dataSet, ids)),
		getComments: ballotId => dispatch(getComments(ballotId)),
		setBallotId: ballotId => dispatch(setBallotId(ballotId)),
		setTableView: view => dispatch(uiSetProperty(dataSet, 'tableView', view)),
	})
)(Comments);