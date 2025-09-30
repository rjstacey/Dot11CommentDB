import * as React from "react";
import {
	DropdownButton,
	Button,
	Form,
	Row,
	Col,
	Spinner,
} from "react-bootstrap";

import { useAppDispatch } from "@/store/hooks";
import { exportResults } from "@/store/results";
import { getBallotId, Ballot } from "@/store/ballots";

function ResultsExportForm({
	ballot,
	close,
}: {
	ballot: Ballot;
	close: () => void;
}) {
	const [forProject, setForProject] = React.useState(false);
	const [busy, setBusy] = React.useState(false);
	const ballotId = getBallotId(ballot);

	const dispatch = useAppDispatch();

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await dispatch(exportResults(ballot.id, forProject));
		setBusy(false);
		close();
	}

	return (
		<Form
			style={{ width: 300 }}
			title="Export results for:"
			onSubmit={handleSubmit}
			className="p-3"
		>
			<Row className="mb-3">
				<Col>Export results for:</Col>
			</Row>
			<Row className="mb-3">
				<Col>
					<Form.Check
						id="for-ballot"
						type="radio"
						title={ballotId}
						checked={!forProject}
						onChange={() => setForProject(!forProject)}
						label={"Ballot " + ballotId}
					/>
					<Form.Check
						id="for-ballot-series"
						type="radio"
						title={ballot.Project}
						checked={forProject}
						onChange={() => setForProject(!forProject)}
						label={"Ballot series " + ballot.Project}
					/>
				</Col>
			</Row>
			<Row>
				<Col className="d-flex justify-content-end">
					<Button type="submit">
						{busy && <Spinner size="sm" className="me-2" />}
						Export
					</Button>
				</Col>
			</Row>
		</Form>
	);
}

function ResultsExport({ ballot }: { ballot?: Ballot }) {
	const [show, setShow] = React.useState(false);
	return (
		<DropdownButton
			variant="light"
			title="Export"
			show={show}
			onToggle={() => setShow(!show)}
			disabled={!ballot}
		>
			<ResultsExportForm ballot={ballot!} close={() => setShow(false)} />
		</DropdownButton>
	);
}

export default ResultsExport;
