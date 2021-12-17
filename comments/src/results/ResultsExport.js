import PropTypes from 'prop-types';
import React from 'react';
import {connect, useDispatch} from 'react-redux';
import styled from '@emotion/styled';

import {Form, Row, List, ListItem} from 'dot11-components/form';
import {ActionButtonDropdown} from 'dot11-components/general/Dropdown';

import {exportResultsForProject, exportResultsForBallot} from '../store/results'

function ResultsExportForm({close, ballot}) {
	const [forProject, setForProject] = React.useState(false);
	const [busy, setBusy] = React.useState(false);

	const dispatch = useDispatch();

	async function submit() {
		setBusy(true);
		await dispatch(forProject? exportResultsForProject(ballot.Project): exportResultsForBallot(ballot.id));
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
							title={ballot.BallotID}
							checked={!forProject}
							onChange={e => setForProject(!forProject)}
						/>
						<label>This ballot {ballot.BallotID}</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							title={ballot.Project}
							checked={forProject}
							onChange={e => setForProject(!forProject)}
						/>
						<label>This project {ballot.Project}</label>
					</ListItem>
				</List>
			</Row>
		</Form>
	)
}

ResultsExportForm.propTypes = {
	ballot: PropTypes.object,
	//close: PropTypes.func.isRequired,
}

const ResultsExport = ({ballot}) => 
	<ActionButtonDropdown
		name='export'
		title='Export'
		disabled={!ballot}
	>
		<ResultsExportForm
			ballot={ballot}
		/>
	</ActionButtonDropdown>

ResultsExport.propTypes = {
	ballot: PropTypes.object,
}

export default ResultsExport;