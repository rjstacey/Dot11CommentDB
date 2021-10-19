import PropTypes from 'prop-types'
import React from 'react'
import {connect} from 'react-redux'
import styled from '@emotion/styled'
import fetcher from 'dot11-components/lib/fetcher'
import {Form, Row, List, ListItem} from 'dot11-components/form'
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown'
import {setError} from 'dot11-components/store/error'

function _ResultsExportForm({close, ballot, setError}) {
	const ballotId = ballot.BallotID;
	const project = ballot.Project;
	const [forProject, setForProject] = React.useState(false);
	const [busy, setBusy] = React.useState(false);

	async function submit() {
		setBusy(true);
		const params = forProject? {Project: project}: {BallotID: ballotId};
		try {
			await fetcher.getFile('/api/resultsExport', params);
		}
		catch (error) {
			setError(`Unable to export results for ${forProject? project: ballotId}`, error);
		}
		setBusy(false);
		close();
	}

	return (
		<Form
			style={{width: 300}}
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
		</Form>
	)
}

_ResultsExportForm.propTypes = {
	ballot: PropTypes.object.isRequired,
	close: PropTypes.func.isRequired,
	setError: PropTypes.func.isRequired,
}

const ResultsExportForm = connect(
	null,
	{setError}
)(_ResultsExportForm);

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
			<ResultsExportForm
				ballot={ballot}
			/>
		</ActionButtonDropdown>
	)
}
export default ResultsExport;