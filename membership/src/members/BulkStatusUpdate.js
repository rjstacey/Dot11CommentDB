import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {Dropdown} from 'dot11-components/general';
import {Form, Row, Field, Input, Button} from 'dot11-components/form';

import {updateMembers, selectMembersState} from '../store/members';


function BulkStatusUpdateForm({methods}) {

	const dispatch = useDispatch();
	const {selected, entities: members} = useSelector(selectMembersState);
	const [statusChangeReason, setStatusChangeReason] = React.useState('');
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		const updates = [];
		for (const id of selected) {
			const m = members[id];
			if (m.NewStatus)
				updates.push({id, changes: {Status: m.NewStatus, StatusChangeReason: statusChangeReason}});
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

BulkStatusUpdateForm.propTypes = {
	methods: PropTypes.object.isRequired
}

const label = 'Bulk Status Update';
const title = label;

const BulkStatusUpdate = ({disabled, ...rest}) =>
	<Dropdown
		handle={false}
		selectRenderer={({isOpen, open, close}) =>
			<Button
				title={title}
				disabled={disabled} 
				active={isOpen}
				onClick={isOpen? close: open}
			>
				{label}
			</Button>}
		dropdownRenderer={(props) => <BulkStatusUpdateForm {...props}/>}
		{...rest}
	/>

export default BulkStatusUpdate;
