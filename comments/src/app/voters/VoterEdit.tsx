import React from "react";
import { Row, Col, Form, Button, Spinner } from "react-bootstrap";
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
				<Button variant="secondary" onClick={cancel}>
					Cancel
				</Button>
			</Col>
			<Col xs={6} className="d-flex justify-content-center">
				<Button type="submit">
					{busy && <Spinner size="sm" className="me-2" />}
					{action === "add" ? "Add" : "Update"}
				</Button>
			</Col>
		</Form.Group>
	);
}

export function VoterEditForm({
	voter,
	action,
	cancel,
	readOnly,
}: {
	voter: VoterCreate;
	action: "add" | "update" | null;
	cancel: () => void;
	readOnly?: boolean;
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
	}

	return (
		<Form onSubmit={handleSubmit} className="p-3">
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
						readOnly={readOnly}
					/>
					<Form.Control type="text" hidden isInvalid={!state.SAPIN} />
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
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group
				as={Row}
				controlId="voter-excused"
				className={
					"align-items-center mb-3" + (readOnly ? " pe-none" : "")
				}
				readOnly={readOnly}
				tabIndex={readOnly ? -1 : undefined}
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
			{!readOnly && (
				<SubmitCancel action={action} busy={false} cancel={cancel} />
			)}
		</Form>
	);
}
