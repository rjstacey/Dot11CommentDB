import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
/* @ts-ignore */
import copyToClipboard from 'copy-html-to-clipboard';

import {
	AppTable,
	SelectHeader,
	SelectCell,
	TableColumnHeader,
	TableColumnSelector,
	TableViewSelector,
	SplitPanelButton,
	ShowFilters,
	IdSelector,
	IdFilter,
	SplitPanel,
	Panel,
	ColumnProperties,
	ConfirmModal,
	TableConfig,
	TablesConfig
} from 'dot11-components';

import { ButtonGroup, ActionButton, Button } from 'dot11-components';

import BulkStatusUpdate from './BulkStatusUpdate';
import MembersUpload from './MembersUpload';
import MemberAdd from './MemberAdd';
import MembersSummary from './MembersSummary';
import MemberDetail from './MemberDetail';
/* @ts-ignore */
import {RosterImport, RosterExport} from './Roster';

import {
	fields,
	loadMembers,
	deleteSelectedMembers,
	toggleNewStatusFromAttendances,
	toggleNewStatusFromBallotSeriesParticipation,
	selectMembersState,
	membersSelectors,
	membersActions,
} from '../store/members';

import type {Member, EntityId, MembersDictionary} from '../store/members';

/* @ts-ignore */
import {loadSessions, selectSessionsState} from '../store/sessions';

function setClipboard(selected: EntityId[], members: MembersDictionary) {

	const td = (d: string | number) => `<td>${d}</td>`
	const th = (d: string) => `<th>${d}</th>`
	const header = `
		<tr>
			${th('SAPIN')}
			${th('Name')}
			${th('Status')}
			${th('Session participation')}
			${th('Ballot participation')}
		</tr>`
	const row = (m: Member) => `
		<tr>
			${td(m.SAPIN)}
			${td(m.Name)}
			${td(m.Status)}
			${td(m.AttendanceCount)}
			${td(`${m.BallotSeriesCount}/${m.BallotSeriesTotal}`)}
		</tr>`
	const table = `
		<style>
			table {border-collapse: collapse;}
			table, th, td {border: 1px solid black;}
			td {vertical-align: top;}
		</style>
		<table>
			${header}
			${selected.map(sapin => row(members[sapin]!)).join('')}
		</table>`

	copyToClipboard(table, {asHtml: true});
}

const TopRow = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
	padding: 10px;
	box-sizing: border-box;
`;

const DivLineTruncated = styled.div`
	width: 100%;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
