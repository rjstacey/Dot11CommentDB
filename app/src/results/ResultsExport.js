import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import AppModal from '../modals/AppModal'
import fetcher from '../lib/fetcher'
import {setError} from '../actions/error'

const Form = styled.div`
	width: 400px;
	padding: 0;
	overflow: visible;
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
		justify-content: left;
	}
	& .buttonRow {
		margin-top: 30px;
		justify-content: space-around;
	}`

const FormRow = styled.div`
	display: flex;
	flex-wrap: wrap;
	margin: 10px;
	justify-content: flex-start;`

function ResultsExportModal({isOpen, close, ballot, setError}) {
	const ballotId = ballot.BallotID;
	const project = ballot.Project;
	const [forProject, setForProject] = React.useState(false);

	async function submit(e) {
		const params = forProject? {Project: project}: {BallotID: ballotId}
		try {
			await fetcher.getFile('/api/exportResults', params)
		}
		catch (error) {
			setError(`Unable to export results for ${forProject? project: ballotId}`, error)
		}
		close()
	}

	return (
		<AppModal
			isOpen={isOpen}
			onRequestClose={close}
		>
			<Form>
				<FormRow className='titleRow'>
					<h3>Export results for:</h3>
				</FormRow>
				<FormRow>
					<input
						type="radio"
						title={ballotId}
						checked={!forProject}
						onChange={e => setForProject(!forProject)}
					/>
					<label>This ballot {ballotId}</label>
				</FormRow>
				<FormRow>
					<input
						type="radio"
						title={project}
						checked={forProject}
						onChange={e => setForProject(!forProject)}
					/>
					<label>This project {project}</label>
				</FormRow>
				<FormRow className='buttonRow'>
					<button onClick={submit}>OK</button>
					<button onClick={close}>Cancel</button>
				</FormRow>
			</Form>
		</AppModal>
	)
}

ResultsExportModal.propTypes = {
	ballot: PropTypes.object.isRequired,
	isOpen: PropTypes.bool.isRequired,
	close: PropTypes.func.isRequired,
	setError: PropTypes.func.isRequired,
}

export default connect(
	null,
	(dispatch, ownProps) => ({
		setError: (...args) => dispatch(setError(...args))
	})
)(ResultsExportModal);