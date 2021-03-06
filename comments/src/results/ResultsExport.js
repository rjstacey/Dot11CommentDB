import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import {Form, Row, List, ListItem} from 'dot11-components/general/Form'
import fetcher from 'dot11-components/lib/fetcher'
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown'
import {setError} from 'dot11-components/store/error'

const ResultsExportForm = styled(Form)`
	width: 300px;
`;

function _ResultsExportDropdown({close, ballot, setError}) {
	const ballotId = ballot.BallotID;
	const project = ballot.Project;
	const [forProject, setForProject] = React.useState(false);
	const [busy, setBusy] = React.useState(false);

	async function submit() {
		setBusy(true);
		const params = forProject? {Project: project}: {BallotID: ballotId}
		try {
			await fetcher.getFile('/api/resultsExport', params)
		}
		catch (error) {
			setError(`Unable to export results for ${forProject? project: ballotId}`, error)
		}
		setBusy(false);
		close();
	}

	return (
		<ResultsExportForm
			title='Export results for:'
			submit={submit}
			cancel={close}
			busy={busy}
		>
			<Row>
				<List>
					<ListItem>
						<input
							type="radio"
							title={ballotId}
							checked={!forProject}
							onChange={e => setForProject(!forProject)}
						/>
						<label>This ballot {ballotId}</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							title={project}
							checked={forProject}
							onChange={e => setForProject(!forProject)}
						/>
						<label>This project {project}</label>
					</ListItem>
				</List>
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
	{setError}
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