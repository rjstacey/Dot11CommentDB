import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {useHistory} from "react-router-dom"
import copyToClipboard from 'copy-html-to-clipboard'

import AppTable, {ControlHeader, ControlCell, ColumnDropdown, ColumnSelector, ShowFilters, IdSelector} from 'dot11-common/table'
import {ConfirmModal} from 'dot11-common/modals'
import {ActionButton, Button} from 'dot11-common/lib/icons'
import {setTableView, upsertTableColumns, setProperty} from 'dot11-common/store/ui'
import {Field, Input, Form, Row} from 'dot11-common/general/Form'
import {ActionButtonDropdown} from 'dot11-common/general/Dropdown'

import MembersUpload from './MembersUpload'
import MemberUpdateModal from './MemberUpdate'
import MembersSummary from './MembersSummary'
import MemberDetail from './MemberDetail'
import {RosterImport, RosterExport} from './Roster'

import {loadMembers, deleteSelectedMembers, updateMembers, AccessLevel, AccessLevelOptions} from '../store/members'
import {loadSessions} from '../store/sessions'


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
			${selected.map(sapin => row(members[sapin]))}
		</table>`

	copyToClipboard(table, {asHtml: true});
}


const DefaultMember = {SAPIN: '', Name: '', Email: '', Status: 'Non-Voter', Access: AccessLevel.Member}

const ActionCell = styled.div`
	display: flex;
	justify-content: center;
`;

const RowActions = ({onEdit, onDelete}) =>
	<ActionCell>
		<ActionButton name='edit' title='Edit' onClick={onEdit} />
		<ActionButton name='delete' title='Delete' onClick={onDelete} />
	</ActionCell>

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
	.AppTable__dataRow,
	.AppTable__headerRow {
		align-items: center;
	}
`;

const DivLineTruncated = styled.div`
	width: 100%;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
`;

const renderAccess = ({rowData}) => {
	const item = AccessLevelOptions.find(o => o.value === rowData.Access);
	return item? item.label: 'error';
}

const MembersColumnDropdown = (props) => <ColumnDropdown dataSet={dataSet} {...props}/>;

const renderHeaderNameAndEmail = (props) =>
	<React.Fragment>
		<MembersColumnDropdown {...props} dataKey='Name' label='Name' />
		<MembersColumnDropdown {...props} dataKey='Email' label='Email' />
	</React.Fragment>

export const renderNameAndEmail = ({rowData}) =>
	<React.Fragment>
		<DivLineTruncated style={{fontWeight: 'bold'}}>{rowData.Name}</DivLineTruncated>
		<DivLineTruncated>{rowData.Email}</DivLineTruncated>
	</React.Fragment>

const renderHeaderEmployerAndAffiliation = (props) =>
	<React.Fragment>
		<MembersColumnDropdown {...props} dataKey='Employer' label='Employer' />
		<MembersColumnDropdown {...props} dataKey='Affiliation' label='Affiliation' />
	</React.Fragment>

const renderDataEmployerAndAffiliation = ({rowData}) =>
	<React.Fragment>
		<DivLineTruncated>{rowData.Employer}</DivLineTruncated>
		<DivLineTruncated>{rowData.Affiliation}</DivLineTruncated>
	</React.Fragment>

const AttendanceContainer = styled.div`
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	& > div:first-of-type {
		flex-basis: 1.5em;
	}
	& > div:not(:first-of-type) {
		width: 40px;
		margin: 2px;
		padding: 0 4px;
		text-align: right;
	}
	& .qualifies {
		background-color: #aaddaa;
	}
`;

