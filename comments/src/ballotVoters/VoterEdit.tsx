import React from 'react';

import {
	Form, Row, Field, Select,
	shallowDiff,
	AppModal
} from 'dot11-components';

import MemberSelector from './MemberSelector';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { VoterCreate, addVoter, updateVoter } from '../store/voters';
import { selectMemberEntities } from '../store/members';

const statusOptions = [
	{value: 'Voter', label: 'Voter'},
	{value: 'ExOfficio', label: 'ExOfficio'}
];

function VoterEditModal({
	isOpen,
	close,
	votingPoolName,
	voter,
	action,
}: {
	isOpen: boolean;
	close: () => void;
	votingPoolName: string;
	voter: VoterCreate;
	action: "add" | "update";
}) {
	const [state, setState] = React.useState(voter);
	const [errMsg, setErrMsg] = React.useState('');

	const dispatch = useAppDispatch();

	const onOpen = () => setState(voter);

	const changeStatus = (options: typeof statusOptions) => {
		const value = options.length? options[0].value: '';
		setState(state => ({...state, Status: value}));
	}

	async function submit() {
		if (!state.SAPIN) {
			setErrMsg(`Select member`);
		}
		else {
			if (action === 'add') {
				await dispatch(addVoter(votingPoolName, state));
			}
			else {
				const changes = shallowDiff(voter, state);
				await dispatch(updateVoter(voter.id!, changes));
			}
			close();
		}
	}

	const title = action === 'add'
		? 'Add voter to voter pool ' + votingPoolName
		: 'Update voter'

	return (
		<AppModal
			isOpen={isOpen}
			onAfterOpen={onOpen}
			onRequestClose={close}
			style={{overflow: 'unset'}}
		>
			<Form
				style={{width: 500}}
				title={title}
				submit={submit}
				cancel={close}
				errorText={errMsg}
			>
				<Row>
					<Field label='Member:'>
						<MemberSelector
							style={{maxWidth: 400, flex: 1}}
							value={state.SAPIN}
							onChange={value => setState({...state, SAPIN: value})}
						/>
					</Field>
				</Row>
				<Row>
					<Field label='Status:'>
						<Select
							style={{width: 120}}
							values={[statusOptions.find(v => v.value === state.Status)]}
							options={statusOptions}
							onChange={changeStatus}
							portal={document.querySelector('#root')}
						/>
					</Field>
				</Row>
			</Form>
		</AppModal>
	)
}

export default VoterEditModal;
