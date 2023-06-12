import React from 'react';

import { Form, Row, List, ListItem, ActionButtonDropdown } from 'dot11-components';

import { useAppDispatch } from '../store/hooks';
import { exportResults } from '../store/results'
import type { Ballot } from '../store/ballots';

function ResultsExportForm({ballot, methods}: {ballot: Ballot, methods: any}) {
	const [forProject, setForProject] = React.useState(false);
	const [busy, setBusy] = React.useState(false);

	const dispatch = useAppDispatch();

	async function submit() {
		setBusy(true);
		await dispatch(exportResults(ballot.id, forProject));
		setBusy(false);
		methods.close();
	}

	return (
		<Form
			style={{width: 300}}
			title='Export results for:'
			submit={submit}
			cancel={methods.close}
			busy={busy}
		>
			<Row>
				<List>
					<ListItem>
						<input
							type="radio"
							title={ballot.BallotID}
							checked={!forProject}
							onChange={() => setForProject(!forProject)}
						/>
						<label>This ballot {ballot.BallotID}</label>
					</ListItem>
					<ListItem>
						<input
							type="radio"
							title={ballot.Project}
							checked={forProject}
							onChange={() => setForProject(!forProject)}
						/>
						<label>This project {ballot.Project}</label>
					</ListItem>
				</List>
			</Row>
		</Form>
	)
}

const ResultsExport = ({ballot}: {ballot?: Ballot}) => 
	<ActionButtonDropdown
		name='export'
		title='Export'
		disabled={!ballot}
		dropdownRenderer={(props) => <ResultsExportForm	ballot={ballot!} {...props} />}
	/>

export default ResultsExport;