import PropTypes from 'prop-types';
import React from 'react';
import {useDispatch} from 'react-redux';
import styled from '@emotion/styled';

import {Form, Row, Field, Input, Select} from 'dot11-components/form';
import {shallowDiff, parseNumber} from 'dot11-components/lib';
import {AppModal} from 'dot11-components/modals';

import MemberSelector from '../members/MemberSelector';

import {addVoter, updateVoter} from '../store/voters';

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
}) {
	const [state, setState] = React.useState(voter);
	const [errMsg, setErrMsg] = React.useState('');

	const dispatch = useDispatch();

	const onOpen = () => setState(voter);

	const changeStatus = (options) => {
		const value = options.length? options[0].value: '';
		setState(state => ({...state, Status: value}));
	}

	async function submit(e) {
		if (!state.SAPIN) {
			setErrMsg(`Select member`);
		}
		else {
			if (action === 'add') {
				await dispatch(addVoter(votingPoolName, state));
			}
			else {
				const changes = shallowDiff(voter, state);
				await dispatch(updateVoter(voter.id, changes));
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

VoterEditModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	votingPoolName: PropTypes.string.isRequired,
	voter: PropTypes.object.isRequired,
	action: PropTypes.oneOf(['add', 'update']),
}

export default VoterEditModal;
