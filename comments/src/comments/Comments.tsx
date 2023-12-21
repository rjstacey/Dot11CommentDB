import React from 'react';
import styled from '@emotion/styled';

import {
	AppTable, SplitPanel, Panel, SelectExpandHeaderCell, SelectExpandCell, TableColumnHeader, TableColumnSelector, TableViewSelector, ShowFilters, GlobalFilter, IdSelector, IdFilter,
	ActionButton, ButtonGroup,
	ColumnProperties,
	HeaderCellRendererProps,
	CellRendererProps,
} from 'dot11-components';

import TopRow from '../components/TopRow';
import PathBallotSelector from '../components/PathBallotSelector';
import { editorCss } from './RichTextEditor';
import CommentDetail from './CommentDetail';
import { renderCommenter } from './CommentEdit';
import { renderSubmission } from './SubmissionSelector';
import CommentsImport from './CommentsImport';
import CommentsExport from './CommentsExport';
import CommentsCopy from './CommentsCopy';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { AccessLevel } from '../store/user';
import { selectBallot } from '../store/ballots';
import {
	fields,
	loadComments,
	clearComments,
	getCID,
	selectCommentsState,
	selectCommentsBallot_id,
	selectCommentsAccess,
	commentsSelectors,
	commentsActions,
	getCommentStatus,
	CommentResolution,
} from '../store/comments';
import { selectIsOnline } from '../store/offline';


const FlexRow = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	& > *:not(:last-child) {
		margin-right: 5px;
	}
`;

const renderPage = (page: string | number | null) => typeof page === 'number'? page.toFixed(2): page;

const TextBlockContainer = styled.div`
	overflow-wrap: break-word;
	& p {
		margin: 8px 0;
	}
	& p:first-of-type {
		margin: 0;
	}
`;

const renderTextBlock = (value: string) => {
	if (!value)
		return ''
	return (
		<TextBlockContainer>
			{value.split('\n').map((line, i) => <p key={i}>{line}</p>)}
		</TextBlockContainer>
	)
}


/*
 * The data cell rendering functions are pure functions (dependent only on input parameters)
 */
const renderDataCellCheck = ({rowData, dataKey}: CellRendererProps) => rowData[dataKey]? '\u2714': '';

const renderHeaderCellEditing = (props: HeaderCellRendererProps) =>
	<>
		<HeaderSubcomponent {...props} dataKey='EditStatus' label='Editing Status' /*dropdownWidth={150}*/ />
		<HeaderSubcomponent {...props} dataKey='EditInDraft' label='In Draft' /*dropdownWidth={200}*/ />
		<HeaderSubcomponent {...props} dataKey='EditNotes' label='Notes' />
	</>

const renderDataCellEditing = ({rowData}: {rowData: CommentResolution}) => 
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

function renderDataCellResolution({rowData}: {rowData: CommentResolution}) {
	const resnColor = {
		'A': '#d3ecd3',
		'V': '#f9ecb9',
		'J': '#f3c0c0'
	}
	const status: string = resnStatusMap[rowData['ResnStatus'] || ''] || ''
	return (
		<ResolutionContainter
			color={resnColor[rowData['ResnStatus'] || '']}
		>
			<div>{status}</div>
			<div dangerouslySetInnerHTML={{__html: rowData['Resolution'] || ''}}/>
		</ResolutionContainter>
	)
}


const DataSubcomponent = styled.div<{width?: number | string}>`
	flex: 1 1 ${({width}) => width && typeof width === 'string'? width: width + 'px'};
	padding-right: 5px;
	box-sizing: border-box;
	overflow: hidden;
