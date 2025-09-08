import React from "react";
import { Row, Col, Button, Spinner, Form } from "react-bootstrap";

import { EditBallot } from "./BallotEdit";

import { useAppDispatch } from "@/store/hooks";
import {
	addBallot,
	setSelectedBallots,
	setCurrentGroupProject,
	Ballot,
} from "@/store/ballots";

function SubmitCancel({
	action,
	busy,
	cancel,
}: {
	action: "add" | "update";
	busy?: boolean;
	cancel?: () => void;
}) {
	if (action !== "add" && action !== "update") return null;
	return (
		<Form.Group as={Row} className="mb-3">
			<Col xs={6} className="d-flex justify-content-center">
				<Button type="submit">
					{busy && <Spinner animation="border" size="sm" />}
					{action === "add" ? "Add" : "Update"}
				</Button>
			</Col>
			<Col xs={6} className="d-flex justify-content-center">
				<Button variant="secondary" onClick={cancel}>
					Cancel
				</Button>
			</Col>
		</Form.Group>
	);
}

export function BallotAddForm({
	defaultBallot,
	close,
}: {
	defaultBallot: Ballot;
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const [ballot, setBallot] = React.useState(defaultBallot);

	let errorMsg = "";
	if (!ballot.groupId) errorMsg = "Group not set";
	else if (ballot.Type === null) errorMsg = "Ballot type not set";
	else if (!ballot.number) errorMsg = "Ballot number not set";
	else if (!ballot.Project) errorMsg = "Project not set";

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!errorMsg) {
			setBusy(true);
			const b = await dispatch(addBallot(ballot));
			if (b) {
				dispatch(
					setCurrentGroupProject({
						groupId: ballot.groupId,
						project: ballot.Project,
					})
				);
				dispatch(setSelectedBallots([b.id]));
			}
			setBusy(false);
			close();
		}
	};

	return (
		<Form onSubmit={handleSubmit}>
			<EditBallot
				ballot={ballot}
				updateBallot={(changes) =>
					setBallot((ballot) => ({ ...ballot, ...changes }))
				}
				readOnly={false}
			/>
			<SubmitCancel action="add" busy={busy} cancel={close} />
		</Form>
	);
}

export default BallotAddForm;
