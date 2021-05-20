import PropTypes from 'prop-types'
import React from 'react'
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import copyToClipboard from 'copy-html-to-clipboard'

import AppTable, {ControlHeader, ControlCell, ColumnDropdown, ColumnSelector, ShowFilters, IdFilter, IdSelector} from 'dot11-common/table'
import {Button, ActionButton} from 'dot11-common/lib/icons'
import {AccessLevel} from 'dot11-common/store/login'
import {getData, getSortedFilteredIds} from 'dot11-common/store/dataSelectors'
import {setTableView, upsertTableColumns} from 'dot11-common/store/ui'

import BallotSelector from '../ballots/BallotSelector'
import {editorCss} from './ResolutionEditor'
import CommentDetail, {renderCommenter, renderPage, renderTextBlock} from './CommentDetail'
import {renderSubmission} from './SubmissionSelector'
import CommentsImport from './CommentsImport'
import CommentsExport from './CommentsExport'
import CommentsHistoryModal from './CommentHistory'

import {loadComments} from '../store/comments'
import {setBallotId} from '../store/ballots'

const dataSet = 'comments'

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

const CommentsColumnDropdown = (props) => <ColumnDropdown dataSet={dataSet} {...props}/>;
const HeaderSubcomponent = DataSubcomponent.withComponent(CommentsColumnDropdown);

const StyledIdFilter = styled(IdFilter)`
	margin: 10px 10px 0;
	line-height: 30px;
	padding-left: 20px;
	border: 1px solid #ccc;
	border-radius: 3px;
	:focus {
		outline: none;
		border: 1px solid deepskyblue;
	}
`;

const renderHeaderCellStacked1 = (props) => 
	<React.Fragment>
		<FlexRow>
			<HeaderSubcomponent {...props} width={70} dropdownWidth={400} dataKey='CID' label='CID' 
				customFilterElement=<StyledIdFilter dataSet={dataSet} dataKey='CID' />
			/>
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
		<div>{renderSubmission(rowData['Submission'])}</div>
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

const allColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <ControlHeader dataSet={dataSet} {...p} ><IdSelector dataSet={dataSet} focusOnMount /></ControlHeader>,
		cellRenderer: p => <ControlCell dataSet={dataSet} {...p} />},
	{key: 'Stack1',
		label: 'CID/Cat/MS/...',
		width: 200, flexGrow: 1, flexShrink: 0,
		headerRenderer: renderHeaderCellStacked1,
		cellRenderer: renderDataCellStacked1},
	{key: 'CID',
		label: 'CID',
		width: 60, flexGrow: 1, flexShrink: 0,
		dropdownWidth: 400},
	{key: 'CommenterName',
		label: 'Commenter',
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'Vote',
		label: 'Vote',
		width: 50, flexGrow: 1, flexShrink: 1},
	{key: 'MustSatisfy',
		label: 'MS',
		width: 36, flexGrow: 1, flexShrink: 0,
		cellRenderer: renderDataCellCheck},
	{key: 'Category',
		label: 'Cat',
		width: 36, flexGrow: 1, flexShrink: 0},
	{key: 'Clause',
		label: 'Clause',
		width: 100, flexGrow: 1, flexShrink: 0},
	{key: 'Page',
		label: 'Page',
		width: 80, flexGrow: 1, flexShrink: 0,
		dataRenderer: renderPage,
		cellRenderer: ({rowData, dataKey}) => renderPage(rowData[dataKey])},
	{key: 'Comment',
		label: 'Comment',
		width: 400, flexGrow: 1, flexShrink: 1,
		cellRenderer: ({rowData, dataKey}) => renderTextBlock(rowData[dataKey])},
	{key: 'ProposedChange',
		label: 'Proposed Change',
		width: 400, flexGrow: 1, flexShrink: 1,
		cellRenderer: ({rowData, dataKey}) => renderTextBlock(rowData[dataKey])},
	{key: 'Stack2',
		label: 'Ad Hoc/Group',
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCellStacked3,
		cellRenderer: renderDataCellStacked3},
	{key: 'AdHoc',
		label: 'Ad Hoc',
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'CommentGroup',
		label: 'Group',
		width: 150, flexGrow: 1, flexShrink: 1,
		dropdownWidth: 300},
	{key: 'Notes',
		label: 'Notes',
		width: 150, flexGrow: 1, flexShrink: 1,
		dropdownWidth: 300,
		cellRenderer: ({rowData}) => <ResolutionContainter dangerouslySetInnerHTML={{__html: rowData['Notes']}}/>},
	{key: 'Stack3',
		label: 'Assignee/Submission',
		width: 250, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCellStacked2,
		cellRenderer: renderDataCellStacked2},
	{key: 'AssigneeName',
		label: 'Assignee',
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'Submission',
		label: 'Submission',
		width: 150, flexGrow: 1, flexShrink: 1,
		dropdownWidth: 300},
	{key: 'Status',
		label: 'Status',
		width: 150, flexGrow: 1, flexShrink: 1,
		dropdownWidth: 250},
	{key: 'ApprovedByMotion',
		label: 'Motion Number',
		width: 80, flexGrow: 1, flexShrink: 1,
		dropdownWidth: 200},
	{key: 'Resolution',
		label: 'Resolution',
		width: 400, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCellResolution,
		cellRenderer: renderDataCellResolution},
	{key: 'Editing',
		label: 'Editing',
		width: 300, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCellEditing,
		cellRenderer: renderDataCellEditing}
];

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

