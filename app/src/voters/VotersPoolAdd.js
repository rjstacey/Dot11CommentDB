import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import AppModal from '../modals/AppModal'
import {Form, Row, Col, Field, List, ListItem, Input} from '../general/Form'

import {uploadVoters} from '../store/voters'

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
			setErrMsg('Voter pool must have a name');
			return
		}
		if (file)
			await uploadVoters(votingPoolType, votingPoolName, file)
		onSubmit(votingPoolType, votingPoolName)
	}

	return (
		<AppModal
			isOpen={isOpen}
			onAfterOpen={onOpen}
			onRequestClose={close}
		>
			<Form
				title='Add voter pool'
				errorText={errMsg}
				submit={submit}
				cancel={close}
			>
				<Row>
					<Field label='Pool name:'>
						<Input type='text' name='votingPoolName' value={state.votingPoolName} onChange={onChange}/>
					</Field>
				</Row>
				<Row>
					<List>
						<ListItem>
							<input type="radio" name='votingPoolType' value='WG' checked={state.votingPoolType === 'WG'} onChange={onChange} />
							<label>WG ballot pool</label>
						</ListItem>
						<ListItem>
							<input type="radio" name='votingPoolType' value='SA' checked={state.votingPoolType === 'SA'} onChange={onChange} />
							<label>SA ballot pool</label>
						</ListItem>
					</List>
				</Row>
				<Row>
					<Col>
						<label>Voters spreadsheet (optional):</label>
						<input
							type='file'
							accept='.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
							ref={fileInputRef}
						/>
					</Col>
				</Row>
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