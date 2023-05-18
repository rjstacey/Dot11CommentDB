import React from 'react';

import {Form, Row, Field, Input, Button, Dropdown, DropdownRendererProps} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { updateMembers, selectMembersState } from '../store/members';


function BulkStatusUpdateForm({methods}: DropdownRendererProps) {

	const dispatch = useAppDispatch();
	const {selected, entities: members} = useAppSelector(selectMembersState);
	const [statusChangeReason, setStatusChangeReason] = React.useState('');
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		const updates: any[] = [];
		for (const id of selected) {
			const m = members[id]!;
			//if (m.NewStatus)
			//	updates.push({id, changes: {Status: m.NewStatus, StatusChangeReason: statusChangeReason}});
		}
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
		>
			<Row>
				Change selected member status to expected status
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
