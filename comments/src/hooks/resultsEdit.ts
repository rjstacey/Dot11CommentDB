import { useCallback, useEffect, useReducer } from "react";
import isEqual from "lodash.isequal";
import { ConfirmModal, shallowDiff } from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectResultsState,
	deleteResultsMany,
	setSelectedResults as setSelected,
	selectResultExtendedEntities,
	updateResults,
	type ResultChange,
	type ResultExtended,
} from "@/store/results";

type ResultsEditState = (
	| {
			action: null;
			message: string;
	  }
	| {
			action: "update";
			edited: ResultExtended;
			saved: ResultExtended;
	  }
) & {
	ballot_id: number | null;
	results: ResultExtended[];
};

type ResultsEditAction =
	| {
			type: "INIT" | "SUBMIT";
	  }
	| {
			type: "CHANGE";
			changes: ResultChange;
	  };
const INIT = { type: "INIT" } as const;
const SUBMIT = { type: "SUBMIT" } as const;
const CHANGE = (changes: ResultChange) =>
	({ type: "CHANGE", changes }) as const;

function useResultsEditReducer() {
	const { selected, loading, valid, ballot_id } =
		useAppSelector(selectResultsState);
	const entities = useAppSelector(selectResultExtendedEntities);

	const initState = useCallback((): ResultsEditState => {
		const results = selected.map((id) => entities[id]!).filter(Boolean);
		let message: string;
		if (loading && !valid) {
			message = "Loading...";
		} else if (results.length === 0) {
			message = "Nothing selected";
		} else if (results.length === 1) {
			const edited = results[0];
			return {
				action: "update",
				edited,
				saved: edited,
				ballot_id,
				results,
			};
		} else {
			message = "Multiple selected";
		}
		return {
			action: null,
			message,
			ballot_id,
			results,
		};
	}, [selected, entities, loading, valid]);

	const reducer = useCallback(
		(
			state: ResultsEditState,
			action: ResultsEditAction,
		): ResultsEditState => {
			if (action.type === "INIT") {
				return initState();
			} else if (action.type === "CHANGE") {
				if (state.action === "update") {
					let edited = { ...state.edited, ...action.changes };
					if (isEqual(edited, state.saved)) edited = state.saved;
					return { ...state, edited };
				}
				return state;
			} else if (action.type === "SUBMIT") {
				if (state.action === "update") {
					return { ...state, saved: state.edited };
				}
				return state;
			}
			throw new Error("Unknown action: " + action);
		},
		[initState],
	);

	return useReducer(reducer, undefined, initState);
}

export function useResultsEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();
	const [state, dispatchStateAction] = useResultsEditReducer();
	const { selected } = useAppSelector(selectResultsState);

	useEffect(() => {
		if (state.action === "update") {
			if (state.edited === state.saved) {
				dispatchStateAction(INIT);
				return;
			}
			const ids = state.results.map((r) => r.id);
			if (!isEqual(selected, ids)) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction(INIT);
					else dispatch(setSelected(ids));
				});
			}
		} else {
			dispatchStateAction(INIT);
		}
	}, [selected]);

	const hasChanges = useCallback(
		() => state.action === "update" && state.edited !== state.saved,
		[state],
	);

	const onChange = useCallback(
		(changes: ResultChange) => {
			if (readOnly || state.action === null) {
				console.warn("onChange: bad state");
				return state;
			}
			dispatchStateAction(CHANGE(changes));
		},
		[readOnly],
	);

	const submit = useCallback(async () => {
		if (readOnly || state.action === null) {
			console.warn("submit: bad state");
			return;
		}
		const id = state.edited.id;
		const changes = shallowDiff(state.saved, state.edited);
		if (
			state.edited.ballot_id !== state.edited.lastBallotId &&
			!changes.vote
		) {
			// Carry over the vote if the last vote was not for this ballot
			changes.vote = state.edited.vote;
		}
		await dispatch(updateResults(state.ballot_id!, [{ id, changes }]));
		dispatchStateAction(SUBMIT);
	}, [readOnly, state]);

	const cancel = useCallback(async () => {
		dispatchStateAction(INIT);
	}, []);

	const deleteDisabled = readOnly || state.action !== "update";
	const onDelete = useCallback(async () => {
		if (deleteDisabled) {
			console.warn("onDelete: bad state");
			return;
		}
		const list = state.results.map((v) => v.SAPIN).join(", ");
		const ids = state.results.map((v) => v.id);
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ${list}?`,
		);
		if (ok) {
			dispatchStateAction(SUBMIT);
			await dispatch(deleteResultsMany(ids));
		}
	}, [state, deleteDisabled]);

	return {
		state,
		hasChanges,
		onChange,
		submit,
		cancel,
		deleteDisabled,
		onDelete,
	};
}
