import React from "react";
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

function useResultsInitState() {
	const dispatch = useAppDispatch();
	const { selected, loading, valid, ballot_id } =
		useAppSelector(selectResultsState);
	const entities = useAppSelector(selectResultExtendedEntities);

	const initState = React.useCallback((): ResultsEditState => {
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

	const [state, setState] = React.useState<ResultsEditState>(initState);

	const resetState = React.useCallback(
		() => setState(initState),
		[setState, initState],
	);

	React.useEffect(() => {
		if (state.action === "update") {
			if (state.edited === state.saved) {
				resetState();
				return;
			}
			const ids = state.results.map((r) => r.id);
			if (!isEqual(selected, ids)) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) resetState();
					else dispatch(setSelected(ids));
				});
			}
		} else {
			resetState();
		}
	}, [selected, resetState]);

	return {
		state,
		setState,
		resetState,
	};
}

export function useResultsEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();

	const { state, setState, resetState } = useResultsInitState();

	const hasChanges = React.useCallback(
		() => state.action === "update" && state.edited !== state.saved,
		[state],
	);

	const onChange = React.useCallback(
		(changes: ResultChange) => {
			setState((state) => {
				if (readOnly) {
					console.warn("onChange: state is readOnly");
					return state;
				}
				if (state.action === "update") {
					let edited = { ...state.edited, ...changes };
					if (isEqual(edited, state.saved)) edited = state.saved;
					return { ...state, edited };
				}
				console.warn("onChange: bad state");
				return state;
			});
		},
		[readOnly, setState],
	);

	const submit = React.useCallback(async () => {
		if (readOnly) {
			console.warn("submit: state is readOnly");
		} else if (state.action === "update") {
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
			setState({ ...state, saved: state.edited });
		} else {
			console.warn("submit: bad state");
		}
	}, [state, dispatch, setState, readOnly]);

	const onDelete = React.useCallback(async () => {
		const list = state.results.map((v) => v.SAPIN).join(", ");
		const ids = state.results.map((v) => v.id);
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ${list}?`,
		);
		if (!ok) return;
		await dispatch(deleteResultsMany(ids));
	}, [dispatch, state]);

	return {
		state,
		hasChanges,
		onChange,
		submit,
		cancel: resetState,
		onDelete,
	};
}
