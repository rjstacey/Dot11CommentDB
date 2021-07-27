import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown'
import {Form, Row, Col, Field, Input, Checkbox} from 'dot11-components/general/Form'
import AccessSelector from './AccessSelector'
import StatusSelector from './StatusSelector'

import {addMember, AccessLevel} from '../store/members'

const defaultMember = {SAPIN: '', Name: '', Email: '', Status: 'Non-Voter', Access: AccessLevel.Member}

function _MemberAddForm({
	action,
	addMember,
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
		await addMember(member);
		close();
	};

	const change = e => setMember({...member, [e.target.name]: e.target.value});

	return (
		<Form
			title='Add member'
			submit={submit}
			submitLabel='Add'
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
					<StatusSelector
						id='Status'
						value={member.Status}
						onChange={value => setMember({...member, Status: value})}
					/>
				</Field>
			</Row>
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

_MemberAddForm.propTypes = {
	close: PropTypes.func.isRequired,
	addMember: PropTypes.func.isRequired,
}

const MemberAddForm = connect(
	null,
	{addMember}
)(_MemberAddForm)

const MemberAdd = () =>
	<ActionButtonDropdown
		name='add'
		title='Add member' 
	>
		<MemberAddForm />
	</ActionButtonDropdown>

export default MemberAdd;
