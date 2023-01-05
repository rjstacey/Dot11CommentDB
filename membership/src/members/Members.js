import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from '@emotion/styled';
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
	Panel
} from 'dot11-components/table';

import {ConfirmModal} from 'dot11-components/modals';
import {ButtonGroup, ActionButton, Button} from 'dot11-components/form';

import BulkStatusUpdate from './BulkStatusUpdate';
import MembersUpload from './MembersUpload';
import MemberAdd from './MemberAdd';
import MembersSummary from './MembersSummary';
import MemberDetail from './MemberDetail';
import {RosterImport, RosterExport} from './Roster';

import {
	fields,
	loadMembers,
	deleteSelectedMembers,
	toggleNewStatusFromAttendances,
	toggleNewStatusFromBallotSeriesParticipation,
	selectMembersState,
	dataSet
} from '../store/members';

import {loadSessions, selectSessionsState} from '../store/sessions';

function setClipboard(selected, members) {

	const td = d => `<td>${d}</td>`
	const th = d => `<th>${d}</th>`
	const header = `
		<tr>
			${th('SAPIN')}
			${th('Name')}
			${th('Status')}
			${th('Session participation')}
			${th('Ballot participation')}
		</tr>`
	const row = m => `
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
			${selected.map(sapin => row(members[sapin])).join('')}
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

const MembersColumnHeader = (props) => <TableColumnHeader dataSet={dataSet} {...props}/>;

const renderHeaderNameAndEmail = (props) =>
	<>
		<MembersColumnHeader {...props} dataKey='Name' label='Name' />
		<MembersColumnHeader {...props} dataKey='Email' label='Email' dropdownWidth={200} />
	</>

export const renderNameAndEmail = ({rowData}) =>
	<>
		<DivLineTruncated style={{fontWeight: 'bold'}}>{rowData.Name}</DivLineTruncated>
		<DivLineTruncated>{rowData.Email}</DivLineTruncated>
	</>

const renderHeaderEmployerAndAffiliation = (props) =>
	<>
		<MembersColumnHeader {...props} dataKey='Employer' label='Employer' />
		<MembersColumnHeader {...props} dataKey='Affiliation' label='Affiliation' />
	</>

const renderDataEmployerAndAffiliation = ({rowData}) =>
	<>
		<DivLineTruncated>{rowData.Employer}</DivLineTruncated>
		<DivLineTruncated>{rowData.Affiliation}</DivLineTruncated>
	</>

const tableColumns = [
	{key: '__ctrl__',
		width: 48, flexGrow: 0, flexShrink: 0,
		headerRenderer: p => 
			<SelectHeader
				dataSet={dataSet}
				customSelectorElement=<IdSelector style={{width: '200px'}} dataSet={dataSet} focusOnMount />
				{...p}
			/>,
		cellRenderer: p => <SelectCell dataSet={dataSet} {...p} />},
	{key: 'SAPIN', 
		...fields.SAPIN,
		width: 90, flexGrow: 0, flexShrink: 0, dropdownWidth: 200,
		headerRenderer: p => 
			<TableColumnHeader {...p} dataSet={dataSet}  
				customFilterElement=<IdFilter dataSet={dataSet} dataKey='SAPIN' />
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
		cellRenderer: renderDataEmployerAndAffiliation},
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

const defaultTablesConfig = {};

for (const tableView of Object.keys(defaultTablesColumns)) {
	const tableConfig = {
		fixed: false,
		columns: {}
	}
	for (const column of tableColumns) {
		const key = column.key;
		tableConfig.columns[key] = {
			unselectable: key.startsWith('__'),
			shown: defaultTablesColumns[tableView].includes(key),
			width: column.width
		}
	}
	defaultTablesConfig[tableView] = tableConfig;
}

function Members() {

	const dispatch = useDispatch();
	const {selected, entities: members, valid, newStatusFromAttendances, newStatusFromBallotSeriesParticipation} = useSelector(selectMembersState);
	const {valid: validSessions} = useSelector(selectSessionsState);

	const load = React.useCallback(() => dispatch(loadMembers()), [dispatch]);

	React.useEffect(() => {
		if (!valid)
			load();
		if (!validSessions)
			dispatch(loadSessions());
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const handleRemoveSelected = async () => {
		const ok = await ConfirmModal.show('Are you sure you want to delete the selected members?');
		if (ok)
			await dispatch(deleteSelectedMembers());
	}

	return (
		<>
			<TopRow>
				<MembersSummary />
				<div style={{display: 'flex'}}>
					<ButtonGroup>
						<div>Table view</div>
						<div style={{display: 'flex'}}>
							<TableViewSelector dataSet={dataSet} />
							<TableColumnSelector dataSet={dataSet} columns={tableColumns} />
							<SplitPanelButton dataSet={dataSet} />
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
							<ActionButton name='copy' title='Copy to clipboard' disabled={selected.length === 0} onClick={e => setClipboard(selected, members)} />
							<MembersUpload />
							<MemberAdd />
							<ActionButton name='delete' title='Remove selected' disabled={selected.length === 0} onClick={handleRemoveSelected} />
						</div>
					</ButtonGroup>
					<ActionButton name='refresh' title='Refresh' onClick={load} />
				</div>
			</TopRow>

			<ShowFilters
				dataSet={dataSet}
				fields={fields}
			/>

			<SplitPanel dataSet={dataSet} >
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={50}
						estimatedRowHeight={50}
						dataSet={dataSet}
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
