import React from 'react';
import styled from '@emotion/styled';

import {
	AppTable, 
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	HeaderCellRendererProps,
	ColumnProperties,
	ActionButton,
	ShowFilters,
	TableColumnSelector,
	SplitPanelButton,
	SplitPanel, Panel,
	CellRendererProps,
	displayDateRange,
	GlobalFilter
} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	loadBallotParticipation,
	selectBallotParticipationState,
    selectBallotSeries,
    selectBallotEntities,
	ballotParticipationSelectors,
	ballotParticipationActions,
    BallotSeriesParticipationSummary,
    RecentBallotSeriesParticipation,
	fields
} from '../store/ballotParticipation';

import MemberDetail from '../members/MemberDetail';
import { renderNameAndEmail } from '../members/Members';
import BulkStatusUpdate from '../sessionParticipation/BulkStatusUpdate';

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

function BallotSeriesSummary() {
	const {ids: ballotSeriesIds, entities: ballotSeriesEntities} = useAppSelector(selectBallotSeries);
    const ballotEntities = useAppSelector(selectBallotEntities);

	const elements = ballotSeriesIds.map(id => {
		const ballotSeries = ballotSeriesEntities[id]!;
        const ballotIdsStr = ballotSeries.ballotIds.map(id => ballotEntities[id]!.BallotID).join(', ');
		return (
			<div key={id} style={{display: 'flex', flexDirection: 'column'}}>
                <div>{ballotEntities[id]!.Project}</div>
				<div>{displayDateRange(ballotSeries.start, ballotSeries.end)}</div>
				<div>{ballotIdsStr}</div>
			</div>
		)
	});

	return <>{elements}</>
}

const renderHeaderNameAndEmail = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='Name' label='Name' />
		<TableColumnHeader {...props} dataKey='Email' label='Email' />
	</>

const renderBallotSeriesParticipationSummary = (summary?: BallotSeriesParticipationSummary) => {
	let voteSummary = 'Not in pool';
	let excused = '';
	if (summary) {
		voteSummary = summary.vote? summary.vote: 'Did not vote';
		if (summary.commentCount)
			voteSummary += ` (${summary.commentCount} comments)`;
	}

	return (
        <div style={{display: 'flex', flexDirection: 'column'}}>
            <span>{voteSummary}</span>
            <span>{excused}</span>
        </div>
    )
}

const tableColumns: ColumnProperties[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: SelectHeaderCell,
		cellRenderer: p =>
			<SelectCell
				selectors={ballotParticipationSelectors}
				actions={ballotParticipationActions}
				{...p}
			/>},
	{key: 'SAPIN', 
		label: 'SA PIN',
		width: 80, flexGrow: 1, flexShrink: 1},
	{key: 'Name', 
		label: 'Name',
		width: 200, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderNameAndEmail,
		cellRenderer: renderNameAndEmail},
	{key: 'Affiliation', 
		label: 'Affiliation',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Status', 
		label: 'Status',
		width: 150, flexGrow: 1, flexShrink: 1},
	{key: 'ExpectedStatus', 
		label: 'Expected status',
		width: 150, flexGrow: 1, flexShrink: 1},
    {key: 'Summary', 
		label: 'Summary',
		width: 150, flexGrow: 1, flexShrink: 1},
];

function BallotParticipation() {
	const dispatch = useAppDispatch();
	const {valid, selected} = useAppSelector(selectBallotParticipationState);
	const {ids: ballotSeriesIds, entities: ballotSeriesEntities} = useAppSelector(selectBallotSeries);

	React.useEffect(() => {
		if (!valid)
			dispatch(loadBallotParticipation());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const columns = React.useMemo(() => {
		return tableColumns.concat(
			ballotSeriesIds.map((id, i) => {
				const ballotSeries = ballotSeriesEntities[id]!;
				const cellRenderer = ({rowData}: CellRendererProps<RecentBallotSeriesParticipation>) => {
					const summary = rowData.ballotSeriesParticipationSummaries.find((s) => s.id === ballotSeries.id);
					return renderBallotSeriesParticipationSummary(summary);
				}
				const column = {
					key: 'ballotSeries_' + i,
					label: ballotSeries.project,
					width: 200, flexGrow: 1, flexShrink: 1,
					cellRenderer
				}
				return column;
			}))
	}, [ballotSeriesIds, ballotSeriesEntities]);

	const refresh = () => dispatch(loadBallotParticipation());

	return (
		<>
			<TopRow>
				<BallotSeriesSummary />
				<div style={{display: 'flex'}}>
					<BulkStatusUpdate isSession={false} />
					<TableColumnSelector
						selectors={ballotParticipationSelectors}
						actions={ballotParticipationActions}
						columns={columns}
					/>
					<SplitPanelButton
						selectors={ballotParticipationSelectors}
						actions={ballotParticipationActions}
					/>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>

			<div style={{display: 'flex', width: '100%', alignItems: 'center'}}>
				<ShowFilters
					selectors={ballotParticipationSelectors}
					actions={ballotParticipationActions}
					fields={fields}
				/>
				<GlobalFilter
					selectors={ballotParticipationSelectors}
					actions={ballotParticipationActions}
				/>
			</div>

			<SplitPanel
				selectors={ballotParticipationSelectors}
				actions={ballotParticipationActions}
			>
				<Panel>
					<AppTable
						columns={columns}
						headerHeight={40}
						estimatedRowHeight={50}
						selectors={ballotParticipationSelectors}
						actions={ballotParticipationActions}
					/>
				</Panel>
				<Panel style={{overflow: 'auto'}}>
					<MemberDetail key={selected.join()} selected={selected} />
				</Panel>
			</SplitPanel>
		</>
	)
}

export default BallotParticipation;
