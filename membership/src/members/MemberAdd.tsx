import React from 'react';
import {Form, Row, Field, Input, ActionButtonDropdown, RendererProps} from 'dot11-components';
import { useAppDispatch } from '../store/hooks';
import AccessSelector from './AccessSelector';
import StatusSelector from './StatusSelector';

import {addMembers, AccessLevel, MemberAdd} from '../store/members';

const defaultMember: MemberAdd = {SAPIN: 0, Name: '', Email: '', Status: 'Non-Voter', Affiliation: '', Access: AccessLevel.Member}

function MemberAddForm({methods}: RendererProps) {
	const dispatch = useAppDispatch();
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
		await dispatch(addMembers([member]));
		methods.close();
	};

	const change: React.ChangeEventHandler<HTMLInputElement> = (e) => setMember({...member, [e.target.name]: e.target.value});

	return (
		<Form
			title='Add member'
			submit={submit}
			submitLabel='Add'
			cancel={methods.close}
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
						//id='Status'
						value={member.Status}
						onChange={(value: string) => setMember({...member, Status: value})}
					/>
				</Field>
			</Row>
			<Row>
				<Field label='Access Level:' >
					<AccessSelector
						//id='Access'
						value={member.Access}
						onChange={(value: number) => setMember({...member, Access: value})}
					/>
				</Field>
			</Row>
		</Form>
	)
}

const MemberAdder = () =>
	<ActionButtonDropdown
		name='add'
		title='Add member'
		dropdownRenderer={(props) => <MemberAddForm {...props}/>}
	/>

export default MemberAdder;
