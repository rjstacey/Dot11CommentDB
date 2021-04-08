import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import {AppModal} from 'dot11-common/modals'
import {Form, Row, Col, Field, Input, Checkbox} from 'dot11-common/general/Form'
import AccessSelector from './AccessSelector'
import StatusSelector from './StatusSelector'

import {updateMember, addMember} from '../store/members'

function _MemberUpdateForm({
	action,
	defaultMember,
	addMember,
	updateMember,
	close
}) {
	const [member, setMember] = React.useState(defaultMember);
	const [errMsg, setErrMsg] = React.useState('');

	const submit = async () => {
		if (!member.SAPIN) {
			setErrMsg('SA PIN must be set');
			return;
		}
		if (!member.Name) {
			setErrMsg('Give the member a name');
			return;
		}
		await (action === 'add')? addMember(member): updateMember(member.SAPIN, member)
		close()
	};

	const change = e => setMember({...member, [e.target.name]: e.target.value});

	const actionText = action === 'add'? 'Add': 'Update';

	return (
		<Form
			title={`${actionText} member`}
			submit={submit}
			submitLabel={actionText}
			cancel={close}
			errorText={errMsg}
			style={{width: 400}}
		>
			<Row>
				<Field label='SA PIN:'>
					<Input type='text' size={10} name='SAPIN' value={member.SAPIN} onChange={change}/>
				</Field>
			</Row>
			<Row>
				<Field label='Name:'>
					<Input type='text' size={24} name='Name' value={member.Name} onChange={change}/>
				</Field>
			</Row>
			<Row>
				<Field label='Email:'>
					<Input type='text' size={24} name='Email' value={member.Email} onChange={change}/>
				</Field>
			</Row>
			<Row>
				<Field label='Status:' >
					<Row>
						<Col>
							<label>Override</label>
							<Checkbox
								name='StatusChangeOverride'
								checked={member.StatusChangeOverride}
								onChange={() => setMember({...member, StatusChangeOverride: !member.StatusChangeOverride})}
							/>
						</Col>
						<StatusSelector
							id='Status'
							value={member.Status}
							onChange={value => setMember({...member, Status: value})}
						/>
					</Row>
				</Field>
			</Row>
			{action === 'update' &&	<Row>
				<Field label='Status change reason:' >
					<Input
						type='text'
						size={24}
						name='Reason'
						value={member.Reason}
						onChange={change}
						disabled={member.Status === defaultMember.Status}
					/>
				</Field>
			</Row>}
			<Row>
				<Field label='Access Level:' >
					<AccessSelector
						id='Access'
						value={member.Access}
						onChange={value => setMember({...member, Access: value})}
					/>
				</Field>
			</Row>
		</Form>
	)
}

_MemberUpdateForm.propTypes = {
	action: PropTypes.oneOf(['add', 'update']).isRequired,
	defaultMember: PropTypes.object.isRequired,
	close: PropTypes.func.isRequired,
	addMember: PropTypes.func.isRequired,
	updateMember: PropTypes.func.isRequired
}

const MemberUpdateForm = connect(
	null,
	{addMember, updateMember}
)(_MemberUpdateForm)

function MemberUpdateModal({
	isOpen,
	close,
	action,
	member
}) {
	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<MemberUpdateForm
				key={isOpen}		// remount on open
				action={action}
				defaultMember={member}
				close={close}
			/>
		</AppModal>
	)
}

export default MemberUpdateModal;
