import React from 'react';
import {useAppSelector} from '../store/hooks';

import {Col, Checkbox, Input, displayDateRange} from 'dot11-components';

import { getField, Member, AttendanceType } from '../store/members';

import {selectSessionEntities, SessionTypeOptions} from '../store/sessions';

import {EditTable as Table, TableColumn} from '../components/Table';

const sessionTypeLabel = (type: string) => {
	const o = SessionTypeOptions.find((s: any) => s.value === type);
	return o? o.label: '';
}

const attendancesColumns: TableColumn[] = [
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
}: {
	member: Member;
	updateMember: (changes: Partial<Member>) => void;
	readOnly?: boolean;
}) {
	const sessions: any = useAppSelector(selectSessionEntities);
	const attendances = member.Attendances;

	const columns = React.useMemo(() => {

		const change = (id: number, field: string, value: any) => {
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

		function renderSessionDate(id: number) {
			const s = sessions[id];
			return s? displayDateRange(s.startDate, s.endDate): '-';
		}

		function renderSessionType(id: number) {
			const s = sessions[id];
			return s? sessionTypeLabel(s.type): '-';
		}

		return attendancesColumns.map(col => {
			let renderCell: ((entry: AttendanceType) => JSX.Element | string | number) | undefined;
			if (col.key === 'Date')
				renderCell = entry => renderSessionDate(entry.session_id);
			if (col.key === 'Type')
				renderCell = entry => renderSessionType(entry.session_id);
			if (col.key === 'AttendancePercentage')
				renderCell = entry => `${entry.AttendancePercentage.toFixed(0)}%`;
			if (col.key === 'DidAttend') {
				renderCell = entry =>
					<Checkbox
						checked={!!entry.DidAttend}
						onChange={e => change(entry.id, 'DidAttend', e.target.checked? 1: 0)}
						disabled={readOnly}
					/>
			}
			if (col.key === 'DidNotAttend') {
				renderCell = entry =>
					<Checkbox
						checked={!!entry.DidNotAttend}
						onChange={e => change(entry.id, 'DidNotAttend', e.target.checked? 1: 0)}
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

export default MemberAttendances;
