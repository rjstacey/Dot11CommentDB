import React from "react";
import { Container, Row, Col, Spinner, Button } from "react-bootstrap";
import { ConfirmModal } from "@common";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";
import {
	selectVotersState,
	selectVotersBallot_id,
	deleteVoters,
	setSelectedVoters,
	votersActions,
	VoterCreate,
} from "@/store/voters";

import { VoterEditForm, VoterAddForm } from "./VoterEditForm";
import ShowAccess from "@/components/ShowAccess";

export function getDefaultVoter(ballot_id: number): VoterCreate {
	return {
		ballot_id,
		SAPIN: 0,
		Status: "Voter",
	} satisfies VoterCreate;
}

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="details-panel-placeholder">
		<span {...props} />
	</div>
);

function VoterDetail({
	access,
	readOnly,
}: {
	access: number;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const isOnline = useAppSelector(selectIsOnline);
	const votersBallot_id = useAppSelector(selectVotersBallot_id);
	const { selected, entities, loading, valid } =
		useAppSelector(selectVotersState);
	// Only ballots that exist (selection may be old)
	const selectedVoters = React.useMemo(
		() => selected.map((id) => entities[id]!).filter(Boolean),
		[selected, entities]
	);

	const edit: boolean | undefined = useAppSelector(selectVotersState).ui.edit;
	const setEdit = (edit: boolean) =>
		dispatch(votersActions.setUiProperties({ edit }));

	const [addVoter, setAddVoter] = React.useState<VoterCreate | null>(null);

	const [busy, setBusy] = React.useState(false);

	const addClick = React.useCallback(() => {
		setAddVoter(getDefaultVoter(votersBallot_id!));
		dispatch(setSelectedVoters([]));
	}, [dispatch, selectedVoters]);

	const deleteClick = React.useCallback(async () => {
		const list = selectedVoters.map((v) => v.SAPIN).join(", ");
		const ids = selectedVoters.map((b) => b.id);
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete voter${
				selectedVoters.length > 1 ? "s" : ""
			} ${list}?`
		);
		if (!ok) return;
		await dispatch(deleteVoters(ids));
	}, [dispatch, selectedVoters]);

	let content: JSX.Element;
	if (addVoter) {
		content = (
			<VoterAddForm voter={addVoter} cancel={() => setAddVoter(null)} />
		);
	} else {
		let placeholder: string | null = null;
		if (!valid && loading) {
			placeholder = "Loading...";
		} else if (selectedVoters.length === 0) {
			placeholder = "Nothing selected";
		} else if (selectedVoters.length > 1) {
			placeholder = "Mulitple selected";
		}
		if (placeholder) {
			content = <Placeholder>{placeholder}</Placeholder>;
		} else {
			content = (
				<VoterEditForm
					key={selectedVoters[0].id}
					voter={selectedVoters[0]}
					setBusy={setBusy}
					readOnly={!edit}
				/>
			);
		}
	}

	const actionButtons = readOnly ? null : (
		<>
			<Button
				variant="outline-primary"
				className="bi-pencil"
				title="Edit ballot"
				disabled={loading || !isOnline}
				active={edit}
				onClick={() => setEdit(!edit)}
			>
				{" Edit"}
			</Button>
			<Button
				variant="outline-primary"
				className="bi-plus-lg"
				title="Add ballot"
				disabled={loading || !isOnline}
				active={Boolean(addVoter)}
				onClick={addClick}
			>
				{" Add"}
			</Button>
			<Button
				variant="outline-primary"
				className="bi-trash"
				title="Delete ballot"
				disabled={selectedVoters.length === 0 || loading || !isOnline}
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
			{content}
			<ShowAccess access={access} />
		</Container>
	);
}

export default VoterDetail;
