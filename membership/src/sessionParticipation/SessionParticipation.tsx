import React from 'react';
import styled from '@emotion/styled';
import { DateTime } from 'luxon';

import {
	AppTable, 
	SelectHeaderCell,
	SelectCell,
	TableColumnHeader,
	HeaderCellRendererProps,
	ColumnProperties,
	ActionButton,
	CellRendererProps,
	displayDateRange,
	ShowFilters,
	GlobalFilter,
	TableColumnSelector,
	SplitPanel, Panel, SplitPanelButton
} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	fields,
	loadAttendances,
	importAttendances,
	selectAttendancesState,
	selectSessionEntities,
	selectSessionIds,
	attendancesSelectors,
	attendancesActions
} from '../store/sessionParticipation';

import type { MemberAttendances, SessionAttendanceSummary } from '../store/sessionParticipation';

import { renderNameAndEmail } from '../members/Members';
import MemberDetail from '../members/MemberDetail';

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

function SessionSummary() {
	const dispatch = useAppDispatch();
	const sessionEntities = useAppSelector(selectSessionEntities);
	const sessionIds = useAppSelector(selectSessionIds);

	const elements = sessionIds.map(id => {
		const session = sessionEntities[id]!;
		const onClick = () => dispatch(importAttendances(id));
		return (
			<div key={id} style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'}}>
				<div>{displayDateRange(session.startDate, session.endDate)}</div>
				<div>{session.type === 'p'? 'Plenary': 'Interim'}</div>
				<div style={{whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'}}>{session.name}</div>
				<div>
					{`(${session.Attendees} attendees)`}
					<ActionButton
						name='import'
						title='Import attendance summary'
						onClick={onClick}
					/>
				</div>
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

const renderSessionAttendance = (attendance: SessionAttendanceSummary) =>
	<div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
		<span>{attendance.AttendancePercentage.toFixed(1) + '%'}</span>
		<span>{attendance.DidAttend? 'Did attend': attendance.DidNotAttend? 'Did not attend': ''}</span>
	</div>

const tableColumns: ColumnProperties[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: SelectHeaderCell,
		cellRenderer: p =>
			<SelectCell
				selectors={attendancesSelectors}
				actions={attendancesActions}
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
		width: 100, flexGrow: 1, flexShrink: 1},
];

function Attendances() {
	const dispatch = useAppDispatch();
	const {valid, selected} = useAppSelector(selectAttendancesState);
	const sessionIds = useAppSelector(selectSessionIds);
	const sessionEntities = useAppSelector(selectSessionEntities);

	React.useEffect(() => {
		if (!valid)
			dispatch(loadAttendances());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const columns = React.useMemo(() => {
		return tableColumns.concat(
			sessionIds.map((id, i) => {
				const session = sessionEntities[id]!;
				const cellRenderer = ({rowData}: CellRendererProps<MemberAttendances>) => {
					const attendance = rowData.sessionAttendanceSummaries.find((a: any) => a.session_id === session.id);
					return attendance? renderSessionAttendance(attendance): null;
				}
				const yearMonth = DateTime.fromISO(session.startDate).toFormat('yyyy MMM');
				const column = {
					key: 'session_' + i,
					label: yearMonth,
					width: 100, flexGrow: 1, flexShrink: 1,
					cellRenderer
				}
				return column;
			}))
	}, [sessionIds, sessionEntities]);

	const refresh = () => dispatch(loadAttendances());

	return (
		<>
			<TopRow>
				<SessionSummary />

				<div style={{display: 'flex'}}>
					<TableColumnSelector
						selectors={attendancesSelectors}
						actions={attendancesActions}
						columns={columns}
					/>
					<SplitPanelButton
						selectors={attendancesSelectors}
						actions={attendancesActions}
					/>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>

			<div style={{display: 'flex', width: '100%', alignItems: 'center'}}>
				<ShowFilters
					selectors={attendancesSelectors}
					actions={attendancesActions}
					fields={fields}
				/>
				<GlobalFilter
					selectors={attendancesSelectors}
					actions={attendancesActions}
				/>
			</div>

			<SplitPanel
				selectors={attendancesSelectors}
				actions={attendancesActions}
			>
				<Panel>
					<AppTable
						columns={columns}
						headerHeight={40}
						estimatedRowHeight={50}
						selectors={attendancesSelectors}
						actions={attendancesActions}
					/>
				</Panel>
				<Panel style={{overflow: 'auto'}}>
					<MemberDetail key={selected.join()} selected={selected} />
				</Panel>
			</SplitPanel>
		</>
	)
}

export default Attendances;
