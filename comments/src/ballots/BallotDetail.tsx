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
	updateBallot,
	deleteBallots,
	setUiProperties,
	selectBallotsState,
	Ballot,
	BallotEdit,
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

type BallotDetailState = {
	saved: MultipleBallot;
	edited: MultipleBallot;
	originals: Ballot[];
};

function BallotDetail({ readOnly }: { readOnly?: boolean }) {
	const dispatch = useAppDispatch();
	const isOnline = useAppSelector(selectIsOnline);
	const {
		entities: ballots,
		loading,
		selected,
	} = useAppSelector(selectBallotsState);

	const edit: boolean | undefined = useAppSelector(selectBallotsState).ui.edit;
	const setEdit = (edit: boolean) => dispatch(setUiProperties({ edit }));

	const initState = React.useCallback((): BallotDetailState => {
		let diff = {},
			originals: Ballot[] = [];
		for (const id of selected) {
			const ballot = ballots[id];
			if (ballot) {
				diff = recursivelyDiffObjects(diff, ballot);
				originals.push(ballot);
			}
		}
		return {
			saved: diff as MultipleBallot,
			edited: diff as MultipleBallot,
			originals: originals,
		};
	}, [ballots, selected]);

	const [state, setState] = React.useState(initState);

	/*React.useEffect(() => {
		setState(initState());
	}, [initState]);*/

	const triggerSave = useDebounce(() => {
		const { edited, saved, originals } = state;
		const d = shallowDiff(saved, edited) as Partial<Ballot>;
		const updates: (Partial<Ballot> & { id: number })[] = [];
		for (const o of originals) {
			if (Object.keys(d).length > 0) updates.push({ ...d, id: o.id });
		}
		if (updates.length > 0)
			updates.forEach((u) => dispatch(updateBallot(u.id, u)));
		if (d.groupId || d.Project) {
			this.props.setCurrentGroupProject({
				groupId: edited.groupId,
				project: edited.Project,
			});
		}
		setState((state) => ({ ...state, saved: edited }));
	});

	const handleUpdateBallot = (changes: Partial<BallotEdit>) => {
		if (readOnly || !edit) {
			console.warn("Update when read-only");
			return;
		}
		// merge in the edits and trigger a debounced save
		setState((state) => ({
			...state,
			edited: { ...state.edited, ...changes },
		}));
		triggerSave();
	};

	const handleRemoveSelected = async () => {
		const list = selected.map((id) => ballots[id]!.BallotID).join(", ");
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ballot${
				selected.length > 0 ? "s" : ""
			} ${list}?`
		);
		if (!ok) return;
		await dispatch(deleteBallots(selected));
	};

	let placeholder = "";
	if (loading) placeholder = "Loading...";
	else if (state.originals.length === 0) placeholder = "Nothing selected";

	let title = "";
	if (!placeholder) {
		if (edit) {
			title = state.originals.length > 1? "Edit ballots": "Edit ballot";
		}
		else {
			title = state.originals.length > 1? "Ballots": "Ballot";
		}
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
			{placeholder ? (
				<Placeholder>{placeholder}</Placeholder>
			) : (
				<BallotWithActions
					ballot={state.edited}
					updateBallot={handleUpdateBallot}
					readOnly={readOnly || !isOnline || !edit}
				/>
			)}
		</>
	);
}

export default BallotDetail;
