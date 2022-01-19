import PropTypes from 'prop-types';
import React from 'react';
import {useHistory, useParams} from 'react-router-dom';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';

import AppTable, {SplitPanel, Panel, SelectExpandHeader, SelectExpandCell, TableColumnHeader, TableColumnSelector, TableViewSelector, ShowFilters, IdSelector, IdFilter} from 'dot11-components/table';
import {Button, ActionButton, ButtonGroup} from 'dot11-components/form';
import {AccessLevel} from 'dot11-components/lib';
import {getEntities, getSortedFilteredIds, setProperty} from 'dot11-components/store/appTableData';

import BallotSelector from '../ballots/BallotSelector';
import {editorCss} from './ResolutionEditor';
import CommentDetail, {renderCommenter, renderPage, renderTextBlock} from './CommentDetail';
import {renderSubmission} from './SubmissionSelector';
import CommentsImport from './CommentsImport';
import CommentsExport from './CommentsExport';
import CommentHistory from './CommentHistory';
import CommentsCopy from './CommentsCopy';

import {fields, loadComments, loadCommentsSinceLastUpdate, clearComments, getCID, getCommentStatus, selectCommentsState, dataSet} from '../store/comments';
import {loadMembers, selectMembersState} from '../store/members';
import {setBallotId, loadBallots, getCurrentBallot, selectBallotsState} from '../store/ballots';

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
const renderDataCellCheck = ({rowData, dataKey}) => rowData[dataKey]? '\u2714': '';

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
			<HeaderSubcomponent {...props} width={70} dropdownWidth={400} dataKey='CID' label='CID' isId
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
				<DataSubcomponent width={70} style={{fontWeight: 'bold'}}>{getCID(rowData)}</DataSubcomponent>
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
		width: 48, flexGrow: 0, flexShrink: 0,
		headerRenderer: p =>
			<SelectExpandHeader
				dataSet={dataSet} 
				customSelectorElement=<IdSelector style={{width: '200px'}} dataSet={dataSet} dataKey='CID' focusOnMount />
				{...p}
			/>,
		cellRenderer: p => <SelectExpandCell dataSet={dataSet} {...p} />},
	{key: 'Stack1',
		label: 'CID/Cat/MS/...',
		width: 200, flexGrow: 1, flexShrink: 0,
		headerRenderer: renderHeaderCellStacked1,
		cellRenderer: renderDataCellStacked1},
	{key: 'CID',
		...fields.CID,
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


function commentsRowGetter({rowIndex, ids, entities}) {
	const currData = entities[ids[rowIndex]];
	if (rowIndex === 0)
		return currData;
	const prevData = entities[ids[rowIndex-1]];
	if (currData.CommentID !== prevData.CommentID)
		return currData;
	// Previous row holds the same comment
	return {
			...currData,
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

function Comments({access}) {

	const history = useHistory();
	const {ballotId} = useParams();

	const {valid, loading, ballot_id: commentsBallot_id, ui: uiProperty, selected} = useSelector(selectCommentsState);
	const {valid: ballotsValid, entities: ballotEntities} = useSelector(selectBallotsState);
	const currentBallot = useSelector(getCurrentBallot);
	const {valid: usersValid, loading: usersLoading} = useSelector(selectMembersState);

	const dispatch = useDispatch();
	const load = (ballot_id) => dispatch(loadComments(ballot_id));
	const clear = () => dispatch(clearComments());
	const setUiProperty = (property, value) => dispatch(setProperty(dataSet, property, value));

	React.useEffect(() => {
		if (ballotId) {
			if (!currentBallot || ballotId !== currentBallot.BallotID) {
				// Routed here with parameter ballotId specified, but not matching stored currentId; set the current ballot
				dispatch(setBallotId(ballotId));
			}
		}
		else if (currentBallot) {
			// Routed here with parameter ballotId unspecified, but current ballot has previously been selected; re-route to current ballot
			history.replace(`/comments/${currentBallot.BallotID}`);
		}
	}, [ballotId, ballotsValid]);

	React.useEffect(() => {
		if (loading)
			return;
		if ((!commentsBallot_id && currentBallot) ||
		    (currentBallot && commentsBallot_id !== currentBallot.id)) {
			console.log(commentsBallot_id, currentBallot);
			load(currentBallot.id);
		}
	}, [currentBallot, commentsBallot_id]);

	const refresh = () => {
		load(currentBallot.id);
		dispatch(loadMembers());
	}

	const onBallotSelected = (ballot_id) => {
		const ballot = ballotEntities[ballot_id];
		if (ballot)
			history.push(`/comments/${ballot.BallotID}`); // Redirect to page with selected ballot
		else
			clear();
	}

	return <>
		<TopRow>
			<BallotSelector onBallotSelected={onBallotSelected} />
			<div style={{display: 'flex', alignItems: 'center'}}>
				<ButtonGroup>
					<div>Table view</div>
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
							<CommentsCopy />
							<CommentsImport ballot={currentBallot} />
							<CommentsExport ballot={currentBallot} />
						</div>
					</ButtonGroup>:
					<CommentsCopy />
				}
				<ActionButton
					name='refresh'
					title='Refresh'
					disabled={!currentBallot}
					onClick={refresh}
				/>
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
					estimatedRowHeight={56}
					rowGetter={commentsRowGetter}
					dataSet={dataSet}
				/>
			</Panel>
			<Panel style={{overflow: 'auto'}}>
				<CommentDetail
					key={selected.join()}
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
}

export default Comments;
