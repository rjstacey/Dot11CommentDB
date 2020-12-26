import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppModal from '../modals/AppModal'
import {Form, Field} from '../general/Form'
import {addVoter, updateVoter} from '../actions/voters'
import {setError} from '../actions/error'
import {shallowDiff} from '../lib/utils'

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
			value = parseInt(value, 10)
		}
		setState(state => ({...state, [name]: value}))
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
				a = updateVoter(votingPoolType,	votingPoolName,	voter[key],	changed)
			}
		}
		await a
		close()
	}

	const title = action === 'add'
		? 'Add voter to voter pool ' + votingPoolName
		: 'Update voter'

	const wgVoterFields = (
		<React.Fragment>
			<Field label='SA PIN:'>
				<input type='text' name='SAPIN' value={state.SAPIN} onChange={change}/>
			</Field>
			<Field label='Last name:'>
				<input type='text' name='LastName' value={state.LastName} onChange={change}/>
			</Field>
			<Field label='First name:'>
				<input type='text' name='FirstName' value={state.FirstName} onChange={change}/>
			</Field>
			<Field label='MI:'>
				<input type='text' name='MI' value={state.MI} onChange={change}/>
			</Field>
			<Field label='Email:'>
				<input type='text' name='Email' value={state.Email} onChange={change}/>
			</Field>
			<Field label='Status:'>
				<select name='Status' value={state.Status} onChange={change}>
					<option value='Voter'>Voter</option>
					<option value='ExOfficio'>ExOfficio</option>
				</select>
			</Field>
		</React.Fragment>
	)

	const saVoterFields = (
		<React.Fragment>
			<Field label='Name:'>
				<input type='text' name='Name' value={state.Name} onChange={change}/>
			</Field>
			<Field label='Email:'>
				<input type='text' name='Email' value={state.Email} onChange={change}/>
			</Field>
		</React.Fragment>
	)

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
	updateVoter: PropTypes.func.isRequired,
	addVoter: PropTypes.func.isRequired,
	setError: PropTypes.func.isRequired,
}

export default connect(
	null,
	(dispatch, ownProps) => ({
		addVoter: (...args) => dispatch(addVoter(...args)),
		updateVoter: (votingPoolType, votingPoolId, voterId, voter) => dispatch(updateVoter(votingPoolType, votingPoolId, voterId, voter)),
		setError: (...args) => dispatch(setError(...args))
	})
)(VoterEditModal)