const getDefaultColumnsConfig = (view) => allColumns.reduce((obj, col) => {
	const key = col.key;
	const v = view.find(v => v.key === key);
	obj[key] = {
		label: col.label,
		width: (v && v.width)? v.width: col.width,
		visible: !!v
	}
	return obj
}, {});

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

const defaultTablesConfig = tableViews.reduce((config, view) => {
	config[view] = getDefaultTableConfig(view);
	return config;
}, {})

function TableViewSelector({tableView, setTableView}) {
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

function commentsRowGetter({rowIndex, data}) {
	const c = data[rowIndex]
	if (rowIndex > 0 && data[rowIndex - 1].CommentID === c.CommentID) {
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

function Comments({
		access,
		ballotId,
		setBallotId, 
		valid,
		loading,
		commentBallotId,
		loadComments, 
		tableView,
		setTableView,
		tableConfig,
		upsertTableColumns,
		comments,
		selected}) {

	const history = useHistory();
	const queryBallotId = useParams().ballotId;
	const [split, setSplit] = React.useState(0.5);
	const [editKey, setEditKey] = React.useState(new Date().getTime());
	const [showHistory, setShowHistory] = React.useState(false);

	/* On mount, if the store does not contain default configuration for each of our views, then add them */
	React.useEffect(() => {
		for (const view in defaultTablesConfig) {
			const columnsConfig = {}
			for (const key in defaultTablesConfig[view].columns) {
				/* Columns with a 'visible' property (identified by a 'label' property) will appear in
				 * the ColumnSelector. We want to exclude control column since it can't be removed. */
				 const defColumnConfig = defaultTablesConfig[view].columns[key]
				if (!tableConfig.columns[key]) {
					columnsConfig[key] = {
						label: defColumnConfig.label,
						width: defColumnConfig.width
					}
					if (key !== '__ctrl__')
						columnsConfig[key].visible = defColumnConfig.visible;
				}
				else {
					if (key !== '__ctrl__' &&
						!tableConfig.columns[key].hasOwnProperty('visible'))
						columnsConfig[key].visible = defColumnConfig.visible
					if (!tableConfig.columns[key].hasOwnProperty('label'))
						columnsConfig[key].visible = defColumnConfig.label
				}
			}
			if (Object.keys(columnsConfig).length)
				upsertTableColumns(view, columnsConfig);
		}
		if (!Object.keys(defaultTablesConfig).includes(tableView))
			setTableView(Object.keys(defaultTablesConfig)[0])
	}, []);

	React.useEffect(() => setEditKey(new Date().getTime()), [selected])

	/* If we change the table config signficantly we want to remount the table component,
	 * so we create a key id for the component that depends on signficant parameters */
	const [tableId, columns] = React.useMemo(() => {

		const columns = allColumns.filter(col => 
			(tableConfig.columns[col.key] && tableConfig.columns[col.key].hasOwnProperty('visible'))
				? tableConfig.columns[col.key].visible
				: true
		);

		const id = 
			(tableConfig.fixed? 'fixed': '') +
			columns.map(col => col.key).join();

		return [id, columns]
	}, [tableView, tableConfig]);

	/* Act on a change to the ballotId in the URL */
	React.useEffect(() => {
		if (queryBallotId) {
			if (queryBallotId !== ballotId) {
				/* Routed here with parameter ballotId specified, but not matching stored ballotId.
				 * Store the ballotId and get comments for this ballotId */
				setBallotId(queryBallotId);
				loadComments(queryBallotId);
			}
			else if (!loading && (!valid || commentBallotId !== queryBallotId)) {
				loadComments(queryBallotId);
			}
		}
		else if (ballotId) {
			history.replace(`/Comments/${ballotId}`);
		}
	}, [queryBallotId, commentBallotId, ballotId, valid, loading]);

	const refresh = () => loadComments(ballotId);

	const ballotSelected = (ballotId) => history.push(`/Comments/${ballotId}`);

	const setTableDetailSplit = (deltaX) => setSplit(split => split - deltaX/window.innerWidth);

	const table =
		<AppTable
			key={tableId}
			columns={columns}
			tableView={tableView}
			headerHeight={62}
			estimatedRowHeight={64}
			rowGetter={commentsRowGetter}
			dataSet={dataSet}
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
				key={editKey}
				access={access}
			/>
		</React.Fragment>:
		table

	return (
		<React.Fragment>

			<TopRow>
				<BallotSelector onBallotSelected={ballotSelected} />
				<div>
					<TableViewSelector
						tableView={tableView}
						setTableView={setTableView}
					/>
					<ColumnSelector dataSet={dataSet} />
					<ActionButton name='copy' title='Copy to clipboard' disabled={selected.length === 0} onClick={e => setClipboard(selected, comments)} />
					<ActionButton name='history' title='History' isActive={showHistory} onClick={() => setShowHistory(true)} />
					{access >= AccessLevel.SubgroupAdmin && <CommentsImport ballotId={ballotId} />}
					{access >= AccessLevel.SubgroupAdmin && <CommentsExport ballotId={ballotId} />}
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>

			<ShowFilters
				dataSet={dataSet}
			/>

			<TableRow>
				{body}
			</TableRow>

			<CommentsHistoryModal
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
	ballotId: PropTypes.string.isRequired,
	selected: PropTypes.array.isRequired,
	commentBallotId: PropTypes.string.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	comments: PropTypes.arrayOf(PropTypes.object).isRequired,
	tableView: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
	tableConfig: PropTypes.object.isRequired,
	loadComments: PropTypes.func.isRequired,
	setBallotId: PropTypes.func.isRequired,
	setTableView: PropTypes.func.isRequired,
	upsertTableColumns: PropTypes.func.isRequired
}

export default connect(
	(state) => {
		const user = state.login.user;
		const tableView = state[dataSet].ui.view;
		const tableConfig = state[dataSet].ui.tablesConfig[tableView];
		return {
			ballotId: state.ballots.ballotId,
			selected: state[dataSet].selected,
			commentBallotId: state[dataSet].ballotId,
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
			comments: getData(state, dataSet),
			tableView,
			tableConfig
		}
	},
	(dispatch) => ({
		loadComments: ballotId => dispatch(loadComments(ballotId)),
		setBallotId: ballotId => dispatch(setBallotId(ballotId)),
		setTableView: view => dispatch(setTableView(dataSet, view)),
		upsertTableColumns: (view, columns) => dispatch(upsertTableColumns(dataSet, view, columns)),
	})
)(Comments);