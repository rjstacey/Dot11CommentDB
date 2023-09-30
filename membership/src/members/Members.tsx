import React from 'react';
import styled from '@emotion/styled';
import type { EntityId } from '@reduxjs/toolkit';

import {
	AppTable,
	SelectHeaderCell,
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
	TableConfig,
	TablesConfig,
	CellRendererProps,
	HeaderCellRendererProps,
	ButtonGroup, ActionButton 
} from 'dot11-components';

import MembersUpload from './MembersUpload';
import MembersSummary from './MembersSummary';
import MemberDetail from './MemberDetail';
import {RosterImport, RosterExport} from './Roster';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
	fields,
	loadMembers,
	selectMembersState,
	membersSelectors,
	membersActions,
} from '../store/members';
import type {Member, MembersDictionary} from '../store/members';

import TopRow from '../components/TopRow';

function copyHtmlToClipboard(html: string) {
	const type = "text/html";
    const blob = new Blob([html], {type});
    const data = [new ClipboardItem({[type]: blob})];
	navigator.clipboard.write(data);
}

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

		copyHtmlToClipboard(table);
}

const DivLineTruncated = styled.div`
	width: 100%;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
`;

export const renderHeaderNameAndEmail = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='Name' label='Name' />
		<TableColumnHeader {...props} dataKey='Email' label='Email' /*dropdownWidth={200}*/ />
	</>

export const renderNameAndEmail = ({rowData}: CellRendererProps<Member>) =>
	<>
		<DivLineTruncated style={{fontWeight: 'bold'}}>{rowData.Name}</DivLineTruncated>
		<DivLineTruncated>{rowData.Email}</DivLineTruncated>
	</>

export const renderHeaderEmployerAndAffiliation = (props: HeaderCellRendererProps) =>
	<>
		<TableColumnHeader {...props} dataKey='Employer' label='Employer' />
		<TableColumnHeader {...props} dataKey='Affiliation' label='Affiliation' />
	</>

export const renderEmployerAndAffiliation = ({rowData}: CellRendererProps<Member>) =>
	<>
		<DivLineTruncated>{rowData.Employer}</DivLineTruncated>
		<DivLineTruncated>{rowData.Affiliation}</DivLineTruncated>
	</>

const tableColumns: ColumnProperties[] = [
	{key: '__ctrl__',
		width: 48, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => 
			<SelectHeaderCell
				customSelectorElement=
					<IdSelector
						style={{width: '200px'}}
						selectors={membersSelectors}
						actions={membersActions}
						focusOnMount
					/>
				{...p}
			/>,
		cellRenderer: p =>
			<SelectCell
				selectors={membersSelectors}
				actions={membersActions}
				{...p}
			/>},
	{key: 'SAPIN', 
		...fields.SAPIN,
		width: 90, flexGrow: 0, flexShrink: 0, dropdownWidth: 200,
		headerRenderer: p => 
			<TableColumnHeader
				customFilterElement=
					<IdFilter
						selectors={membersSelectors}
						actions={membersActions}
						dataKey='SAPIN'
					/>
				{...p}
			/>},
	{key: 'Name/Email',
		label: 'Name/Email',
		width: 200, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderNameAndEmail,
		cellRenderer: renderNameAndEmail},
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
		cellRenderer: renderEmployerAndAffiliation},
	{key: 'Employer', 
		...fields.Employer,
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Affiliation', 
		label: 'Affiliation',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Status', 
		...fields.Status,
		width: 160, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
	{key: 'Access', 
		...fields.Access,
		width: 150, flexGrow: 1, flexShrink: 1, 
		dropdownWidth: 200},
	{key: 'AttendancesSummary',
		...fields.AttendancesSummary,
		label: 'Session participation',
		width: 100, flexGrow: 1, flexShrink: 1},
	{key: 'BallotParticipationSummary', 
		...fields.BallotParticipationSummary,
		label: 'Ballot participation',
		width: 100, flexGrow: 1, flexShrink: 1},
];

const defaultTablesColumns = {
	General: ['__ctrl__', 'SAPIN', 'Name/Email', 'Employer/Affiliation', 'Status', 'Access'],
	Participation: ['__ctrl__', 'SAPIN', 'Name/Email', 'Attendance', 'Status', 'NewStatus', 'AttendancesSummary', 'BallotParticipationSummary']
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

	const dispatch = useAppDispatch();
	const {selected, entities: members, valid} = useAppSelector(selectMembersState);

	const load = () => dispatch(loadMembers());

	React.useEffect(() => {
		if (!valid)
			load();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

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
					<ButtonGroup>
						<div>Edit</div>
						<div style={{display: 'flex'}}>
							<ActionButton name='copy' title='Copy to clipboard' disabled={selected.length === 0} onClick={() => setClipboard(selected, members)} />
							<MembersUpload />
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
