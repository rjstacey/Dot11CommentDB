import PropTypes from 'prop-types'
import React from 'react'
import {useHistory, useParams} from 'react-router-dom'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import copyToClipboard from 'copy-html-to-clipboard'

import AppTable, {SplitPanel, Panel, SelectExpandHeader, SelectExpandCell, TableColumnHeader, TableColumnSelector, TableViewSelector, ShowFilters, IdSelector, IdFilter} from 'dot11-components/table'
import {Button, ActionButton, ButtonGroup} from 'dot11-components/icons'
import {AccessLevel} from 'dot11-components/lib'
import {getEntities, getSortedFilteredIds} from 'dot11-components/store/dataSelectors'
import {setProperty} from 'dot11-components/store/ui'

import BallotSelector from '../ballots/BallotSelector'
import {editorCss} from './ResolutionEditor'
import CommentDetail, {renderCommenter, renderPage, renderTextBlock} from './CommentDetail'
import {renderSubmission} from './SubmissionSelector'
import CommentsImport from './CommentsImport'
import CommentsExport from './CommentsExport'
import CommentHistory from './CommentHistory'

import {fields, loadComments} from '../store/comments'
import {loadUsers} from '../store/users'
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
	<>
		<HeaderSubcomponent {...props} dropdownWidth={150} dataKey='EditStatus' label='Editing Status' />
		<HeaderSubcomponent {...props} dropdownWidth={200} dataKey='EditInDraft' label='In Draft' />
		<HeaderSubcomponent {...props} dataKey='EditNotes' label='Notes' />
	</>

const renderDataCellEditing = ({rowData}) => 
	<>
		{rowData.EditStatus === 'I' && <span>In D{rowData['EditInDraft']}</span>}
		{rowData.EditStatus === 'N' && <span>No change</span>}
		<ResolutionContainter
			dangerouslySetInnerHTML={{__html: rowData['EditNotes']}}
		/>
	</>

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

const CommentsTableColumnHeader = (props) => <TableColumnHeader dataSet={dataSet} {...props}/>;
const HeaderSubcomponent = DataSubcomponent.withComponent(CommentsTableColumnHeader);

const renderHeaderCellStacked1 = (props) => 
	<>
		<FlexRow>
			<HeaderSubcomponent {...props} width={70} dropdownWidth={400} dataKey='CID' label='CID' 
				customFilterElement=<IdFilter dataSet={dataSet} dataKey='CID' />
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
	</>

const renderDataCellStacked1 = ({rowData}) => {
	return (
		<>
			<FlexRow>
				<DataSubcomponent width={70} style={{fontWeight: 'bold'}}>{rowData.CID}</DataSubcomponent>
				<DataSubcomponent width={40}>{rowData.Category}</DataSubcomponent>
			</FlexRow>
			<FlexRow>
				<DataSubcomponent width={70} style={{fontStyle: 'italic'}}>{rowData.Clause}</DataSubcomponent>
				<DataSubcomponent width={40}>{renderPage(rowData.Page)}</DataSubcomponent>
			</FlexRow>
			<FlexRow>{renderCommenter(rowData)}</FlexRow>
		</>
	)
}

const renderHeaderCellStacked2 = (props) =>
	<>
		<HeaderSubcomponent {...props} dataKey='AssigneeName' label='Assignee' />
		<HeaderSubcomponent {...props} dataKey='Submission' label='Submission' />
	</>

const renderDataCellStacked2 = ({rowData}) => 
	<>
		<div>{rowData['AssigneeName'] || 'Not Assigned'}</div>
		<div>{renderSubmission(rowData['Submission'])}</div>
	</>

const renderHeaderCellStacked3 = (props) => 
	<>
		<HeaderSubcomponent {...props} dataKey='AdHoc' label='Ad-hoc' />
		<HeaderSubcomponent {...props} dataKey='CommentGroup' label='Comment Group' dropdownWidth={300} />
	</>

const renderDataCellStacked3 = ({rowData}) =>
	<>
		<div>{rowData['AdHoc'] || ''}</div>
		<div>{rowData['CommentGroup'] || ''}</div>
	</>

const renderHeaderCellResolution = (props) => 
	<>
		<HeaderSubcomponent {...props} dropdownWidth={150} dataKey='ResnStatus' label='Resolution Status' />
		<HeaderSubcomponent {...props} dataKey='Resolution' label='Resolution' />
	</>

