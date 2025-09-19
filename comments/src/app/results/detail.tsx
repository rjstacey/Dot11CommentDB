import React from "react";
import { Container, Row, Col, Spinner, Button } from "react-bootstrap";
import { ConfirmModal } from "@common";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";
import { selectBallot } from "@/store/ballots";
import {
	selectResultsState,
	selectResultsBallot_id,
	deleteResultsMany,
	setSelectedResults,
	resultsActions,
	//ResultCreate,
	Result,
} from "@/store/results";

import ShowAccess from "@/components/ShowAccess";
import { ResultEditForm } from "./ResultEditForm";

/*
export function getDefaultResult(ballot_id: number): ResultCreate {
	return {
		ballot_id,
		SAPIN: 0,
		Status: "Voter",
	} satisfies ResultCreate;
}*/

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="details-panel-placeholder">
		<span {...props} />
	</div>
);

export function ResultsDetail({
	access,
	readOnly,
}: {
	access: number;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const isOnline = useAppSelector(selectIsOnline);
	const ballot_id = useAppSelector(selectResultsBallot_id)!;
	const ballot = useAppSelector((state) => selectBallot(state, ballot_id));

	const { selected, ids, entities, loading, valid } =
		useAppSelector(selectResultsState);
	// Only ballots that exist (selection may be old)
	const selectedResults = React.useMemo(
		() => selected.map((id) => entities[id]!).filter((b) => Boolean(b)),
		[selected, entities]
	);

	const edit: boolean | undefined =
		useAppSelector(selectResultsState).ui.edit;
	const setEdit = (edit: boolean) =>
		dispatch(resultsActions.setUiProperties({ edit }));

	const [action, setAction] = React.useState<"add" | "update">("update");

	const [defaultResult, setDefaultResult] = React.useState<
		Result | undefined
	>();
	const [busy, setBusy] = React.useState(false);

	React.useEffect(() => {
		setDefaultResult(selectedResults[0]);
	}, [selectedResults]);

	const addClick = React.useCallback(() => {
		//setDefaultResult(getDefaultVoter(ballot_id!));
		setAction("add");
		dispatch(setSelectedResults([]));
	}, [dispatch, ids, entities, selectedResults]);

	const deleteClick = React.useCallback(async () => {
		const list = selectedResults.map((v) => v.SAPIN).join(", ");
		const ids = selectedResults.map((b) => b.id);
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete result${
				selectedResults.length > 1 ? "s" : ""
			} ${list}?`
		);
		if (!ok) return;
		await dispatch(deleteResultsMany(ids));
	}, [dispatch, selectedResults]);

	const cancelClick = () => {
		setDefaultResult(selectedResults[0]);
		setAction("update");
	};

	let placeholder: string | null = null;
	if (action === "update") {
		if (!valid && loading) {
			placeholder = "Loading...";
		} else if (selectedResults.length === 0) {
			placeholder = "Nothing selected";
		} else if (selectedResults.length > 1) {
			placeholder = "Mulitple selected";
		}
	}

	const actionButtons = readOnly ? null : (
		<>
			<Button
				variant="outline-primary"
				className="bi-pencil"
				title="Edit result"
				disabled={loading || !isOnline}
				active={edit}
				onClick={() => setEdit(!edit)}
			>
				{" Edit"}
			</Button>
			<Button
				variant="outline-primary"
				className="bi-plus-lg"
				title="Add result"
				//disabled={!isOnline}
				disabled={true}
				active={action === "add"}
				onClick={addClick}
			>
				{" Add"}
			</Button>
			<Button
				variant="outline-primary"
				className="bi-trash"
				title="Delete result"
				disabled={selectedResults.length === 0 || loading || !isOnline}
				onClick={deleteClick}
			>
				{" Delete"}
			</Button>
		</>
	);

	return (
		<Container fluid style={{ maxWidth: 860 }}>
			<Row className="align-items-center mb-3">
				<Col>
					<Spinner
						size="sm"
						className={busy ? "visible" : "invisible"}
					/>
				</Col>
				<Col xs="auto" className="d-flex gap-2">
					{actionButtons}
				</Col>
			</Row>

			{placeholder ? (
				<Placeholder>{placeholder}</Placeholder>
			) : (
				defaultResult && (
					<ResultEditForm
						action={action}
						ballot={ballot}
						result={defaultResult}
						cancel={cancelClick}
						setBusy={setBusy}
						readOnly={!edit}
					/>
				)
			)}
			<ShowAccess access={access} />
		</Container>
	);
}