`;

const HeaderSubcomponent = DataSubcomponent.withComponent(TableColumnHeader);

const renderHeaderCellStacked1 = (props: HeaderCellRendererProps) => 
	<>
		<FlexRow>
			<HeaderSubcomponent
				{...props}
				width={70}
				dataKey='CID'
				label='CID'
				//dropdownWidth={400}
				customFilterElement=
					<IdFilter
						selectors={commentsSelectors}
						actions={commentsActions}
						dataKey='CID'
					/>
			/>
			<HeaderSubcomponent {...props} width={40} dataKey='Category' label='Cat' /*dropdownWidth={140}*/ />
		</FlexRow>
		<FlexRow>
			<HeaderSubcomponent {...props} width={70} dataKey='Clause' label='Clause' /*dropdownWidth={200}*/ />
			<HeaderSubcomponent {...props} width={40} dataKey='Page' label='Page' /*dataRenderer={renderPage} dropdownWidth={150}*/ />
		</FlexRow>
		<FlexRow>
			<HeaderSubcomponent {...props} width={90} dataKey='CommenterName' label='Commenter' /*dropdownWidth={300}*/ />
			<HeaderSubcomponent {...props} width={30} dataKey='Vote' label='Vote' />
			<HeaderSubcomponent {...props} width={30} dataKey='MustSatisfy' label='MS' />
		</FlexRow>
	</>

const renderDataCellStacked1 = ({rowData}: {rowData: CommentResolution}) => {
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

const renderHeaderCellStacked2 = (props: HeaderCellRendererProps) =>
	<>
		<HeaderSubcomponent {...props} dataKey='AssigneeName' label='Assignee' />
		<HeaderSubcomponent {...props} dataKey='Submission' label='Submission' />
	</>

const renderDataCellStacked2 = ({rowData}: {rowData: CommentResolution}) => 
	<>
		<div>{rowData['AssigneeName'] || 'Not Assigned'}</div>
		<div>{renderSubmission(rowData['Submission'])}</div>
	</>

const renderHeaderCellStacked3 = (props: HeaderCellRendererProps) => 
	<>
		<HeaderSubcomponent {...props} dataKey='AdHoc' label='Ad-hoc' />
		<HeaderSubcomponent {...props} dataKey='CommentGroup' label='Comment Group' /*dropdownWidth={300}*/ />
	</>

const renderDataCellStacked3 = ({rowData}: {rowData: CommentResolution}) =>
	<>
		<div>{rowData['AdHoc'] || ''}</div>
		<div>{rowData['CommentGroup'] || ''}</div>
	</>

const renderHeaderCellResolution = (props: HeaderCellRendererProps) => 
	<>
		<HeaderSubcomponent {...props} dataKey='ResnStatus' label='Resolution Status' /*dropdownWidth={150}*/ />
		<HeaderSubcomponent {...props} dataKey='Resolution' label='Resolution' />
	</>

const tableColumns: ColumnProperties[] = [
	{key: '__ctrl__',
		width: 48, flexGrow: 0, flexShrink: 0,
		headerRenderer: p =>
			<SelectExpandHeaderCell
				customSelectorElement=
					<IdSelector
						style={{width: '200px'}}
						selectors={commentsSelectors}
						actions={commentsActions}
						dataKey='CID'
						focusOnMount
					/>
				{...p}
			/>,
		cellRenderer: p => <SelectExpandCell selectors={commentsSelectors} actions={commentsActions} {...p} />},
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
		cellRenderer: ({rowData}: {rowData: CommentResolution}) => <ResolutionContainter dangerouslySetInnerHTML={{__html: rowData['Notes']}}/>},
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
	let comment = entities[ids[rowIndex]];
	comment = {
		...comment,
		Status: getCommentStatus(comment),
		CID: getCID(comment)
	}
	if (rowIndex === 0)
		return comment;
	const prevComment = entities[ids[rowIndex-1]];
	if (comment.CommentID !== prevComment.CommentID)
		return comment;
	// Previous row holds the same comment
	return {
			...comment,
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

function Comments() {
	const dispatch = useAppDispatch();

	const isOnline = useAppSelector(selectIsOnline);

	const access = useAppSelector(selectCommentsAccess);
	const {selected} = useAppSelector(selectCommentsState);
	const commentsBallot_id = useAppSelector(selectCommentsBallot_id);
	const commentsBallot = useAppSelector((state) => commentsBallot_id? selectBallot(state, commentsBallot_id): undefined);

	const {isSplit} = useAppSelector(commentsSelectors.selectCurrentPanelConfig);
	const setIsSplit = (isSplit: boolean) => dispatch(commentsActions.setPanelIsSplit({isSplit}));

	const refresh = () => dispatch(commentsBallot_id? loadComments(commentsBallot_id): clearComments());

	return (
		<>
			<TopRow>
				<PathBallotSelector />
				<div style={{display: 'flex', alignItems: 'center'}}>
					<ButtonGroup>
						<div>Table view</div>
						<div style={{display: 'flex', alignItems: 'center'}}>
							<TableViewSelector selectors={commentsSelectors} actions={commentsActions} />
							<TableColumnSelector selectors={commentsSelectors} actions={commentsActions} columns={tableColumns} />
							<ActionButton
								name='book-open'
								title='Show detail'
								isActive={isSplit} 
								onClick={() => setIsSplit(!isSplit)} 
							/>
						</div>
					</ButtonGroup>
					{access >= AccessLevel.admin?
						<ButtonGroup>
							<div style={{textAlign: 'center'}}>Edit</div>
							<div style={{display: 'flex', alignItems: 'center'}}>
								<CommentsCopy />
								<CommentsImport
									ballot={commentsBallot}
									disabled={!isOnline}
								/>
								<CommentsExport
									ballot={commentsBallot}
									disabled={!isOnline}
								/>
							</div>
						</ButtonGroup>:
						<CommentsCopy />
					}
					<ActionButton
						name='refresh'
						title='Refresh'
						disabled={!isOnline}
						onClick={refresh}
					/>
				</div>
			</TopRow>

			<div style={{width: '100%', display: 'flex', alignItems: 'center'}}>
				<ShowFilters
					selectors={commentsSelectors}
					actions={commentsActions}
					fields={fields}
				/>
				<GlobalFilter
					selectors={commentsSelectors}
					actions={commentsActions}
				/>
			</div>

			<SplitPanel
				selectors={commentsSelectors}
				actions={commentsActions}
			>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={62}
						estimatedRowHeight={56}
						rowGetter={commentsRowGetter}
						selectors={commentsSelectors}
						actions={commentsActions}
					/>
				</Panel>
				<Panel style={{overflow: 'auto'}}>
					<CommentDetail
						key={selected.join()}
					/>
				</Panel>
			</SplitPanel>
		</>
	)
}

export default Comments;
