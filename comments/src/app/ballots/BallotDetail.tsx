import React from "react";
import { Dictionary, EntityId } from "@reduxjs/toolkit";
import { Row, Button, Spinner } from "react-bootstrap";
import { ConfirmModal } from "@common";

import VotersActions from "./VotersActions";
import ResultsActions from "./ResultsActions";
import CommentsActions from "./CommentsActions";
import { BallotEditMultiple } from "./BallotEdit";
import ShowAccess from "@/components/ShowAccess";
import BallotAddForm from "./BallotAdd";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectIsOnline } from "@/store/offline";
import {
	deleteBallots,
	setUiProperties,
	setSelectedBallots,
	selectBallotsState,
	Ballot,
	BallotType,
	getBallotId,
} from "@/store/ballots";

function BallotEditMultipleWithActions({
	ballots,
	readOnly,
}: {
	ballots: Ballot[];
	readOnly?: boolean;
}) {
	const [busy, setBusy] = React.useState(false);

	let ballot: Ballot | undefined;
	if (ballots.length === 1) ballot = ballots[0];

	const actions = ballot ? (
		<>
			{ballot.Type === BallotType.WG && !ballot.prev_id && (
				<VotersActions ballot={ballot} readOnly={readOnly} />
			)}
			<ResultsActions
				ballot={ballot}
				setBusy={setBusy}
				readOnly={readOnly}
			/>
			<CommentsActions
				ballot={ballot}
				setBusy={setBusy}
				readOnly={readOnly}
			/>
		</>
	) : null;

	return (
		<div className="main">
			<Row style={{ justifyContent: "center" }}>
				<Spinner style={{ visibility: busy ? "visible" : "hidden" }} />
			</Row>
			<BallotEditMultiple ballots={ballots} readOnly={readOnly} />
			{actions}
		</div>
	);
}

function nextBallotNumber(ballots: Ballot[], type: number) {
	let maxNumber = 0;
	for (const b of ballots) {
		if (b.Type === type && b.number && b.number > maxNumber)
			maxNumber = b.number;
	}
	return maxNumber + 1;
}

function getDefaultBallot(
	ids: EntityId[],
	entities: Dictionary<Ballot>,
	ballotTemplate: Ballot | undefined
): Ballot {
	const allBallots = ids.map((id) => entities[id]!);
	const now = new Date();
	const today = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate()
	).toISOString();
	let groupId: string = "";
	let project: string = "";
	let type = 0;
	let number = 0;
	let stage = 0;
	let prev_id: number | null = null;
	if (ballotTemplate) {
		groupId = ballotTemplate.groupId;
		project = ballotTemplate.Project;
		type = ballotTemplate.Type;
		const ballots = allBallots
			.filter((b) => b.groupId === groupId && b.Project === project)
			.sort(
				(b1, b2) =>
					new Date(b1.Start || "").valueOf() -
					new Date(b2.Start || "").valueOf()
			);
		const latestBallot = ballots[ballots.length - 1];
		if (latestBallot) {
			if (latestBallot.Type === BallotType.CC) {
				type = BallotType.WG;
			} else if (latestBallot.Type === BallotType.WG) {
				if (latestBallot.IsComplete) {
					type = BallotType.SA;
				} else {
					type = BallotType.WG;
					prev_id = latestBallot.id;
				}
			} else if (latestBallot.Type === BallotType.SA) {
				type = BallotType.SA;
				prev_id = latestBallot.id;
			}
		}
		if (prev_id) {
			let id: number | null | undefined = prev_id;
			while (id) {
				stage++;
				id = entities[id]?.prev_id;
			}
		}
	}
	number = nextBallotNumber(allBallots, type);
	const ballot: Ballot = {
		groupId,
		Project: project,
		Type: type,
		number,
		stage,
		EpollNum: 0,
		Document: "",
		Topic: "",
		Start: today,
		End: today,
		prev_id,
		//IsRecirc: Boolean(prev_id),
		IsComplete: false,

		id: 0,
		Voters: 0,
		Comments: { Count: 0, CommentIDMax: 0, CommentIDMin: 0 },
		Results: null,
		workingGroupId: "",
		BallotID: "",
	};
	return ballot;
}

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="placeholder">
		<span {...props} />
	</div>
);

function BallotDetail({
	access,
	readOnly,
}: {
	access: number;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const isOnline = useAppSelector(selectIsOnline);
	const { selected, ids, entities, loading, valid } =
		useAppSelector(selectBallotsState);
	// Only ballots that exist (selection may be old)
	const selectedBallots = React.useMemo(
		() => selected.map((id) => entities[id]!).filter((b) => Boolean(b)),
		[selected, entities]
	);

	const edit: boolean | undefined =
		useAppSelector(selectBallotsState).ui.edit;
	const setEdit = (edit: boolean) => dispatch(setUiProperties({ edit }));

	const [action, setAction] = React.useState<"add" | "update">("update");

	const [defaultBallot, setDefaultBallot] = React.useState<
		Ballot | undefined
	>();

	const addClick = React.useCallback(() => {
		const ballot = selectedBallots[0];
		setDefaultBallot(getDefaultBallot(ids, entities, ballot));
		setAction("add");
		dispatch(setSelectedBallots([]));
	}, [dispatch, ids, entities, selectedBallots]);

	const deleteClick = React.useCallback(async () => {
		const list = selectedBallots.map(getBallotId).join(", ");
		const ids = selectedBallots.map((b) => b.id);
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ballot${
				selectedBallots.length > 1 ? "s" : ""
			} ${list}?`
		);
		if (!ok) return;
		await dispatch(deleteBallots(ids));
	}, [dispatch, selectedBallots]);

	let title = "";
	let placeholder: string | null = null;
	if (action === "update") {
		if (!valid && loading) {
			placeholder = "Loading...";
		} else if (selectedBallots.length === 0) {
			placeholder = "Nothing selected";
		} else {
			title = edit ? "Edit ballot" : "Ballot";
			if (selectedBallots.length > 1) title += "s";
		}
	} else {
		title = "Add ballot";
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
				disabled={selectedBallots.length === 0 || loading || !isOnline}
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
			) : action === "add" ? (
				<BallotAddForm
					defaultBallot={defaultBallot!}
					close={() => setAction("update")}
				/>
			) : (
				<BallotEditMultipleWithActions
					ballots={selectedBallots}
					readOnly={readOnly || !isOnline || !edit}
				/>
			)}
			<ShowAccess access={access} />
		</>
	);
}

export default BallotDetail;
