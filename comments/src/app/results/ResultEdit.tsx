import React from "react";
import { Modal, Form, Row, Col, Button } from "react-bootstrap";

import { Select, TextArea } from "@common";

import { useAppDispatch } from "@/store/hooks";
import {
	updateResults,
	type Result,
	type ResultChange,
	type ResultUpdate,
} from "@/store/results";
import { getBallotId, Ballot } from "@/store/ballots";

const voteOptions = [
	{ label: "Approve", value: "Approve" },
	{ label: "Disapprove", value: "Disapprove" },
	{
		label: "Abstain - Lack of expertise",
		value: "Abstain - Lack of expertise",
	},
	{
		label: "Abstain - Lack of time",
		value: "Abstain - Lack of time",
		disabled: true,
	},
	{
		label: "Abstain - Conflict of Interest",
		value: "Abstain - Conflict of Interest",
		disabled: true,
	},
	{ label: "Abstain - Other", value: "Abstain - Other", disabled: true },
];

function SelectVote({
	value,
	onChange,
	id,
}: {
	value: string;
	onChange: (value: string) => void;
	id: string;
}) {
	let options = voteOptions;
	let values = voteOptions.filter((v) => v.value === value);
	if (value && values.length === 0) {
		const missingOption = { label: value, value, disabled: true };
		options = [...options, missingOption];
		values = [missingOption];
	}
	return (
		<Select
			id={id}
			style={{ width: 220 }}
			options={options}
			values={values}
			onChange={(values) => onChange(values[0].value)}
		/>
	);
}

export function EditResultForm({
	ballot,
	result,
	close,
}: {
	ballot: Ballot;
	result: Result | null;
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const [update, setUpdate] = React.useState<ResultUpdate>({
		id: "",
		changes: {},
	});

	React.useEffect(() => {
		if (result) {
			if (update.id !== result.id) {
				const changes: ResultChange = {
					vote: result.vote,
					notes: result.notes,
				};
				setUpdate({ id: result.id, changes });
			}
		}
	}, [update.id, result, ballot]);

	function change(changes: ResultChange) {
		setUpdate({
			id: update.id,
			changes: { ...update.changes, ...changes },
		});
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		await dispatch(updateResults(ballot!.id, [update]));
		close();
	}

	const memberStr = result
		? `${result.SAPIN} ${result.Name} (${result.Affiliation})`
		: "";

	return (
		<Form onSubmit={handleSubmit} className="p-3">
			<Row className="mb-3">{`Edit result for ${
				ballot ? getBallotId(ballot) : "-"
			}`}</Row>
			<Row className="mb-3">{memberStr}</Row>
			<Form.Group as={Row} className="mb-3">
				<Form.Label column id="edit-result-vote">
					Vote:
				</Form.Label>
				<Col>
					<SelectVote
						id="edit-result-vote"
						value={update.changes.vote!}
						onChange={(vote) => change({ vote })}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Label column htmlFor="edit-results-nodes">
					Notes:
				</Form.Label>
				<Col xs={12}>
					<TextArea
						style={{ width: "100%" }}
						id="edit-result-notes"
						rows={2}
						value={update.changes.notes || ""}
						onChange={(e) => change({ notes: e.target.value })}
					/>
				</Col>
			</Form.Group>
			<Row>
				<Col className="d-flex justify-content-center">
					<Button type="button" onClick={close}>
						Cancel
					</Button>
				</Col>
				<Col className="d-flex justify-content-center">
					<Button type="submit">Update</Button>
				</Col>
			</Row>
		</Form>
	);
}

export function ResultEditModal({
	ballot,
	result,
	close,
}: {
	ballot: Ballot;
	result: Result | null;
	close: () => void;
}) {
	return (
		<Modal show={Boolean(result)} onHide={close}>
			<EditResultForm ballot={ballot} result={result} close={close} />
		</Modal>
	);
}
