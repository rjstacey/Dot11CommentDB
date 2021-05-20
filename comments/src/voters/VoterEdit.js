import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {Form, Row, Field, Input, Select} from 'dot11-common/general/Form'
import {shallowDiff, parseNumber} from 'dot11-common/lib/utils'
import {AppModal} from 'dot11-common/modals'
import {setError} from 'dot11-common/store/error'

import {addVoter, updateVoter} from '../store/voters'

const VoterEditForm = styled(Form)`
	width: 400px;
	& input[name=SAPIN] {
		width: 100px;
	}
	& input[name=LastName],
	& input[name=FirstName] {
		width: 150px;
	}
	& input[name=MI] {
		width: 50px;
	}
	& input[name=Name] {
		width: 200px;
	}
	& input[name=Email] {
		width: 250px;
	}
	& select[name=Status] {
		width: 200px;
	}
`;

const statusOptions = [
	{value: 'Voter', label: 'Voter'},
	{value: 'ExOfficio', label: 'ExOfficio'}
];

function VoterEditModal({
	isOpen,
	close,
	votingPoolName,
	votingPoolType,
	voter,
	action,
	updateVoter,
	addVoter,
	setError,
}) {
	const [state, setState] = React.useState(voter)

	const onOpen = () => setState(voter)

	function change(e) {
		let {name, value} = e.target
		if (name === 'SAPIN') {
			value = parseNumber(value)
		}
		setState(state => ({...state, [name]: value}))
	}

	const changeStatus = (options) => {
		const value = options.length? options[0].value: '';
		setState(state => ({...state, Status: value}))
	}

	async function submit(e) {
		const key = votingPoolType === 'SA'? 'Email': 'SAPIN'
		let a
		if (!state[key]) {
			a = setError(`Unable to ${action} voter`, `${key} must not be blank.`)
		}
		else {
			if (action === 'add') {
				a = addVoter(votingPoolType, votingPoolName, state)
			}
			else {
				const changed = shallowDiff(voter, state)
				a = updateVoter(votingPoolType,	votingPoolName,	voter.id, changed)
			}
		}
		await a
		close()
	}

	const title = action === 'add'
		? 'Add voter to voter pool ' + votingPoolName
		: 'Update voter'

	const wgVoterFields =
		<React.Fragment>
			<Row>
				<Field label='SA PIN:'>
					<Input type='text' name='SAPIN' value={state.SAPIN} onChange={change}/>
				</Field>
			</Row>
			<Row>
				<Field label='Last name:'>
					<Input type='text' name='LastName' value={state.LastName} onChange={change}/>
				</Field>
			</Row>
			<Row>
				<Field label='First name:'>
					<Input type='text' name='FirstName' value={state.FirstName} onChange={change}/>
				</Field>
			</Row>
			<Row>
				<Field label='MI:'>
					<Input type='text' name='MI' value={state.MI} onChange={change}/>
				</Field>
			</Row>
			<Row>
				<Field label='Email:'>
					<Input type='text' name='Email' value={state.Email} onChange={change}/>
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
		</React.Fragment>

	const saVoterFields =
		<React.Fragment>
			<Row>
				<Field label='Name:'>
					<Input type='text' name='Name' value={state.Name} onChange={change}/>
				</Field>
			</Row>
			<Row>
				<Field label='Email:'>
					<Input type='text' name='Email' value={state.Email} onChange={change}/>
				</Field>
			</Row>
		</React.Fragment>

	return (
		<AppModal
			isOpen={isOpen}
			onAfterOpen={onOpen}
			onRequestClose={close}
		>
			<VoterEditForm
				title={title}
				submit={submit}
				cancel={close}
			>
				{votingPoolType === 'SA'? saVoterFields: wgVoterFields}
			</VoterEditForm>
		</AppModal>
	)
}

VoterEditModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	votingPoolName: PropTypes.string.isRequired,
	votingPoolType: PropTypes.oneOf(['SA', 'WG']),
	voter: PropTypes.object.isRequired,
	action: PropTypes.oneOf(['add', 'update']),
	addVoter: PropTypes.func.isRequired,
	updateVoter: PropTypes.func.isRequired,
	setError: PropTypes.func.isRequired,
}

export default connect(
	null,
	{addVoter, updateVoter, setError}
)(VoterEditModal)