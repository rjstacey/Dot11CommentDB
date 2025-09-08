import React from "react";
import { Row, Col, Form, Button, Spinner, Modal } from "react-bootstrap";
import { Select, shallowDiff } from "@common";

import MemberSelector from "./MemberSelector";

import { useAppDispatch } from "@/store/hooks";
import { VoterCreate, addVoter, updateVoter } from "@/store/voters";

const statusOptions = [
	{ value: "Voter", label: "Voter" },
	{ value: "ExOfficio", label: "ExOfficio" },
];

function SubmitCancel({
	action,
	busy,
	cancel,
}: {
	action: "add" | "update" | null;
	busy?: boolean;
	cancel?: () => void;
}) {
	if (action !== "add" && action !== "update") return null;
	return (
		<Form.Group as={Row} className="mb-3">
			<Col xs={6} className="d-flex justify-content-center">
				<Button type="submit">
					{busy && <Spinner size="sm" className="me-2" />}
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

function VoterEditForm({
	voter,
	action,
	close,
}: {
	voter: VoterCreate;
	action: "add" | "update" | null;
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const [state, setState] = React.useState(voter);

	React.useEffect(() => setState(voter), [voter]);

	function changeState(changes: Partial<VoterCreate>) {
		setState((state) => ({ ...state, ...changes }));
	}

	const changeStatus = (options: typeof statusOptions) => {
		const value = options.length ? options[0].value : "";
		changeState({ Status: value });
	};

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (action === "add") {
			await dispatch(addVoter(state));
		} else {
			const changes = shallowDiff(voter, state);
			await dispatch(updateVoter(voter.id!, changes));
		}
		close();
	}

	const title = action === "add" ? "Add voter" : "Update voter";

	return (
		<Form
			style={{ width: 500 }}
			title={title}
			onSubmit={handleSubmit}
			className="p-3"
		>
			<Form.Group as={Row} className="mb-3">
				<Form.Label column xs={2} htmlFor="voter-member-selector">
					Member:
				</Form.Label>
				<Col>
					<MemberSelector
						id="voter-member-selector"
						style={{ maxWidth: 400 }}
						value={state.SAPIN}
						onChange={(value) =>
							setState({ ...state, SAPIN: value })
						}
					/>
					<Form.Control
						type="text"
						hidden
						required
						isInvalid={!state.SAPIN}
					/>
					<Form.Control.Feedback type="invalid">
						Select member
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} controlId="voter-status" className="mb-3">
				<Form.Label column xs={2}>
					Status:
				</Form.Label>
				<Col>
					<Select
						style={{ width: 200 }}
						values={[
							statusOptions.find(
								(v) => v.value === state.Status
							)!,
						]}
						options={statusOptions}
						onChange={changeStatus}
					/>
				</Col>
			</Form.Group>
			<Form.Group
				as={Row}
				controlId="voter-excused"
				className="align-items-center mb-3"
			>
				<Form.Label column xs={2}>
					Excused:
				</Form.Label>
				<Col>
					<Form.Check
						checked={state.Excused}
						onChange={() =>
							changeState({ Excused: !state.Excused })
						}
					/>
				</Col>
			</Form.Group>
			<SubmitCancel action={action} busy={false} cancel={close} />
		</Form>
	);
}

function VoterEditModal({
	isOpen,
	close,
	voter,
	action,
}: {
	isOpen: boolean;
	close: () => void;
	voter: VoterCreate;
	action: "add" | "update" | null;
}) {
	return (
		<Modal show={isOpen} onHide={close}>
			<VoterEditForm voter={voter} action={action} close={close} />
		</Modal>
	);
	return null;
}

export default VoterEditModal;
