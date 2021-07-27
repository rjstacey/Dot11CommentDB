import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown'
import {Form, Row, Col, Field, Input, Checkbox} from 'dot11-components/general/Form'
import AccessSelector from './AccessSelector'
import StatusSelector from './StatusSelector'

import {updateMembers} from '../store/members'

function _BulkStatusUpdateForm({
	members,
	selected,
	updateMembers,
	close
}) {
	const [statusChangeReason, setStatusChangeReason] = React.useState('');
	const [busy, setBusy] = React.useState(false);

	const submit = async () => {
		const updates = [];
		for (const sapin of selected) {
			const m = members[sapin];
			if (m.NewStatus)
				updates.push({SAPIN: sapin, Status: m.NewStatus, StatusChangeReason: statusChangeReason})
		}
		setBusy(true);
		await updateMembers(updates);
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

_BulkStatusUpdateForm.propTypes = {
	close: PropTypes.func.isRequired,
	selected: PropTypes.array.isRequired,
	members: PropTypes.object.isRequired,
	updateMembers: PropTypes.func.isRequired,
}

const dataSet = 'members';
const BulkStatusUpdateForm = connect(
	(state) => {
		return {
			selected: state[dataSet].selected,
			members: state[dataSet].entities,
		}
	},
	{updateMembers}
)(_BulkStatusUpdateForm)

const BulkStatusUpdate = () =>
	<ActionButtonDropdown
		label='Bulk Status Update'
	>
		<BulkStatusUpdateForm />
	</ActionButtonDropdown>

export default BulkStatusUpdate;
