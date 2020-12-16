import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppModal from '../modals/AppModal'
import {uploadVoters} from '../actions/voters'

const Form = styled.div`
	width: 400px;
	& label {
		font-weight: bold;
		text-align: left;
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

const defaultState = {
	votingPoolName: '',
	votingPoolType: 'WG'
};

function VotersPoolAddModal({
	isOpen,
	close,
	onSubmit,
	uploadVoters,
	setError
}) {

	const [state, setState] = React.useState(defaultState)
	const [errMsg, setErrMsg] = React.useState('')
	const fileInputRef = React.useRef()

	// Reset votingPool data to default on each open
	const onOpen = () => setState(defaultState)

	function onChange(e) {
		const {name, value} = e.target;
		setState(state => ({...state, [name]: value}))
	}

	async function submit() {
		const {votingPoolType, votingPoolName} = state
		const file = fileInputRef.current.files[0]
		if (!state.votingPoolName) {
			setErrMsg('Voting pool must have a name');
			return
		}
		if (file) {
			await uploadVoters(votingPoolType, votingPoolName, file)
		}
		onSubmit(votingPoolType, votingPoolName)
	}

	return (
		<AppModal
			isOpen={isOpen}
			onAfterOpen={onOpen}
			onRequestClose={close}
		>
			<Form>
				<FormRow className='titleRow'>
					<h3>Add voters pool</h3>
				</FormRow>
				<FormRow>
					<label>Pool Name:</label>
					<input type='text' name='votingPoolName' value={state.votingPoolName} onChange={onChange}/>
				</FormRow>
				<FormRow>
					<input type="radio" name='votingPoolType' value='WG' checked={state.votingPoolType === 'WG'} onChange={onChange} />
					<label>WG ballot pool</label>
				</FormRow>
				<FormRow>
					<input type="radio" name='votingPoolType' value='SA' checked={state.votingPoolType === 'SA'} onChange={onChange} />
					<label>SA ballot pool</label>
				</FormRow>
				<FormRow>
					<label>Voters spreadsheet (optional):</label>
				</FormRow>
				<FormRow>
					<input
						type='file'
						accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						ref={fileInputRef}
					/>
				</FormRow>
				<FormRow className='errMsgRow'>
					<span>{errMsg}</span>
				</FormRow>
				<FormRow className='buttonRow'>
					<button onClick={submit}>OK</button>
					<button onClick={close}>Cancel</button>
				</FormRow>
			</Form>
		</AppModal>
	)
}

VotersPoolAddModal.propTypes = {
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	onSubmit: PropTypes.func.isRequired,
	uploadVoters: PropTypes.func.isRequired,
}

export default connect(
	null,
	(dispatch, ownProps) => ({
		uploadVoters: (votingPoolType, votingPoolName, file) => dispatch(uploadVoters(votingPoolType, votingPoolName, file))
	})
)(VotersPoolAddModal)