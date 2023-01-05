import PropTypes from 'prop-types';
import React from 'react';
import {DateTime} from 'luxon';

import {Form, Row, Field, Input} from 'dot11-components/form';
import {ActionIcon} from 'dot11-components/icons';
import Dropdown from 'dot11-components/dropdown';

import {EditTable as Table} from '../components/Table';

import StatusSelector from './StatusSelector';

const BLANK_STR = '(Blank)';

const displayDate = (isoDateTime) => DateTime.fromISO(isoDateTime).toLocaleString(DateTime.DATE_MED);

function MemberStatusChangeForm({entry: defaultEntry, onChange, close}) {
	const [entry, setEntry] = React.useState(defaultEntry);

	function submit() {
		onChange(entry);
		close();
	}

	function change(changes) {
		setEntry({...entry, ...changes});
	}

	const date = entry.Date.substring(0, 10);

	return (
		<Form
			title='Edit status change'
			submit={submit}
			cancel={close}
		>
			<Row>
				<Field
					label='Date:'
				>
					<input
						type='date'
						value={date}
						onChange={e => change({Date: e.target.value})}
					/>	
				</Field>
			</Row>
			<Row>
				<Field
					label='Old status:'
				>
					<StatusSelector
						value={entry.OldStatus}
						onChange={value => change({OldStatus: value})}
						placeholder={BLANK_STR}
					/>
				</Field>
			</Row>
			<Row>
				<Field
					label='New status:'
				>
					<StatusSelector
						value={entry.NewStatus}
						onChange={value => change({NewStatus: value})}
						placeholder={BLANK_STR}
					/>
				</Field>
			</Row>
			<Row>
				<Field
					label='Reason:'
				>
					<Input type='text'
						value={entry.Reason}
						onChange={e => change({Reason: e.target.value})}
						placeholder={BLANK_STR}
					/>
				</Field>
			</Row>
		</Form>
	)
}

function MemberStatusChangeDropdown({entry, onChange, readOnly}) {
	return (
		<Dropdown
			handle={false}
			selectRenderer={({isOpen, open, close}) =>
				<ActionIcon
					type='edit'
					title='Edit status change'
					disabled={readOnly} 
					active={isOpen}
					onClick={isOpen? close: open}
				/>}
			dropdownRenderer={({props, methods}) => <MemberStatusChangeForm {...props} close={methods.close} />}
			entry={entry}
			onChange={onChange}
		/>
	)
}

const statusChangeHistoryColumns = [
	{key: 'Date', label: 'Date', renderCell: (entry) => displayDate(entry.Date)},
	{key: 'OldStatus', label: 'Old status'},
	{key: 'NewStatus', label: 'New status'},
	{key: 'Reason', label: 'Reason'},
	{key: 'actions', label: '', gridTemplate: '60px', styleCell: {justifyContent: 'space-around'}}
];

function MemberStatusChangeHistory({
	member,
	updateMember,
	updateStatusChange,
	deleteStatusChange,
	uiProperties,
	setUiProperty,
	readOnly
}) {
	const history = member.StatusChangeHistory;

	const columns = React.useMemo(() => {
		const columns = statusChangeHistoryColumns.map(col => {
			if (col.key === 'actions') {
				const renderCell = (entry) => (
					<>
						<MemberStatusChangeDropdown entry={entry} onChange={(changes) => updateStatusChange(entry.id, changes)} readOnly={readOnly} />
						<ActionIcon name='delete' onClick={() => deleteStatusChange(entry.id)} disabled={readOnly} />
					</>
				);
				return {...col, renderCell};
			}
			return col;
		});
		return columns;
	}, [updateStatusChange, deleteStatusChange, readOnly]);

	return (
		<Table
			columns={columns}
			values={history}
		/>
	)
}

MemberStatusChangeHistory.propTypes = {
	member: PropTypes.object.isRequired,
	updateMember: PropTypes.func.isRequired,
	updateStatusChange: PropTypes.func.isRequired,
	deleteStatusChange: PropTypes.func.isRequired,
	readOnly: PropTypes.bool
}

export default MemberStatusChangeHistory;
