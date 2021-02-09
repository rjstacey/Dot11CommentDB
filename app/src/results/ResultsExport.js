import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {Form, Row} from '../general/Form'
import fetcher from '../store/lib/fetcher'
import {ActionButtonDropdown} from '../general/Dropdown'

import {setError} from '../store/actions/error'

const ResultsExportForm = styled(Form)`
	width: 300px;
`;

function _ResultsExportDropdown({close, ballot, setError}) {
	const ballotId = ballot.BallotID;
	const project = ballot.Project;
	const [forProject, setForProject] = React.useState(false);

	async function submit(e) {
		const params = forProject? {Project: project}: {BallotID: ballotId}
		try {
			await fetcher.getFile('/api/resultsExport', params)
		}
		catch (error) {
			setError(`Unable to export results for ${forProject? project: ballotId}`, error)
		}
		close()
	}

	return (
		<ResultsExportForm
			title='Export results for:'
			submit={submit}
			cancel={close}
		>
			<Row>
				<input
					type="radio"
					title={ballotId}
					checked={!forProject}
					onChange={e => setForProject(!forProject)}
				/>
				<label>This ballot {ballotId}</label>
			</Row>
			<Row>
				<input
					type="radio"
					title={project}
					checked={forProject}
					onChange={e => setForProject(!forProject)}
				/>
				<label>This project {project}</label>
			</Row>
		</ResultsExportForm>
	)
}

_ResultsExportDropdown.propTypes = {
	ballot: PropTypes.object.isRequired,
	close: PropTypes.func.isRequired,
	setError: PropTypes.func.isRequired,
}

const ResultsExportDropdown = connect(
	null,
	(dispatch, ownProps) => ({
		setError: (...args) => dispatch(setError(...args))
	})
)(_ResultsExportDropdown);

function ResultsExport({
	ballotId,
	ballot
}) {
	return (
		<ActionButtonDropdown
			name='export'
			title='Export'
			disabled={!ballotId}
		>
			<ResultsExportDropdown
				ballot={ballot}
			/>
		</ActionButtonDropdown>
	)
}
export default ResultsExport;