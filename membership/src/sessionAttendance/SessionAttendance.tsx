import React from 'react';
import styled from '@emotion/styled';

import {
	AppTable, 
	SelectHeaderCell,
	SelectCell,
	ColumnProperties,
	ActionButton,
	ShowFilters,
	GlobalFilter,
	TableColumnSelector,
	SplitPanel, Panel, SplitPanelButton,
	TablesConfig, TableConfig,
} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	fields,
	loadSessionAttendees,
	clearSessionAttendees,
	sessionAttendeesSelectors,
	sessionAttendeesActions,
	selectSessionAttendeesState,
	SessionAttendee
} from '../store/sessionAttendees';
import type { MemberAdd, MemberContactEmail } from '../store/members';

import {
	renderHeaderNameAndEmail,
	renderNameAndEmail,
	renderHeaderEmployerAndAffiliation,
	renderEmployerAndAffiliation,
} from '../members/Members';

import MemberDetail from '../members/MemberDetail';
import SessionSelector from './SessionSelector';

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const tableColumns: ColumnProperties[] = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: SelectHeaderCell,
		cellRenderer: p =>
			<SelectCell
				selectors={sessionAttendeesSelectors}
				actions={sessionAttendeesActions}
				{...p}
			/>},
	{key: 'SAPIN', 
		label: 'SA PIN',
		width: 80, flexGrow: 1, flexShrink: 1},
	{key: 'Name/Email', 
		width: 200, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderNameAndEmail,
		cellRenderer: renderNameAndEmail},
	{key: 'Employer/Affiliation',
		width: 300, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderEmployerAndAffiliation,
		cellRenderer: renderEmployerAndAffiliation},
	{key: 'Affiliation', 
		label: 'Affiliation',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Employer', 
		label: 'Employer',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Status',
		label: 'Status',
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'AttendancePercentage',
		label: 'Attendance',
		width: 100, flexGrow: 1, flexShrink: 1,
		dataRenderer: (d: number) => d.toFixed(0) + '%'},
];

const defaultTablesColumns = {
	default: ['__ctrl__', 'SAPIN', 'Name/Email', 'Employer/Affiliation', 'Status'],
};

let defaultTablesConfig: TablesConfig = {};
let tableView: keyof typeof defaultTablesColumns;
for (tableView in defaultTablesColumns) {
	const tableConfig: TableConfig = {
		fixed: false,
		columns: {}
	}
	for (const column of tableColumns) {
		const key = column.key;
		tableConfig.columns[key] = {
			unselectable: key.startsWith('__'),
			shown: defaultTablesColumns[tableView].includes(key),
			width: column.width || 200
		}
	}
	defaultTablesConfig[tableView] = tableConfig;
}

function sessionAttendeeToMember(attendee: SessionAttendee) {
	const member: MemberAdd = {
		SAPIN: attendee.SAPIN,
		Name: attendee.Name,
		//FirstName: entry.FirstName,
		//LastName: entry.LastName,
		//MI: entry.MI,
		Employer: attendee.Employer,
		Email: attendee.Email,
		Affiliation: attendee.Affiliation,
		Status: 'Non-Voter',
		Access: 0,
		ContactInfo: attendee.ContactInfo,
	}
	return member;
}

function SessionAttendance() {
	const dispatch = useAppDispatch();
	const {selected, sessionId, entities} = useAppSelector(selectSessionAttendeesState);

	const load = (sessionId: number | null) => dispatch(sessionId? loadSessionAttendees(sessionId): clearSessionAttendees());
	const refresh = () => load(sessionId);

	function getAsMember(sapin: number) {
		const attendee = entities[sapin];
		if (attendee)
			return sessionAttendeeToMember(attendee)
	}

	return (
		<>
			<TopRow>
				<SessionSelector
					value={sessionId}
					onChange={load}
				/>
				<div style={{display: 'flex'}}>
					<TableColumnSelector
						selectors={sessionAttendeesSelectors}
						actions={sessionAttendeesActions}
						columns={tableColumns}
					/>
					<SplitPanelButton
						selectors={sessionAttendeesSelectors}
						actions={sessionAttendeesActions}
					/>
					<ActionButton name='refresh' title='Refresh' onClick={refresh} />
				</div>
			</TopRow>

			<div style={{display: 'flex', width: '100%', alignItems: 'center'}}>
				<ShowFilters
					selectors={sessionAttendeesSelectors}
					actions={sessionAttendeesActions}
					fields={fields}
				/>
				<GlobalFilter
					selectors={sessionAttendeesSelectors}
					actions={sessionAttendeesActions}
				/>
			</div>

			<SplitPanel
				selectors={sessionAttendeesSelectors}
				actions={sessionAttendeesActions}
			>
				<Panel>
					<AppTable
						columns={tableColumns}
						headerHeight={40}
						estimatedRowHeight={50}
						defaultTablesConfig={defaultTablesConfig}
						selectors={sessionAttendeesSelectors}
						actions={sessionAttendeesActions}
					/>
				</Panel>
				<Panel style={{overflow: 'auto'}}>
					<MemberDetail
						key={selected.join()}
						selected={selected}
						getAsMember={getAsMember}
					/>
				</Panel>
			</SplitPanel>
		</>
	)
}

export default SessionAttendance;
