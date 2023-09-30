import React from 'react';

import {Form, Row, Field, Input, Checkbox, Button, Dropdown, type DropdownRendererProps} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateMembers, type MemberUpdate } from '../store/members';
import { selectAttendanceSessions, selectAttendancesState, selectAttendancesWithMembershipAndSummary } from '../store/sessionParticipation';

function BulkStatusUpdateForm({methods}: DropdownRendererProps) {

	const dispatch = useAppDispatch();
	const sessions = useAppSelector(selectAttendanceSessions);
	const {selected, ids} = useAppSelector(selectAttendancesState);
	const entities = useAppSelector(selectAttendancesWithMembershipAndSummary);
	const [selectedOnly, setSelectedOnly] = React.useState(false);
	const [reason, setReason] = React.useState(() => 'Post session ' + sessions[sessions.length-1].number + ' update');
	const [date, setDate] = React.useState(() => sessions[sessions.length-1].endDate);
	const [busy, setBusy] = React.useState(false);

	const updates: MemberUpdate[] = (selectedOnly? selected: ids)
		.map(id => entities[id]!)
		.filter(a => a.ExpectedStatus)
		.map(a => ({id: a.SAPIN, changes: {Status: a.ExpectedStatus, StatusChangeReason: reason, StatusChangeDate: date}}));

	let warning = `${updates.length} updates`;

	const submit = async () => {
		setBusy(true);
		await dispatch(updateMembers(updates));
		setBusy(false);
		methods.close();
	}

	return (
		<Form
			title='Bulk status update'
			submit={submit}
			cancel={methods.close}
			busy={busy}
			errorText={warning}
		>
			<Row>
				Updated member status to expected status
			</Row>
			<Row>
				<Field label='Selected entries only:'>
					<Checkbox
						size={24}
						checked={selectedOnly}
						onChange={() => setSelectedOnly(!selectedOnly)} 
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Reason:'>
					<Input type='text'
						size={24}
						value={reason}
						onChange={e => setReason(e.target.value)} 
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Date:'>
					<Input type='date'
						size={24}
						value={date}
						onChange={e => setDate(e.target.value)} 
					/>
				</Field>
			</Row>
		</Form>
	)
}

const label = 'Bulk Status Update';
const title = label;

type BulkStatusUpdateProps = {
	disabled?: boolean;
} & React.ComponentProps<typeof Dropdown>;

const BulkStatusUpdate = ({disabled, ...rest}: BulkStatusUpdateProps) =>
	<Dropdown
		handle={false}
		selectRenderer={({state, methods}) =>
			<Button
				title={title}
				disabled={disabled} 
				isActive={state.isOpen}
				onClick={state.isOpen? methods.close: methods.open}
			>
				{label}
			</Button>}
		dropdownRenderer={(props) => <BulkStatusUpdateForm {...props}/>}
		{...rest}
	/>

export default BulkStatusUpdate;
