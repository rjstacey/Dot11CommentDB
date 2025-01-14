import * as React from "react";

import {
	Form,
	Row,
	List,
	ListItem,
	ActionButtonDropdown,
	DropdownRendererProps,
} from "dot11-components";

import { useAppDispatch } from "@/store/hooks";
import { exportResults } from "@/store/results";
import { getBallotId, Ballot } from "@/store/ballots";

function ResultsExportForm({
	ballot,
	methods,
}: {
	ballot: Ballot;
	methods: DropdownRendererProps["methods"];
}) {
	const [forProject, setForProject] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const ballotId = getBallotId(ballot);

	const dispatch = useAppDispatch();

	async function submit() {
		setBusy(true);
		await dispatch(exportResults(ballot.id, forProject));
		setBusy(false);
		methods.close();
	}

	return (
		<Form
			style={{ width: 300 }}
			title="Export results for:"
			submit={submit}
			cancel={methods.close}
			busy={busy}
		>
			<Row>
				<List>
					<ListItem>
						<input
							type="radio"
							title={ballotId}
							checked={!forProject}
							onChange={() => setForProject(!forProject)}
						/>
						<label>This ballot {ballotId}</label>
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
	);
}

const ResultsExport = ({ ballot }: { ballot?: Ballot }) => (
	<ActionButtonDropdown
		name="export"
		title="Export"
		disabled={!ballot}
		dropdownRenderer={(props) => (
			<ResultsExportForm ballot={ballot!} {...props} />
		)}
	/>
);

export default ResultsExport;