`;

const MembersColumnHeader = (props: Omit<React.ComponentProps<typeof TableColumnHeader>, 'selectors' | 'actions'>) => <TableColumnHeader selectors={membersSelectors} actions={membersActions} {...props}/>;

const renderHeaderNameAndEmail = (props: Omit<React.ComponentProps<typeof MembersColumnHeader>, 'dataKey' | 'label'>) =>
	<>
		<MembersColumnHeader {...props} dataKey='Name' label='Name' />
		<MembersColumnHeader {...props} dataKey='Email' label='Email' /*dropdownWidth={200}*/ />
	</>

export const renderNameAndEmail = ({rowData}: {rowData: Member}) =>
	<>
		<DivLineTruncated style={{fontWeight: 'bold'}}>{rowData.Name}</DivLineTruncated>
		<DivLineTruncated>{rowData.Email}</DivLineTruncated>
	</>

const renderHeaderEmployerAndAffiliation = (props: Omit<React.ComponentProps<typeof MembersColumnHeader>, 'dataKey' | 'label'>) =>
	<>
		<MembersColumnHeader {...props} dataKey='Employer' label='Employer' />
		<MembersColumnHeader {...props} dataKey='Affiliation' label='Affiliation' />
	</>

const renderDataEmployerAndAffiliation = ({rowData}: {rowData: Member}) =>
	<>
		<DivLineTruncated>{rowData.Employer}</DivLineTruncated>
		<DivLineTruncated>{rowData.Affiliation}</DivLineTruncated>
	</>

const tableColumns: ColumnProperties[] = [
	{key: '__ctrl__',
		width: 48, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => 
			<SelectHeader
				selectors={membersSelectors}
				actions={membersActions}
				customSelectorElement=<IdSelector style={{width: '200px'}} selectors={membersSelectors} actions={membersActions} focusOnMount />
				{...p}
			/>,
		cellRenderer: p => <SelectCell selectors={membersSelectors} actions={membersActions} {...p} />},
	{key: 'SAPIN', 
		...fields.SAPIN,
		width: 90, flexGrow: 0, flexShrink: 0, dropdownWidth: 200,
		headerRenderer: p => 
			<TableColumnHeader
				{...p}
				selectors={membersSelectors}
				actions={membersActions}  
				customFilterElement=<IdFilter selectors={membersSelectors} actions={membersActions} dataKey='SAPIN' />
			/>},
	{key: 'Name/Email',
		label: 'Name/Email',
		width: 200, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderNameAndEmail,
		cellRenderer: renderNameAndEmail as (props: { rowData: object }) => JSX.Element},
	{key: 'Name',
		...fields.Name,
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'Email',
		...fields.Email,
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'Employer/Affiliation', 
		label: 'Employer/Affiliation',
		width: 300, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderEmployerAndAffiliation,
		cellRenderer: renderDataEmployerAndAffiliation as (props: { rowData: object }) => JSX.Element},
	{key: 'Employer', 
		...fields.Employer,
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Affiliation', 
		label: 'Affiliation',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Status', 
		...fields.Status,
		width: 160, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
	{key: 'NewStatus', 
		...fields.NewStatus,
		width: 160, flexGrow: 1, flexShrink: 1},
	{key: 'Access', 
		...fields.Access,
		width: 150, flexGrow: 1, flexShrink: 1, 
		dropdownWidth: 200},
	{key: 'AttendancesSummary',
		...fields.AttendancesSummary,
		label: 'Session participation',
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'BallotSeriesSummary', 
		label: 'Ballot participation',
		width: 100, flexGrow: 1, flexShrink: 1},
];

const defaultTablesColumns = {
	General: ['__ctrl__', 'SAPIN', 'Name/Email', 'Employer/Affiliation', 'Status', 'Access'],
	Participation: ['__ctrl__', 'SAPIN', 'Name/Email', 'Attendance', 'Status', 'NewStatus', 'AttendancesSummary', 'BallotSeriesSummary']
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

function Members() {

	const dispatch = useDispatch();
	const {selected, entities: members, valid, newStatusFromAttendances, newStatusFromBallotSeriesParticipation} = useSelector(selectMembersState);
	const validSessions: boolean = useSelector(selectSessionsState as (state: any) => any).valid;

	const load = () => dispatch(loadMembers());

	React.useEffect(() => {
		if (!valid)
			load();
		if (!validSessions)
			dispatch(loadSessions());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const handleRemoveSelected = async () => {
		const ok = await ConfirmModal.show('Are you sure you want to delete the selected members?');
		if (ok)
			dispatch(deleteSelectedMembers());
	}

	return (
		<>
			<TopRow>
				<MembersSummary />
				<div style={{display: 'flex'}}>
					<ButtonGroup>
						<div>Table view</div>
						<div style={{display: 'flex'}}>
							<TableViewSelector
								selectors={membersSelectors}
								actions={membersActions}
							/>
							<TableColumnSelector
								selectors={membersSelectors}
								actions={membersActions}
								columns={tableColumns}
							/>
							<SplitPanelButton
								selectors={membersSelectors}
								actions={membersActions}
							/>
						</div>
					</ButtonGroup>
					<ButtonGroup>
						<div>Roster</div>
						<div style={{display: 'flex'}}>
							<RosterImport />
							<RosterExport />
						</div>
					</ButtonGroup>
					<Button
						isActive={newStatusFromAttendances}
						onClick={e => dispatch(toggleNewStatusFromAttendances())}
					>
						Post Session Status
					</Button>
					<Button
						isActive={newStatusFromBallotSeriesParticipation}
						onClick={e => dispatch(toggleNewStatusFromBallotSeriesParticipation())}
					>
						Post Ballot Series Status
					</Button>
					<BulkStatusUpdate />
					<ButtonGroup>
						<div>Edit</div>
						<div style={{display: 'flex'}}>
							<ActionButton name='copy' title='Copy to clipboard' disabled={selected.length === 0} onClick={() => setClipboard(selected, members)} />
							<MembersUpload />
							<MemberAdd />
							<ActionButton name='delete' title='Remove selected' disabled={selected.length === 0} onClick={handleRemoveSelected} />
						</div>
					</ButtonGroup>
					<ActionButton name='refresh' title='Refresh' onClick={load} />
				</div>
			</TopRow>

			<ShowFilters
				selectors={membersSelectors}
				actions={membersActions}
				fields={fields}
			/>

			<SplitPanel
				selectors={membersSelectors}
				actions={membersActions}
			>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={50}
						estimatedRowHeight={50}
						selectors={membersSelectors}
						actions={membersActions}
					/>
				</Panel>
				<Panel style={{overflow: 'auto'}}>
					<MemberDetail
						key={selected.join()}
					/>
				</Panel>
			</SplitPanel>
		</>
	)
}

export default Members;