const _Attendances = ({rowData, dataKey, sessions}) => {
	const attendances = rowData.Attendances;
	if (!attendances)
		return 'None'
	const P = [], I = [];
	let iCount = 0;
	//console.log(sessions)
	for (const [k, a] of Object.entries(attendances)) {
		const s = sessions[k];
		/* Plenary session attendance qualifies if the member gets at least 75% attendance credit.
		 * One interim can be substituted for a plenary. */
		let canQualify;
		let text;
		if (a.DidAttend) {
			text = 'Yes';
			canQualify = true;
		}
		else if (a.DidNotAttend) {
			text = 'No';
			canQualify = false;
		}
		else {
			text = a.AttendancePercentage.toFixed(0) + '%';
			canQualify = a.AttendancePercentage >= 75;
		}
		const qualifies = (canQualify && (s.Type === 'p' || (s.Type === 'i' && iCount++ === 0)))
		const el = <div key={k} className={qualifies? 'qualifies': undefined}>{text}</div>;
		if (s && s.Type === 'i')
			I.push(el)
		else
			P.push(el)
	}
	return (
		<React.Fragment>
			<AttendanceContainer><div>P:</div>{P}</AttendanceContainer>
			<AttendanceContainer><div>I:</div>{I}</AttendanceContainer>
		</React.Fragment>
	)
}

const Attendances = connect((state) => ({sessions: state.sessions.entities}))(_Attendances);

const BallotSeriesParticipation = ({rowData, dataKey}) => {
	const participation = `${rowData.BallotSeriesCount}/${rowData.BallotSeriesTotal}`;
	return participation;
}

