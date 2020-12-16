import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppModal from '../modals/AppModal'
import {addVoter, updateVoter} from '../actions/voters'
import {setError} from '../actions/error'
import {shallowDiff} from '../lib/utils'

const Form = styled.div`
	width: 400px;
	& label {
		font-weight: bold;
		text-align: left;
		width: 100px;
	}
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
	& button {
		width: 100px;
		padding: 8px 16px;
		border: none;
		background: #333;
		color: #f2f2f2;
		text-transform: uppercase;
		border-radius: 2px;
	}
	& .titleRow {
		justify-content: center;
	}
	& .errMsgRow {
		justify-content: center;
		color: red
	}
	& .buttonRow {
		margin-top: 30px;
		justify-content: space-around;
	}
`;

const FormRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	margin: 10px;
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
		? 'Add voter to voting pool ' + votingPoolName
		: 'Update voter'

	const wgVoterFields = (
		<React.Fragment>
			<FormRow>
				<label>SA PIN:</label>
				<input type='text' name='SAPIN' value={state.SAPIN} onChange={change}/>
			</FormRow>
			<FormRow>
				<label>Last Name:</label>
				<input type='text' name='LastName' value={state.LastName} onChange={change}/>
			</FormRow>
			<FormRow>
				<label>First Name:</label>
				<input type='text' name='FirstName' value={state.FirstName} onChange={change}/>
			</FormRow>
			<FormRow>
				<label>MI:</label>
				<input type='text' name='MI' value={state.MI} onChange={change}/>
			</FormRow>
			<FormRow>
				<label>Email:</label>
				<input type='text' name='Email' value={state.Email} onChange={change}/>
			</FormRow>
			<FormRow>
				<label>Status:</label>
				<select name='Status' value={state.Status} onChange={change}>
					<option value='Voter'>Voter</option>
					<option value='ExOfficio'>ExOfficio</option>
				</select>
			</FormRow>
		</React.Fragment>
	)

	const saVoterFields = (
		<React.Fragment>
			<FormRow>
				<label>Name:</label>
				<input type='text' name='Name' value={state.Name} onChange={change}/>
			</FormRow>
			<FormRow>
				<label>Email:</label>
				<input type='text' name='Email' value={state.Email} onChange={change}/>
			</FormRow>
		</React.Fragment>
	)

	return (
		<AppModal
			isOpen={isOpen}
			onAfterOpen={onOpen}
			onRequestClose={close}
		>
			<Form>
				<FormRow className='titleRow'>
					<h3>{title}</h3>
				</FormRow>
				{votingPoolType === 'SA'? saVoterFields: wgVoterFields}
				<FormRow className='buttonRow'>
					<button onClick={submit}>OK</button>
					<button onClick={close}>Cancel</button>
				</FormRow>
			</Form>
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