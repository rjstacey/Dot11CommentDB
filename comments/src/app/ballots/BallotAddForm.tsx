import React from "react";
import { Row, Col, Button, Spinner, Form } from "react-bootstrap";

import { useAppDispatch } from "@/store/hooks";
import {
	addBallot,
	setSelectedBallots,
	setCurrentGroupProject,
	Ballot,
} from "@/store/ballots";

import { BallotEdit } from "./BallotEdit";

function SubmitCancel({
	action,
	busy,
	cancel,
	disabled,
}: {
	action: "add" | "update";
	busy?: boolean;
	cancel?: () => void;
	disabled?: boolean;
}) {
	if (action !== "add" && action !== "update") return null;
	return (
		<Form.Group as={Row} className="mb-3">
			<Col xs={6} className="d-flex justify-content-center">
				<Button variant="secondary" onClick={cancel}>
					Cancel
				</Button>
			</Col>
			<Col xs={6} className="d-flex justify-content-center">
				<Button type="submit" disabled={busy || disabled}>
					{busy && <Spinner animation="border" size="sm" />}
					{action === "add" ? "Add" : "Update"}
				</Button>
			</Col>
		</Form.Group>
	);
}

export function BallotAddForm({
	defaultBallot,
	close,
	setBusy,
}: {
	defaultBallot: Ballot;
	close: () => void;
	setBusy: (busy: boolean) => void;
}) {
	const dispatch = useAppDispatch();
	const formRef = React.useRef<HTMLFormElement>(null);
	const [formValid, setFormValid] = React.useState(false);
	const [ballot, setBallot] = React.useState(defaultBallot);

	React.useLayoutEffect(() => {
		const isValid = formRef.current?.checkValidity() || false;
		setFormValid(isValid);
	});

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
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
	};

	console.log(formValid);

	return (
		<Form ref={formRef} noValidate onSubmit={handleSubmit}>
			<BallotEdit
				ballot={ballot}
				updateBallot={(changes) =>
					setBallot((ballot) => ({ ...ballot, ...changes }))
				}
				readOnly={false}
			/>
			<SubmitCancel action="add" cancel={close} disabled={!formValid} />
		</Form>
	);
}

export default BallotAddForm;
