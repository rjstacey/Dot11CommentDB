import React from "react";
import { Form, Row, Col } from "react-bootstrap";
import { TextArea, shallowDiff } from "@common";

import { useAppDispatch } from "@/store/hooks";
import { updateResults, type Result, type ResultChange } from "@/store/results";
import { Ballot } from "@/store/ballots";
import { SelectVote } from "./SelectVote";
import { SubmitCancelRow } from "@/components/SubmitCancelRow";

export function ResultEditForm({
	action,
	ballot,
	result,
	cancel,
	setBusy,
	readOnly,
}: {
	action: "add" | "update";
	ballot: Ballot;
	result: Result;
	cancel: () => void;
	setBusy: (busy: boolean) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const [state, setState] = React.useState(result);

	const hasUpdates = React.useMemo(() => {
		if (action === "add") return true;
		const changes = shallowDiff(result, state);
		return Object.keys(changes).length > 0;
	}, [action, state, result]);

	React.useEffect(() => setState(result), [result]);

	function change(changes: ResultChange) {
		setState((state) => ({
			...state,
			...changes,
		}));
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		if (action === "add") {
			//await dispatch(addResult(state));
		} else {
			const changes = shallowDiff(result, state);
			await dispatch(
				updateResults(ballot.id, [{ id: result.id, changes }])
			);
		}
		setBusy(false);
	}

	const memberStr = result
		? `${result.SAPIN} ${result.Name} (${result.Affiliation})`
		: "";

	let className = "p-3";
	if (readOnly) className += " pe-none";

	return (
		<Form onSubmit={handleSubmit} className={className}>
			<Row className="mb-3">
				<h3>{memberStr}</h3>
			</Row>
			<Form.Group as={Row} className="mb-3">
				<Form.Label column htmlFor="result-vote">
					Vote:
				</Form.Label>
				<Col xs="auto">
					<SelectVote
						id="result-vote"
						value={state.vote}
						onChange={(vote) => change({ vote })}
						readOnly={readOnly}
					/>
				</Col>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Label column htmlFor="results-notes">
					Notes:
				</Form.Label>
				<Col xs={12}>
					<TextArea
						style={{ width: "100%" }}
						id="result-notes"
						rows={2}
						value={state.notes || ""}
						onChange={(e) => change({ notes: e.target.value })}
						readOnly={readOnly}
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
