import React from "react";
import isEqual from "lodash.isequal";
import { ConfirmModal, shallowDiff } from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectResultsState,
	deleteResultsMany,
	setSelectedResults as setSelected,
	//addResult,
	updateResults,
	//type ResultCreate,
	type ResultChange,
	type Result,
} from "@/store/results";

/*
function getDefaultResult(ballot_id: number): ResultCreate {
	return {
		ballot_id,
		SAPIN: 0,
		Status: "Voter",
	} satisfies ResultCreate;
}
*/

type ResultsEditState = (
	| {
			action: null;
			message: string;
	  }
	| {
			action: "add";
			edited: Result; //ResultCreate;
	  }
	| {
			action: "update";
			edited: Result;
			saved: Result;
	  }
) & {
	ballot_id: number | null;
	results: Result[];
};

function useResultsInitState() {
	const dispatch = useAppDispatch();
	const { selected, entities, loading, valid, ballot_id } =
		useAppSelector(selectResultsState);

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
		[setState, initState]
	);

	React.useEffect(() => {
		if (state.action === "add") {
			if (selected.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				).then((ok) => {
					if (ok) resetState();
					else dispatch(setSelected([]));
				});
			}
		} else if (state.action === "update") {
			if (state.edited === state.saved) {
				resetState();
				return;
			}
			const ids = state.results.map((r) => r.id);
			if (!isEqual(selected, ids)) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?"
				).then((ok) => {
					if (ok) resetState();
					else dispatch(setSelected(ids));
				});
			}
		} else {
			resetState();
		}
	}, [selected, resetState]);

	/*const onAdd = React.useCallback(() => {
		setState((state) => {
			if (!ballot_id) {
				console.warn("onAdd: ballot_id not set");
				return state;
			}
			return {
				...state,
				action: "add",
				edited: getDefaultVoter(ballot_id),
			};
		});
		dispatch(setSelected([]));
	}, [dispatch, ballot_id]);*/

	return {
		state,
		setState,
		resetState,
		//onAdd,
	};
}

export function useResultsEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();

	const { state, setState, resetState } = useResultsInitState();

	const hasChanges = React.useCallback(
		() =>
			state.action === "add" ||
			(state.action === "update" && state.edited !== state.saved),
		[state]
	);

	const onChange = React.useCallback(
		(changes: ResultChange) => {
			setState((state) => {
				if (readOnly) {
					console.warn("onChange: state is readOnly");
					return state;
				}
				if (state.action === "add") {
					return {
						...state,
						edited: { ...state.edited, ...changes },
					};
				} else if (state.action === "update") {
					let edited = { ...state.edited, ...changes };
					if (isEqual(edited, state.saved)) edited = state.saved;
					return { ...state, edited };
				}
				console.warn("onChange: bad state");
				return state;
			});
		},
		[readOnly, setState]
	);

	const submit = React.useCallback(async () => {
		if (readOnly) {
			console.warn("submit: state is readOnly");
			/*} else if (state.action === "add") {
			const voter = await dispatch(addResult(state.edited));
			if (voter) dispatch(setSelected([voter.id]));*/
		} else if (state.action === "update") {
			const id = state.edited.id;
			const changes = shallowDiff(state.saved, state.edited);
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
			`Are you sure you want to delete ${list}?`
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
		//onAdd,
		onDelete,
	};
}
