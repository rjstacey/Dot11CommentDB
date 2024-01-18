import * as React from "react";

import {
	shallowDiff,
	recursivelyDiffObjects,
	ActionButton,
	Row,
	Spinner,
	ConfirmModal,
	Multiple,
} from "dot11-components";

import { useDebounce } from "../components/useDebounce";
import ResultsActions from "./ResultsActions";
import CommentsActions from "./CommentsActions";
import EditBallot from "./BallotEdit";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectIsOnline } from "../store/offline";
import {
	updateBallots,
	deleteBallots,
	setUiProperties,
	selectBallotsState,
	Ballot,
	BallotEdit,
	BallotUpdate,
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
		</div>
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

	const edit: boolean | undefined = useAppSelector(selectBallotsState).ui.edit;
	const setEdit = (edit: boolean) => dispatch(setUiProperties({ edit }));

	const [edited, setEdited] = React.useState<MultipleBallot | null>(null);
	const [saved, setSaved] = React.useState<MultipleBallot | null>(null);
	const [originals, setOriginals] = React.useState<Ballot[]>([]);

	React.useEffect(() => {
		const ids = originals.map(b => b.id);
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
		if(Object.keys(changes).length > 0) {
			updates = originals.map(o => ({id: o.id, changes}))
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

	const handleUpdateBallot = (changes: Partial<BallotEdit>) => {
		if (readOnly || !edit) {
			console.warn("Update when read-only");
			return;
		}
		// merge in the edits and trigger a debounced save
		setEdited((edited) => ({...edited, ...changes }));
		triggerSave();
	};

	const handleRemoveSelected = async () => {
		const ids = originals.map(b => b.id);
		const list = originals.map(b => b.BallotID).join(", ");
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ballot${
				selected.length > 0 ? "s" : ""
			} ${list}?`
		);
		if (!ok) return;
		await dispatch(deleteBallots(ids));
	};

	let title = "";
	let placeholder = "";
	if (!edited) {
		placeholder = loading? "Loading...": "Nothing selected";
	}
	else {
		title = edit? "Edit ballot": "Ballot";
		if (originals.length > 1)
			title += "s";
	}

	const disableButtons = Boolean(placeholder) || !isOnline;
	const actionButtons = readOnly ? null : (
		<>
			<ActionButton
				name="edit"
				title="Edit ballot"
				disabled={disableButtons}
				isActive={edit}
				onClick={() => setEdit(!edit)}
			/>
			<ActionButton
				name="delete"
				title="Delete ballot"
				disabled={disableButtons}
				onClick={handleRemoveSelected}
			/>
		</>
	);

	return (
		<>
			<div className="top-row">
				<h3>{title}</h3>
				<div>{actionButtons}</div>
			</div>
			{!edited ? (
				<Placeholder>{placeholder}</Placeholder>
			) : (
				<BallotWithActions
					ballot={edited}
					updateBallot={handleUpdateBallot}
					readOnly={readOnly || !isOnline || !edit}
				/>
			)}
		</>
	);
}

export default BallotDetail;
