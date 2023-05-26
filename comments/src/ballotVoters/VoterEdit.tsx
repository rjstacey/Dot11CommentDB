import React from 'react';

import {
	Form, Row, Field, Select,
	shallowDiff,
	AppModal,
	Checkbox
} from 'dot11-components';

import MemberSelector from './MemberSelector';

import { useAppDispatch } from '../store/hooks';
import { VoterCreate, addVoter, updateVoter } from '../store/voters';

const statusOptions = [
	{value: 'Voter', label: 'Voter'},
	{value: 'ExOfficio', label: 'ExOfficio'}
];

function VoterEditModal({
	isOpen,
	close,
	ballot_id,
	voter,
	action,
}: {
	isOpen: boolean;
	close: () => void;
	ballot_id: number;
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

	function changeState(changes: Partial<VoterCreate>) {
		setState(state => ({...state, ...changes}));
	}

	async function submit() {
		if (!state.SAPIN) {
			setErrMsg(`Select member`);
		}
		else {
			if (action === 'add') {
				await dispatch(addVoter(ballot_id, state));
			}
			else {
				const changes = shallowDiff(voter, state);
				await dispatch(updateVoter(voter.id!, changes));
			}
			close();
		}
	}

	const title = action === 'add'? 'Add voter': 'Update voter'

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
				<Row>
					<Field label='Excused:'>
						<Checkbox
							checked={state.Excused}
							onClick={() => changeState({Excused: !state.Excused})}
						/>
					</Field>
				</Row>
			</Form>
		</AppModal>
	)
}

export default VoterEditModal;
