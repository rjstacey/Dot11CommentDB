import React from "react";
import { Button } from "react-bootstrap";
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

import ShowAccess from "@/components/ShowAccess";
import { VoterEditForm } from "./VoterEdit";

export function getDefaultVoter(ballot_id: number): VoterCreate {
	return {
		ballot_id,
		SAPIN: 0,
		Status: "Voter",
	} satisfies VoterCreate;
}

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="placeholder">
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
	const { selected, ids, entities, loading, valid } =
		useAppSelector(selectVotersState);
	// Only ballots that exist (selection may be old)
	const selectedVoters = React.useMemo(
		() => selected.map((id) => entities[id]!).filter((b) => Boolean(b)),
		[selected, entities]
	);

	const edit: boolean | undefined = useAppSelector(selectVotersState).ui.edit;
	const setEdit = (edit: boolean) =>
		dispatch(votersActions.setUiProperties({ edit }));

	const [action, setAction] = React.useState<"add" | "update">("update");

	const [defaultVoter, setDefaultVoter] = React.useState<
		VoterCreate | undefined
	>();

	React.useEffect(() => {
		setDefaultVoter(selectedVoters[0]);
	}, [selectedVoters]);

	const addClick = React.useCallback(() => {
		setDefaultVoter(getDefaultVoter(votersBallot_id!));
		setAction("add");
		dispatch(setSelectedVoters([]));
	}, [dispatch, ids, entities, selectedVoters]);

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

	const cancelClick = () => {
		setDefaultVoter(selectedVoters[0]);
		setAction("update");
	};

	let title = "";
	let placeholder: string | null = null;
	if (action === "update") {
		if (!valid && loading) {
			placeholder = "Loading...";
		} else if (selectedVoters.length === 0) {
			placeholder = "Nothing selected";
		} else if (selectedVoters.length > 1) {
			placeholder = "Mulitple selected";
		} else {
			title = edit ? "Edit voter" : "Voter";
		}
	} else {
		title = "Add voter";
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
			/>
			<Button
				variant="outline-primary"
				className="bi-plus"
				title="Add ballot"
				disabled={!isOnline}
				active={action === "add"}
				onClick={addClick}
			/>
			<Button
				variant="outline-primary"
				className="bi-trash"
				title="Delete ballot"
				disabled={selectedVoters.length === 0 || loading || !isOnline}
				onClick={deleteClick}
			/>
		</>
	);

	return (
		<>
			<div className="top-row">
				<h3>{title}</h3>
				<div>{actionButtons}</div>
			</div>
			{placeholder ? (
				<Placeholder>{placeholder}</Placeholder>
			) : (
				defaultVoter && (
					<VoterEditForm
						action={action}
						voter={defaultVoter!}
						cancel={cancelClick}
						readOnly={!edit}
					/>
				)
			)}
			<ShowAccess access={access} />
		</>
	);
}

export default VoterDetail;
