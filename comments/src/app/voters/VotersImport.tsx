import React from "react";
import {
	Row,
	Col,
	Form,
	DropdownButton,
	Button,
	Spinner,
} from "react-bootstrap";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	votersFromSpreadsheet,
	votersFromMembersSnapshot,
} from "@/store/voters";
import { selectBallot, Ballot } from "@/store/ballots";

type Source = "members" | "upload";

type State = {
	source: Source;
	date: string;
	file: File | null;
};

function initState(ballot: Ballot | undefined): State {
	const date = (
		ballot?.Start ? ballot.Start : new Date().toISOString()
	).slice(0, 10);
	return {
		source: "members",
		date,
		file: null,
	};
}

function getErrorText(state: State) {
	if (state.source === "members" && !state.date)
		return "Select date for members snapshot";
	if (state.source === "upload" && !state.file) return "Select a file upload";
}

export function VotersImportForm({
	close,
	ballot,
}: {
	close: () => void;
	ballot?: Ballot;
}) {
	const dispatch = useAppDispatch();
	const [state, setState] = React.useState<State>(() => initState(ballot));
	const [busy, setBusy] = React.useState(false);
	const fileRef = React.useRef<HTMLInputElement>(null);

	const errorText = getErrorText(state);

	async function handleSubmit() {
		if (errorText || !ballot) return;
		setBusy(true);
		await dispatch(
			state.source === "members"
				? votersFromMembersSnapshot(ballot.id, state.date)
				: votersFromSpreadsheet(ballot.id, state.file!)
		);
		setBusy(false);
		close();
	}

	function changeState(changes: Partial<State>) {
		setState({ ...state, ...changes });
	}

	return (
		<Form style={{ width: 400 }} onSubmit={handleSubmit} className="p-3">
			<Row className="mb-3">
				<Col>Create voter pool from...</Col>
			</Row>
			<Row className="d-flex align-items-center mb-3">
				<Col xs={6}>
					<Form.Check
						id="source-members"
						checked={state.source === "members"}
						onChange={() => changeState({ source: "members" })}
						label="Members snapshot:"
					/>
				</Col>
				<Col xs={6}>
					<Form.Control
						type="date"
						value={state.date}
						onChange={(e) => changeState({ date: e.target.value })}
					/>
				</Col>
			</Row>
			<Row className="d-flex align-items-center mb-3">
				<Col xs="auto">
					<Form.Check
						id="source-upload"
						checked={state.source === "upload"}
						onChange={() => changeState({ source: "upload" })}
						label="Upload"
					/>
				</Col>
				<Col>
					<Form.Control
						id="source-upload-file"
						type="file"
						accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						ref={fileRef}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							changeState({
								file: e.target.files ? e.target.files[0] : null,
							})
						}
						isInvalid={state.source === "upload" && !state.file}
					/>
					<Form.Control.Feedback type="invalid">
						Select spreadsheet file
					</Form.Control.Feedback>
				</Col>
			</Row>
			<Row>
				<Col className="d-flex justify-content-end">
					<Button
						type="submit"
						disabled={state.source === "upload" && !state.file}
					>
						{busy && <Spinner size="sm" className="me-2" />}
						Create
					</Button>
				</Col>
			</Row>
		</Form>
	);
}

function VotersImportButton({ ballot_id }: { ballot_id?: number | null }) {
	const [show, setShow] = React.useState(false);
	const ballot = useAppSelector((state) =>
		ballot_id ? selectBallot(state, ballot_id) : undefined
	);

	return (
		<DropdownButton
			variant="light"
			show={show}
			onToggle={() => setShow(!show)}
			title="New voters pool"
			disabled={!ballot}
		>
			<VotersImportForm ballot={ballot} close={() => setShow(false)} />
		</DropdownButton>
	);
}

export default VotersImportButton;
