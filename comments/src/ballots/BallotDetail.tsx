import * as React from "react";

import {
	ActionButton,
	Form,
	Row,
	Spinner,
	ConfirmModal,
} from "dot11-components";

import VoterPoolActions from "./VoterPoolActions";
import ResultsActions from "./ResultsActions";
import CommentsActions from "./CommentsActions";
import { BallotEditMultiple, EditBallot } from "./BallotEdit";
import ShowAccess from "../components/ShowAccess";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectIsOnline } from "../store/offline";
import {
	deleteBallots,
	addBallot,
	setUiProperties,
	setSelectedBallots,
	setCurrentGroupProject,
	selectBallotsState,
	Ballot,
	BallotType,
} from "../store/ballots";

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
			{((ballot.Type === BallotType.WG && !ballot.IsRecirc) ||
				ballot.Type === BallotType.Motion) && (
				<VoterPoolActions ballot={ballot} readOnly={readOnly} />
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

function getDefaultBallot(): Ballot {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	return {
		groupId: null,
		Project: "",
		BallotID: "",
		EpollNum: 0,
		Document: "",
		Topic: "",
		Start: today.toISOString(),
		End: today.toISOString(),
		VotingPoolID: "",
		prev_id: 0,
		Type: 0,
		IsRecirc: false,
		IsComplete: false,

		id: 0,
		Voters: 0,
		Comments: { Count: 0, CommentIDMax: 0, CommentIDMin: 0 },
		Results: null,
	};
}

export function BallotAddForm({
	defaultBallot,
	close,
}: {
	defaultBallot?: Ballot;
	close: () => void;
}) {
	const dispatch = useAppDispatch();
	const [busy, setBusy] = React.useState(false);
	const [ballot, setBallot] = React.useState(
		defaultBallot || getDefaultBallot
	);

	let errorMsg = "";
	if (!ballot.groupId) errorMsg = "Group not set";
	else if (!ballot.Project) errorMsg = "Project not set";
	else if (!ballot.BallotID) errorMsg = "Ballot ID not set";

	const submit = async () => {
		if (!errorMsg) {
			setBusy(true);
			const b = await dispatch(addBallot(ballot));
			if (b) {
				dispatch(
					setCurrentGroupProject({
						groupId: ballot.groupId,
						project: ballot.Project,
					})
				);
				dispatch(setSelectedBallots([b.id]));
			}
			setBusy(false);
			close();
		}
	};

	return (
		<Form
			submit={submit}
			submitLabel="Add"
			cancel={close}
			errorText={errorMsg}
			busy={busy}
		>
			<EditBallot
				ballot={ballot}
				updateBallot={(changes) =>
					setBallot((ballot) => ({ ...ballot, ...changes }))
				}
				readOnly={false}
			/>
		</Form>
	);
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
	const { selected, entities, loading, valid } =
		useAppSelector(selectBallotsState);
	// Only ballots that exist (selection may be old)
	const ballots = React.useMemo(
		() => selected.map((id) => entities[id]!).filter((b) => Boolean(b)),
		[selected, entities]
	);

	const edit: boolean | undefined =
		useAppSelector(selectBallotsState).ui.edit;
	const setEdit = (edit: boolean) => dispatch(setUiProperties({ edit }));

	const [action, setAction] = React.useState<"add" | "update">("update");

	const addClick = React.useCallback(() => {
		setAction("add");
		dispatch(setSelectedBallots([]));
	}, [dispatch]);

	const deleteClick = React.useCallback(async () => {
		const list = ballots.map((b) => b.BallotID).join(", ");
		const ids = ballots.map((b) => b.id);
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ballot${
				ballots.length > 1 ? "s" : ""
			} ${list}?`
		);
		if (!ok) return;
		await dispatch(deleteBallots(ids));
	}, [dispatch, ballots]);

	let title = "";
	let placeholder: string | null = null;
	if (action === "update") {
		if (!valid && loading) {
			placeholder = "Loading...";
		} else if (ballots.length === 0) {
			placeholder = "Nothing selected";
		} else {
			title = edit ? "Edit ballot" : "Ballot";
			if (ballots.length > 1) title += "s";
		}
	} else {
		title = "Add ballot";
	}

	const actionButtons = readOnly ? null : (
		<>
			<ActionButton
				name="edit"
				title="Edit ballot"
				disabled={loading || !isOnline}
				isActive={edit}
				onClick={() => setEdit(!edit)}
			/>
			<ActionButton
				name="add"
				title="Add ballot"
				disabled={!isOnline}
				isActive={action === "add"}
				onClick={addClick}
			/>
			<ActionButton
				name="delete"
				title="Delete ballot"
				disabled={ballots.length === 0 || loading || !isOnline}
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
				<BallotAddForm close={() => setAction("update")} />
			) : (
				<BallotEditMultipleWithActions
					ballots={ballots}
					readOnly={readOnly || !isOnline || !edit}
				/>
			)}
			<ShowAccess access={access} />
		</>
	);
}

export default BallotDetail;