const allColumns = [
	{key: '__ctrl__',
		width: 30, flexGrow: 1, flexShrink: 0,
		headerRenderer: p => <ControlHeader dataSet={dataSet} {...p} ><IdSelector dataSet={dataSet} focusOnMount /></ControlHeader>,
		cellRenderer: p => <ControlCell dataSet={dataSet} {...p} />},
	{key: 'SAPIN', 
		label: 'SA PIN',
		width: 80, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
	{key: 'Name/Email',
		label: 'Name/Email',
		width: 200, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderNameAndEmail,
		cellRenderer: renderNameAndEmail},
	{key: 'Name',
		label: 'Name',
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'Email',
		label: 'Email',
		width: 200, flexGrow: 1, flexShrink: 1},
	{key: 'Employer/Affiliation', 
		label: 'Employer/Affiliation',
		width: 300, flexGrow: 1, flexShrink: 1,
		headerRenderer: renderHeaderEmployerAndAffiliation,
		cellRenderer: renderDataEmployerAndAffiliation},
	{key: 'Employer', 
		label: 'Employer',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Affiliation', 
		label: 'Affiliation',
		width: 300, flexGrow: 1, flexShrink: 1},
	{key: 'Status', 
		label: 'Status',
		width: 160, flexGrow: 1, flexShrink: 1, dropdownWidth: 200},
	{key: 'NewStatus', 
		label: 'Expected Status',
		width: 160, flexGrow: 1, flexShrink: 1},
	{key: 'Access', 
		label: 'Access Level',
		width: 150, flexGrow: 1, flexShrink: 1, dropdownWidth: 200,
		cellRenderer: renderAccess},
	{key: 'AttendanceCount', 
		label: 'Session participation',
		width: 300, flexGrow: 1, flexShrink: 1,
		cellRenderer: (props) => <Attendances {...props} />},
	{key: 'BallotSeriesCount', 
		label: 'Ballot participation',
		width: 150, flexGrow: 1, flexShrink: 1,
		cellRenderer: (props) => <BallotSeriesParticipation {...props} />},
];

const defaultTablesConfig = {
	General: ['__ctrl__', 'SAPIN', 'Name/Email', 'Employer/Affiliation', 'Status', 'Access'],
	Participation: ['__ctrl__', 'SAPIN', 'Name/Email', 'Attendance', 'Status', 'NewStatus', 'AttendanceCount', 'BallotSeriesCount']
};

function setDefaultTableConfig({tableConfig, tableView, upsertTableColumns, setTableView}) {
	for (const view of Object.keys(defaultTablesConfig)) {
		const columnsConfig = {}
		for (const column of allColumns) {
			const key = column.key;
			/* Columns with a 'visible' property will appear in the ColumnSelector. 
			 * We want to exclude control column since it can't be removed, so we don't give it a 'visible' property. */
			if (!tableConfig.columns[key]) {
				columnsConfig[key] = {
					label: column.label,
					width: column.width,
				}
				if (key !== '__ctrl__')
					columnsConfig[key].visible = defaultTablesConfig[view].includes(key);
			}
			else {
				if (key !== '__ctrl__' && !tableConfig.columns[key].hasOwnProperty('visible'))
					columnsConfig[key].visible = defaultTablesConfig[view].includes(key)
				if (!tableConfig.columns[key].hasOwnProperty('label'))
					columnsConfig[key].label = column.label
			}
		}
		if (Object.keys(columnsConfig).length)
			upsertTableColumns(view, columnsConfig);
	}
	if (!Object.keys(defaultTablesConfig).includes(tableView))
		setTableView(Object.keys(defaultTablesConfig)[0]);
}

function TableViewSelector({tableView, setTableView}) {
	const tableViews = Object.keys(defaultTablesConfig);
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

const ButtonGroup = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	background: linear-gradient(to bottom, #fdfdfd 0%,#f6f7f8 100%);
	border: 1px solid #999;
	border-radius: 2px;
	padding: 5px;
	margin: 0 5px;
`;

function Members({
	selected,
	loading,
	members,
	validMembers,
	loadMembers,
	validSessions,
	loadSessions,
	updateMembers,
	deleteSelectedMembers,
	tableView,
	tableConfig,
	setTableView,
	upsertTableColumns,
	uiProperty,
	setUiProperty
}) {
	const [editMember, setEditMember] = React.useState({action: '', member: DefaultMember});
	const [split, setSplit] = React.useState(0.5);
	const setTableDetailSplit = (deltaX) => setSplit(split => split - deltaX/window.innerWidth);
	const [edit, setEdit] = React.useState(false);
	const [statusChangeReason, setStatusChangeReason] = React.useState('');

	/* On mount, if the store does not contain default configuration for each of our views, 
	 * then add them */
	React.useEffect(() => setDefaultTableConfig({tableConfig, tableView, upsertTableColumns, setTableView}), []);

	/* If we change the table config signficantly we want to remount the table component,
	 * so we create a key id for the component that depends on signficant parameters */
	const [tableId, columns] = React.useMemo(() => {

		const columns = allColumns.filter(col => 
			(tableConfig.columns[col.key] && tableConfig.columns[col.key].hasOwnProperty('visible'))
				? tableConfig.columns[col.key].visible
				: true
		);

		const id = (tableConfig.fixed? 'f-': '') + columns.map(col => col.key).join('-');

		return [id, columns];
	}, [tableView, tableConfig]);

	React.useEffect(() => {
		if (!validMembers)
			loadMembers();
		if (!validSessions)
			loadSessions();
	}, []);

	const handleRemoveSelected = async () => {
		const ok = await ConfirmModal.show('Are you sure you want to delete the selected members?');
		if (ok)
			await deleteSelectedMembers();
	}

	const openAddMember = () => setEditMember({action: 'add', member: DefaultMember});
	const closeMemberUpdate = () => setEditMember(s => ({...s, action: ''}));

	const changeStatusOfSelected = () => {
		const updates = [];
		for (const sapin of selected) {
			const m = members[sapin];
			if (m.NewStatus)
				updates.push({SAPIN: sapin, Status: m.NewStatus, StatusChangeReason: statusChangeReason})
		}
		updateMembers(updates);
	}

	const table =
		<AppTable
			key={tableId}
			columns={columns}
			tableView={tableView}
			headerHeight={50}
			estimatedRowHeight={50}
			dataSet={dataSet}
			resizeWidth={uiProperty.editView? setTableDetailSplit: undefined}
		/>

	const body = (uiProperty.editView)?
		<React.Fragment>
			<div style={{flex: `${100 - split*100}%`, height: '100%', overflow: 'hidden', boxSizing: 'border-box'}}>
				{table}
			</div>
			<MemberDetail
				style={{flex: `${split*100}%`, height: '100%', overflow: 'auto', boxSizing: 'border-box'}}
				key={selected}
			/>
		</React.Fragment>:
		table

	const FForm = ({close, ...otherProps}) => <Form cancel={close} {...otherProps} />

	return (
		<React.Fragment>
			<TopRow>
				<MembersSummary />
				<div style={{display: 'flex'}}>
					<ButtonGroup>
						<div>Table view</div>
						<div style={{display: 'flex'}}>
							<TableViewSelector
								tableView={tableView}
								setTableView={setTableView}
							/>
							<ColumnSelector dataSet={dataSet} />
							<ActionButton
								name='book-open'
								title='Show detail'
								isActive={uiProperty.editView} 
								onClick={() => setUiProperty('editView', !uiProperty.editView)} 
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
					<ActionButtonDropdown label='Bulk Status Update'>
						<FForm
							title='Bulk status update'
							submit={changeStatusOfSelected}
						>
							<Row>
								Update selected member status to the expected status
							</Row>
							<Row>
								<Field label='Reason:'>
									<Input type='text'
										size={24}
										value={statusChangeReason}
										onChange={e => setStatusChangeReason(e.target.value)} 
									/>
								</Field>
							</Row>
						</FForm>
					</ActionButtonDropdown>
					<ButtonGroup>
						<div>Edit</div>
						<div style={{display: 'flex'}}>
							<ActionButton name='copy' title='Copy to clipboard' disabled={selected.length === 0} onClick={e => setClipboard(selected, members)} />
							<MembersUpload />
							<ActionButton name='add' title='Add Member' onClick={openAddMember} />
							<ActionButton name='delete' title='Remove Selected' disabled={selected.length === 0} onClick={handleRemoveSelected} />
						</div>
					</ButtonGroup>
					<ActionButton name='refresh' title='Refresh' onClick={loadMembers} />
				</div>
			</TopRow>

			<ShowFilters
				dataSet={dataSet}
			/>

			<TableRow>
				{body}
			</TableRow>

			<MemberUpdateModal
				isOpen={editMember.action === 'add' || editMember.action === 'update'}
				close={closeMemberUpdate}
				action={editMember.action}
				member={editMember.member}
			/>
		</React.Fragment>
	)
}

Members.propTypes = {
	selected: PropTypes.array.isRequired,
	members: PropTypes.object.isRequired,
	validMembers: PropTypes.bool.isRequired,
	validSessions: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	loadMembers: PropTypes.func.isRequired,
	deleteSelectedMembers: PropTypes.func.isRequired,
	updateMembers: PropTypes.func.isRequired,
}

const dataSet = 'members'
export default connect(
	(state) => {
		const tableView = state[dataSet].ui.view;
		const tableConfig = state[dataSet].ui.tablesConfig[tableView];
		return {
			selected: state[dataSet].selected,
			members: state[dataSet].entities,
			validMembers: state[dataSet].valid,
			validSessions: state.sessions.valid,
			loading: state[dataSet].loading,
			tableView,
			tableConfig,
			uiProperty: state[dataSet].ui
		}
	},
	(dispatch) => {
		return {
			loadMembers: () => dispatch(loadMembers()),
			loadSessions: () => dispatch(loadSessions()),
			updateMembers: (updates) => dispatch(updateMembers(updates)),
			deleteSelectedMembers: () => dispatch(deleteSelectedMembers()),
			setTableView: view => dispatch(setTableView(dataSet, view)),
			upsertTableColumns: (view, columns) => dispatch(upsertTableColumns(dataSet, view, columns)),
			setUiProperty: (property, value) => dispatch(setProperty(dataSet, property, value))
		}
	}
)(Members)