const tableColumns = [
	{key: '__ctrl__',
		width: 48, flexGrow: 1, flexShrink: 0,
		headerRenderer: p =>
			<SelectExpandHeader
				dataSet={dataSet} 
				customSelectorElement=<IdSelector style={{width: '200px'}} dataSet={dataSet} focusOnMount />
				{...p}
			/>,
		cellRenderer: p => <SelectExpandCell dataSet={dataSet} {...p} />},
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
		...fields.CommenterName,
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'Vote',
		...fields.Vote,
		width: 50, flexGrow: 1, flexShrink: 1},
	{key: 'MustSatisfy',
		...fields.MustSatisfy,
		width: 36, flexGrow: 1, flexShrink: 0,
		cellRenderer: renderDataCellCheck},
	{key: 'Category',
		...fields.Category,
		width: 36, flexGrow: 1, flexShrink: 0},
	{key: 'Clause',
		...fields.Clause,
		width: 100, flexGrow: 1, flexShrink: 0},
	{key: 'Page',
		...fields.Page,
		width: 80, flexGrow: 1, flexShrink: 0,
		dataRenderer: renderPage,
		cellRenderer: ({rowData, dataKey}) => renderPage(rowData[dataKey])},
	{key: 'Comment',
		...fields.Comment,
		width: 400, flexGrow: 1, flexShrink: 1,
		cellRenderer: ({rowData, dataKey}) => renderTextBlock(rowData[dataKey])},
	{key: 'ProposedChange',
		...fields.ProposedChange,
		width: 400, flexGrow: 1, flexShrink: 1,
		cellRenderer: ({rowData, dataKey}) => renderTextBlock(rowData[dataKey])},
	{key: 'Stack2',
		label: 'Ad Hoc/Group',
		width: 150, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCellStacked3,
		cellRenderer: renderDataCellStacked3},
	{key: 'AdHoc',
		...fields.AdHoc,
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'CommentGroup',
		...fields.CommentGroup,
		width: 150, flexGrow: 1, flexShrink: 1,
		dropdownWidth: 300},
	{key: 'Notes',
		...fields.Notes,
		width: 150, flexGrow: 1, flexShrink: 1,
		dropdownWidth: 300,
		cellRenderer: ({rowData}) => <ResolutionContainter dangerouslySetInnerHTML={{__html: rowData['Notes']}}/>},
	{key: 'Stack3',
		label: 'Assignee/Submission',
		width: 250, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderCellStacked2,
		cellRenderer: renderDataCellStacked2},
	{key: 'AssigneeName',
		...fields.AssigneeName,
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'Submission',
		...fields.Submission,
		width: 150, flexGrow: 1, flexShrink: 1,
		dropdownWidth: 300},
	{key: 'Status',
		...fields.Status,
		width: 150, flexGrow: 1, flexShrink: 1,
		dropdownWidth: 250},
	{key: 'ApprovedByMotion',
		...fields.ApprovedByMotion,
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

const defaultAssignColumns = ['__ctrl__', 'Stack1', 'Comment', 'ProposedChange', 'Stack2', 'Stack3', 'Status'];
const defaultResolveColumns = [...defaultAssignColumns, 'ApprovedByMotion', 'Resolution'];
const defaultEditColumns = [...defaultResolveColumns, 'Editing'];

const getDefaultColumnsConfig = (shownKeys) => {
	const columnConfig = {};
	for (const column of tableColumns) {
		columnConfig[column.key] = {
			unselectable: column.key.startsWith('__'),
			width: column.width,
			shown: shownKeys.includes(column.key)
		}
	}
	return columnConfig;
};

const getDefaultTableConfig = (shownKeys) => {
	const fixed = (window.matchMedia("(max-width: 768px)").matches)? true: false;
	const columns = getDefaultColumnsConfig(shownKeys)
	return {fixed, columns}
};

const defaultTablesConfig = {
	'Assign': getDefaultTableConfig(defaultAssignColumns),
	'Resolve': getDefaultTableConfig(defaultResolveColumns),
	'Edit': getDefaultTableConfig(defaultEditColumns)
};

function setClipboard(selected, comments) {

	const td = d => `<td>${d}</td>`
	const th = d => `<th>${d}</th>`
	const header = `
		<tr>
			${th('CID')}
			${th('Page')}
			${th('Clause')}
			${th('Comment')}
			${th('Proposed Change')}
		</tr>`;
	const row = c => `
		<tr>
			${td(c.CID)}
			${td(c.Page)}
			${td(c.Clause)}
			${td(c.Comment)}
			${td(c.ProposedChange)}
		</tr>`;
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid black;}
			td {vertical-align: top;}
		</style>
		<table>
			${header}
			${selected.map(id => row(comments[id])).join('')}
		</table>`;

	copyToClipboard(table, {asHtml: true});
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
	loadUsers,
	tableView,
	tableConfig,
	uiProperty,
	setUiProperty,
	comments,
	selected
}) {
	const history = useHistory();
	const queryBallotId = useParams().ballotId;
	const [editKey, setEditKey] = React.useState(new Date().getTime());
	const [showHistory, setShowHistory] = React.useState(false);

	React.useEffect(() => setEditKey(new Date().getTime()), [selected])

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
			history.replace(`/comments/${ballotId}`);
		}
	}, [queryBallotId, commentBallotId, ballotId]);

	React.useEffect(loadUsers, []);
	
	const refresh = () => {
		loadComments(ballotId);
		loadUsers();
	}

	const ballotSelected = (ballotId) => history.push(`/comments/${ballotId}`);

	return <>
		<TopRow>
			<BallotSelector onBallotSelected={ballotSelected} />
			<div style={{display: 'flex', alignItems: 'center'}}>
				<ButtonGroup>
					<div style={{textAlign: 'center'}}>Table view</div>
					<div style={{display: 'flex', alignItems: 'center'}}>
						<TableViewSelector dataSet={dataSet} />
						<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
						<ActionButton
							name='book-open'
							title='Show detail'
							isActive={uiProperty.editView} 
							onClick={() => setUiProperty('editView', !uiProperty.editView)} 
						/>
					</div>
				</ButtonGroup>
				{access >= AccessLevel.SubgroupAdmin?
					<ButtonGroup>
						<div style={{textAlign: 'center'}}>Edit</div>
						<div style={{display: 'flex', alignItems: 'center'}}>
							<ActionButton
								name='copy'
								title='Copy to clipboard'
								disabled={selected.length === 0}
								onClick={e => setClipboard(selected, comments)}
							/>
							<CommentsImport ballotId={ballotId} />
							<CommentsExport ballotId={ballotId} />
						</div>
					</ButtonGroup>:
					<ActionButton
						name='copy'
						title='Copy to clipboard'
						disabled={selected.length === 0}
						onClick={e => setClipboard(selected, comments)}
					/>
				}
				<ActionButton name='refresh' title='Refresh' onClick={refresh} />
			</div>
		</TopRow>

		<ShowFilters
			dataSet={dataSet}
			fields={fields}
		/>

		<SplitPanel splitView={uiProperty.editView || false} >
			<Panel>
				<AppTable
					defaultTablesConfig={defaultTablesConfig}
					columns={tableColumns}
					headerHeight={62}
					estimatedRowHeight={64}
					rowGetter={commentsRowGetter}
					dataSet={dataSet}
					rowKey='CID'
				/>
			</Panel>
			<Panel>
				<CommentDetail
					key={editKey}
					access={access}
				/>
			</Panel>
		</SplitPanel>
	</>
}

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

Comments.propTypes = {
	access: PropTypes.number.isRequired,
	ballotId: PropTypes.string.isRequired,
	selected: PropTypes.array.isRequired,
	commentBallotId: PropTypes.string.isRequired,
	valid: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	comments: PropTypes.object.isRequired,
	loadComments: PropTypes.func.isRequired,
	setBallotId: PropTypes.func.isRequired,
	setUiProperty: PropTypes.func.isRequired,
}

export default connect(
	(state) => {
		const tableView = state[dataSet].ui.view;
		const tableConfig = state[dataSet].ui.tablesConfig[tableView];
		return {
			ballotId: state.ballots.ballotId,
			selected: state[dataSet].selected,
			commentBallotId: state[dataSet].ballotId,
			valid: state[dataSet].valid,
			loading: state[dataSet].loading,
			comments: getEntities(state, dataSet),
			uiProperty: state[dataSet].ui
		}
	},
	{
		loadComments,
		loadUsers,
		setBallotId,
		setUiProperty: (property, value) => setProperty(dataSet, property, value)
	}
)(Comments);