import * as React from "react";

import {
	shallowDiff,
	recursivelyDiffObjects,
	ActionButton,
	Form,
	Row,
	Spinner,
	ConfirmModal,
	Multiple,
	isMultiple
} from "dot11-components";

import { useDebounce } from "../components/useDebounce";
import VoterPoolActions from "./VoterPoolActions";
import ResultsActions from "./ResultsActions";
import CommentsActions from "./CommentsActions";
import EditBallot from "./BallotEdit";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectIsOnline } from "../store/offline";
import {
	updateBallots,
	deleteBallots,
	addBallot,
	setUiProperties,
	setSelectedBallots,
	setCurrentGroupProject,
	selectBallotsState,
	Ballot,
	BallotEdit,
	BallotUpdate,
	BallotType
} from "../store/ballots";

function BallotWithActions({
	ballot,
	updateBallot,
	readOnly,
}: {
	ballot: MultipleBallot;
	updateBallot: (changes: Partial<BallotEdit>) => void;
	readOnly?: boolean;
}) {
	const [busy, setBusy] = React.useState(false);

	const actions = isMultiple(ballot.id)? null:
		<>
			{((ballot.Type === BallotType.WG && !ballot.IsRecirc) ||
				ballot.Type === BallotType.Motion) && (
				<VoterPoolActions
					ballot_id={ballot.id}
					readOnly={readOnly}
				/>
			)}
			<ResultsActions
				ballot_id={ballot.id}
				setBusy={setBusy}
				readOnly={readOnly}
			/>
			<CommentsActions
				ballot_id={ballot.id}
				setBusy={setBusy}
				readOnly={readOnly}
			/>
		</>

	return (
		<div className="main">
			<Row style={{ justifyContent: "center" }}>
				<Spinner style={{ visibility: busy ? "visible" : "hidden" }} />
			</Row>
			<EditBallot
				ballot={ballot}
				updateBallot={updateBallot}
				readOnly={readOnly}
			/>
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
	const [ballot, setBallot] = React.useState(defaultBallot || getDefaultBallot);

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
				updateBallot={changes => setBallot(ballot => ({...ballot, ...changes}))}
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

type MultipleBallot = Multiple<Ballot>;

function BallotDetail({ readOnly }: { readOnly?: boolean }) {
	const dispatch = useAppDispatch();
	const isOnline = useAppSelector(selectIsOnline);
	const {
		entities: ballotEntities,
		loading,
		selected,
	} = useAppSelector(selectBallotsState);

	const edit: boolean | undefined =
		useAppSelector(selectBallotsState).ui.edit;
	const setEdit = (edit: boolean) => dispatch(setUiProperties({ edit }));

	const [action, setAction] = React.useState<"add" | "update">("update");
	const [edited, setEdited] = React.useState<MultipleBallot | null>(null);
	const [saved, setSaved] = React.useState<MultipleBallot | null>(null);
	const [originals, setOriginals] = React.useState<Ballot[]>([]);

	React.useEffect(() => {
		const ids = originals.map((b) => b.id);
		if (ids.join() !== selected.join()) {
			let diff: null | MultipleBallot = null,
				ballots: Ballot[] = [];
			for (const id of selected) {
				const ballot = ballotEntities[id];
				if (ballot) {
					diff = recursivelyDiffObjects(diff || {}, ballot);
					ballots.push(ballot);
				}
			}
			setEdited(diff);
			setSaved(diff);
			setOriginals(ballots);
		}
	}, [ballotEntities, selected, originals]);

	const triggerSave = useDebounce(() => {
		const changes = shallowDiff(saved, edited) as Partial<BallotEdit>;
		let updates: BallotUpdate[] = [];
		if (Object.keys(changes).length > 0) {
			updates = originals.map((o) => ({ id: o.id, changes }));
			dispatch(updateBallots(updates));
		}
		if (changes.groupId || changes.Project) {
			this.props.setCurrentGroupProject({
				groupId: edited.groupId,
				project: edited.Project,
			});
		}
		setSaved(edited);
	});

	const handleUpdate = (changes: Partial<BallotEdit>) => {
		if (readOnly || !edit) {
			console.warn("Update when read-only");
			return;
		}
		// merge in the edits and trigger a debounced save
		setEdited((edited) => ({ ...edited, ...changes }));
		triggerSave();
	};

	const addClick = () => {
		setAction("add");
		dispatch(setSelectedBallots([]));
	};

	const deleteClick = React.useCallback(async () => {
		const ids = originals.map((b) => b.id);
		const list = originals.map((b) => b.BallotID).join(", ");
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ballot${
				ids.length > 1 ? "s" : ""
			} ${list}?`
		);
		if (!ok) return;
		await dispatch(deleteBallots(ids));
	}, [dispatch, originals]);

	let title = "";
	let placeholder = "";
	if (action === "update") {
		if (!edited) {
			placeholder = loading ? "Loading..." : "Nothing selected";
		} else {
			title = edit ? "Edit ballot" : "Ballot";
			if (originals.length > 1) title += "s";
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
				disabled={originals.length === 0 || loading || !isOnline}
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
			{action === "add" ? (
				<BallotAddForm
					close={() => setAction("update")}
				/>
			) : edited ? (
				<BallotWithActions
					ballot={edited}
					updateBallot={handleUpdate}
					readOnly={readOnly || !isOnline || !edit}
				/>
			) : (
				<Placeholder>{placeholder}</Placeholder>
			)}
		</>
	);
}

export default BallotDetail;
