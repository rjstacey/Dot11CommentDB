import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {ActionButtonDropdown} from 'dot11-components/general/Dropdown';
import {Form, Row, Col, Field, Input, Checkbox} from 'dot11-components/form';
import AccessSelector from './AccessSelector';
import StatusSelector from './StatusSelector';

import {updateMembers, getMembersDataSet} from '../store/members';

function BulkStatusUpdateForm({close}) {

	const dispatch = useDispatch();
	const {selected, entities: members} = useSelector(getMembersDataSet);
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
		close();
	}

	return (
		<Form
			title='Bulk status update'
			submit={submit}
			cancel={close}
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
	close: PropTypes.func
}

const BulkStatusUpdate = () =>
	<ActionButtonDropdown
		label='Bulk Status Update'
	>
		<BulkStatusUpdateForm />
	</ActionButtonDropdown>

export default BulkStatusUpdate;
