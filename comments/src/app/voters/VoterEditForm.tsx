import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { shallowDiff } from "@common";

import { useAppDispatch } from "@/store/hooks";
import { VoterCreate, addVoter, updateVoter } from "@/store/voters";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

import { MemberSelect } from "./MemberSelect";
import { VoterStatusSelect } from "./VoterStatusSelect";

function VoterEdit({
	voter,
	change,
	readOnly,
}: {
	voter: VoterCreate;
	change: (changes: Partial<VoterCreate>) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<Form.Group as={Row} className="mb-3">
				<Form.Label column htmlFor="voter-member">
					Member:
				</Form.Label>
				<Col xs="auto" className="position-relative">
					<MemberSelect
						id="voter-member"
						value={voter.SAPIN}
						onChange={(value) => change({ SAPIN: value })}
						readOnly={readOnly}
						isInvalid={!voter.SAPIN}
					/>
					<Form.Control.Feedback type="invalid" tooltip>
						Select member
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Label column controlId="voter-status">
					Status:
				</Form.Label>
				<Col xs="auto">
					<VoterStatusSelect
						id="voter-status"
						value={voter.Status}
						onChange={(value) => change({ Status: value })}
						readOnly={readOnly}
						isInvalid={!voter.Status}
					/>
					<Form.Control.Feedback type="invalid" tooltip>
						Select voter status
					</Form.Control.Feedback>
				</Col>
			</Form.Group>
			<Form.Group
				as={Row}
				controlId="voter-excused"
				className="align-items-center mb-3"
				readOnly={readOnly}
				tabIndex={readOnly ? -1 : undefined}
			>
				<Form.Label column>Excused:</Form.Label>
				<Col xs="auto">
					<Form.Check
						checked={voter.Excused}
						onChange={() => change({ Excused: !voter.Excused })}
						tabIndex={readOnly ? -1 : undefined}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
		</>
	);
}

export function VoterEditForm({
	voter,
	setBusy,
	readOnly,
}: {
	voter: VoterCreate;
	setBusy: (busy: boolean) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const [state, setState] = React.useState(voter);

	const hasUpdates = React.useMemo(() => {
		const changes = shallowDiff(voter, state);
		return Object.keys(changes).length > 0;
	}, [state, voter]);

	React.useEffect(() => setState(voter), [voter]);

	function cancel() {
		setState(voter);
	}

	function change(changes: Partial<VoterCreate>) {
		setState((state) => ({ ...state, ...changes }));
	}

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		const changes = shallowDiff(voter, state);
		await dispatch(updateVoter(voter.id!, changes));
		setBusy(false);
	}

	let className = "p-3";
	if (readOnly) className += " pe-none";

	return (
		<Form noValidate validated onSubmit={onSubmit} className={className}>
			<VoterEdit voter={state} change={change} readOnly={readOnly} />
			{!readOnly && hasUpdates && (
				<SubmitCancelRow submitLabel="Update" cancel={cancel} />
			)}
		</Form>
	);
}

export function VoterAddForm({
	voter,
	cancel,
	readOnly,
}: {
	voter: VoterCreate;
	cancel: () => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const formRef = React.useRef<HTMLFormElement>(null);
	//const [formValid, setFormValid] = React.useState(false);

	/*React.useLayoutEffect(() => {
		const formValid = formRef.current?.checkValidity() || false;
		setFormValid(formValid);
	});*/
	const [state, setState] = React.useState(voter);

	React.useEffect(() => setState(voter), [voter]);

	function change(changes: Partial<VoterCreate>) {
		setState((state) => ({ ...state, ...changes }));
	}

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		await dispatch(addVoter(state));
		setBusy(false);
	}

	const formValid = state.SAPIN && state.Status;

	let className = "p-3";
	if (readOnly) className += " pe-none";

	return (
		<Form
			ref={formRef}
			noValidate
			validated
			onSubmit={onSubmit}
			className={className}
		>
			<VoterEdit voter={state} change={change} readOnly={readOnly} />
			{!readOnly && (
				<SubmitCancelRow
					submitLabel="Add"
					cancel={cancel}
					disabled={!formValid}
					busy={busy}
				/>
			)}
		</Form>
	);
}
