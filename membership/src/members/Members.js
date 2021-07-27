import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {useHistory} from "react-router-dom"
import copyToClipboard from 'copy-html-to-clipboard'

import AppTable, {SelectHeader, SelectCell, TableColumnHeader, TableColumnSelector, TableViewSelector, ShowFilters, IdSelector, SplitPanel, Panel} from 'dot11-components/table'
import {ConfirmModal} from 'dot11-components/modals'
import {ActionButton, Button} from 'dot11-components/lib/icons'
import {setTableView, initTableConfig, setProperty} from 'dot11-components/store/ui'
import {Field, Input, Form, Row} from 'dot11-components/general/Form'
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown'

import BulkStatusUpdate from './BulkStatusUpdate'
import MembersUpload from './MembersUpload'
import MemberAdd from './MemberAdd'
import MembersSummary from './MembersSummary'
import MemberDetail from './MemberDetail'
import {RosterImport, RosterExport} from './Roster'

import {fields, loadMembers, deleteSelectedMembers, AccessLevel, AccessLevelOptions} from '../store/members'
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
			${selected.map(sapin => row(members[sapin])).join('')}
		</table>`

	copyToClipboard(table, {asHtml: true});
}


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
		<>
			<AttendanceContainer><div>P:</div>{P}</AttendanceContainer>
			<AttendanceContainer><div>I:</div>{I}</AttendanceContainer>
		</>
	)
}

const Attendances = connect((state) => ({sessions: state.sessions.entities}))(_Attendances);

const BallotSeriesParticipation = ({rowData, dataKey}) => {
	const participation = `${rowData.BallotSeriesCount}/${rowData.BallotSeriesTotal}`;
	return participation;
}

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
		width: 90, flexGrow: 0, flexShrink: 0, dropdownWidth: 200},
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

const defaultTablesColumns = {
	General: ['__ctrl__', 'SAPIN', 'Name/Email', 'Employer/Affiliation', 'Status', 'Access'],
	Participation: ['__ctrl__', 'SAPIN', 'Name/Email', 'Attendance', 'Status', 'NewStatus', 'AttendanceCount', 'BallotSeriesCount']
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

const FForm = ({close, ...otherProps}) => <Form cancel={close} {...otherProps} />

function Members({
	selected,
	loading,
	members,
	validMembers,
	loadMembers,
	validSessions,
	loadSessions,
	deleteSelectedMembers,
	uiProperty,
	setUiProperty
}) {
	const [statusChangeReason, setStatusChangeReason] = React.useState('');

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
					<ActionButton name='refresh' title='Refresh' onClick={loadMembers} />
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
						headerHeight={50}
						estimatedRowHeight={50}
						dataSet={dataSet}
					/>
				</Panel>
				<Panel style={{overflow: 'auto'}}>
					<MemberDetail
						key={selected}
					/>
				</Panel>
			</SplitPanel>
		</>
	)
}

Members.propTypes = {
	selected: PropTypes.array.isRequired,
	members: PropTypes.object.isRequired,
	validMembers: PropTypes.bool.isRequired,
	validSessions: PropTypes.bool.isRequired,
	loading: PropTypes.bool.isRequired,
	uiProperty: PropTypes.object.isRequired,
	loadMembers: PropTypes.func.isRequired,
	loadSessions: PropTypes.func.isRequired,
	deleteSelectedMembers: PropTypes.func.isRequired,
	setUiProperty: PropTypes.func.isRequired,
}

const dataSet = 'members'
export default connect(
	(state) => {
		return {
			selected: state[dataSet].selected,
			members: state[dataSet].entities,
			validMembers: state[dataSet].valid,
			validSessions: state.sessions.valid,
			loading: state[dataSet].loading,
			uiProperty: state[dataSet].ui
		}
	},
	(dispatch) => {
		return {
			loadMembers: () => dispatch(loadMembers()),
			loadSessions: () => dispatch(loadSessions()),
			deleteSelectedMembers: () => dispatch(deleteSelectedMembers()),
			setUiProperty: (property, value) => dispatch(setProperty(dataSet, property, value))
		}
	}
)(Members)
