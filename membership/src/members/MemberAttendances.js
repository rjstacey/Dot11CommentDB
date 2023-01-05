import PropTypes from 'prop-types';
import React from 'react';
import {useSelector} from 'react-redux';

import {displayDateRange} from 'dot11-components/lib';

import {Col, Checkbox, Input} from 'dot11-components/form';

import {getField} from '../store/members';
import {selectSessionEntities, SessionTypeOptions} from '../store/sessions';

import {EditTable as Table} from '../components/Table';

const sessionTypeLabel = (type) => {
	const o = SessionTypeOptions.find(s => s.value === type);
	return o? o.label: '';
}

const attendancesColumns = [
	{key: 'Date', label: 'Date'},
	{key: 'Type', label: 'Type'},
	{key: 'AttendancePercentage', label: 'Attendance', styleCell: {justifyContent: 'flex-end'}},
	{key: 'DidAttend', label: 'Did attend', styleCell: {justifyContent: 'center'}},
	{key: 'DidNotAttend', label: 'Did not attend', styleCell: {justifyContent: 'center'}},
	{key: 'Notes', label: 'Notes'},
	{key: 'SAPIN', label: 'SA PIN', styleCell: {justifyContent: 'flex-end'}}
];


function MemberAttendances({
	member,
	updateMember,
	readOnly
}) {
	const sessions = useSelector(selectSessionEntities);
	const attendances = member.Attendances;

	const columns = React.useMemo(() => {

		const change = (id, field, value) => {
			const index = attendances.findIndex(a => a.id === id);
			if (index < 0) {
				console.error(`Can't find entry with id=${id}`);
				return;
			}

			if (field === 'DidAttend' || field === 'DidNotAttend')
				value = value? 1: 0;

			let newAttendances = attendances.slice();
			newAttendances[index] = {...attendances[index], [field]: value};

			updateMember({Attendances: newAttendances});
		}

		function renderSessionDate(id) {
			const s = sessions[id];
			return s? displayDateRange(s.startDate, s.endDate): '-';
		}

		function renderSessionType(id) {
			const s = sessions[id];
			return s? sessionTypeLabel(s.type): '-';
		}

		return attendancesColumns.map(col => {
			let renderCell;
			if (col.key === 'Date')
				renderCell = entry => renderSessionDate(entry.session_id);
			if (col.key === 'Type')
				renderCell = entry => renderSessionType(entry.session_id);
			if (col.key === 'AttendancePercentage')
				renderCell = entry => `${entry.AttendancePercentage.toFixed(0)}%`;
			if (col.key === 'DidAttend') {
				renderCell = entry =>
					<Checkbox
						checked={entry.DidAttend}
						onChange={e => change(entry.id, 'DidAttend', e.target.checked)}
						disabled={readOnly}
					/>
			}
			if (col.key === 'DidNotAttend') {
				renderCell = entry =>
					<Checkbox
						checked={entry.DidNotAttend}
						onChange={e => change(entry.id, 'DidNotAttend', e.target.checked)}
						disabled={readOnly}
					/>
			}
			if (col.key === 'Notes') {
				renderCell = entry =>
					<Input type='text'
						value={entry.Notes || ''}
						onChange={e => change(entry.id, 'Notes', e.target.value)}
						disabled={readOnly}
					/>
			}
			if (col.key === 'SAPIN') {
				renderCell = entry => entry.SAPIN !== member.SAPIN? entry.SAPIN: '';
			}

			if (renderCell)
				return {...col, renderCell};

			return col;
		});
	}, [attendances, member.SAPIN, sessions, readOnly, updateMember]);

	return (
		<Col>
			<label>Recent session attendance: {getField(member, 'AttendancesSummary')}</label>
			<Table
				columns={columns}
				values={attendances}
			/>
		</Col>
	)
}

MemberAttendances.propTypes = {
	member: PropTypes.object.isRequired,
	updateMember: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export default MemberAttendances;
