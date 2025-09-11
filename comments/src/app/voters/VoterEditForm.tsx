import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { Select, shallowDiff } from "@common";

import MemberSelector from "./MemberSelector";

import { useAppDispatch } from "@/store/hooks";
import { VoterCreate, addVoter, updateVoter } from "@/store/voters";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

const statusOptions = [
	{ value: "Voter", label: "Voter" },
	{ value: "ExOfficio", label: "ExOfficio" },
];

export function VoterEditForm({
	voter,
	action,
	cancel,
	setBusy,
	readOnly,
}: {
	voter: VoterCreate;
	action: "add" | "update" | null;
	cancel: () => void;
	setBusy: (busy: boolean) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const [state, setState] = React.useState(voter);

	const hasUpdates = React.useMemo(() => {
		if (action === "add") return true;
		const changes = shallowDiff(voter, state);
		console.log(changes);
		return Object.keys(changes).length > 0;
	}, [action, state, voter]);

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
		setBusy(true);
		if (action === "add") {
			await dispatch(addVoter(state));
		} else {
			const changes = shallowDiff(voter, state);
			await dispatch(updateVoter(voter.id!, changes));
		}
		setBusy(false);
	}

	let className = "p-3";
	if (readOnly) className += " pe-none";

	return (
		<Form
			noValidate
			validated
			onSubmit={handleSubmit}
			className={className}
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
						readOnly={readOnly}
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
			{!readOnly && hasUpdates && (
				<SubmitCancelRow
					submitLabel={action === "add" ? "Add" : "Update"}
					cancel={cancel}
				/>
			)}
		</Form>
	);
}
