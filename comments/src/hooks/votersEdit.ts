import { useCallback, useEffect, useReducer } from "react";
import isEqual from "lodash.isequal";
import { ConfirmModal, shallowDiff } from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectVotersState,
	setSelected,
	deleteVoters,
	addVoter,
	updateVoter,
	type VoterCreate,
	type VoterChange,
	type Voter,
} from "@/store/voters";

function getDefaultVoter(ballot_id: number): VoterCreate {
	return {
		ballot_id,
		SAPIN: 0,
		Status: "Voter",
	} satisfies VoterCreate;
}

type VotersEditState = (
	| {
			action: null;
			message: string;
	  }
	| {
			action: "add";
			edited: VoterCreate;
	  }
	| {
			action: "update";
			edited: Voter;
			saved: Voter;
	  }
) & {
	voters: Voter[];
};

type VotersEditAction =
	| {
			type: "INIT" | "CREATE" | "SUBMIT";
	  }
	| {
			type: "CHANGE";
			changes: VoterChange;
	  };
const INIT = { type: "INIT" } as const;
const CREATE = { type: "CREATE" } as const;
const SUBMIT = { type: "SUBMIT" } as const;
const CHANGE = (changes: VoterChange) => ({ type: "CHANGE", changes }) as const;

function useVotersEditReducer() {
	const { selected, entities, loading, valid, ballot_id } =
		useAppSelector(selectVotersState);

	const initState = useCallback((): VotersEditState => {
		const voters = selected.map((id) => entities[id]!).filter(Boolean);
		let message: string;
		if (loading && !valid) {
			message = "Loading...";
		} else if (voters.length === 0) {
			message = "Nothing selected";
		} else if (voters.length === 1) {
			const edited = voters[0];
			return {
				action: "update",
				edited,
				saved: edited,
				voters,
			};
		} else {
			message = "Multiple selected";
		}
		return {
			action: null,
			message,
			voters,
		};
	}, [selected, entities, loading, valid]);

	const reducer = useCallback(
		(state: VotersEditState, action: VotersEditAction): VotersEditState => {
			if (action.type === "INIT") {
				return initState();
			} else if (action.type === "CREATE") {
				if (!ballot_id) {
					console.warn("CREATE: ballot_id not set");
					return state;
				}
				return {
					...state,
					action: "add",
					edited: getDefaultVoter(ballot_id),
				};
			} else if (action.type === "CHANGE") {
				if (state.action === "add") {
					return {
						...state,
						edited: { ...state.edited, ...action.changes },
					};
				} else if (state.action === "update") {
					let edited = { ...state.edited, ...action.changes };
					if (isEqual(edited, state.saved)) edited = state.saved;
					return { ...state, edited };
				}
				return state;
			} else if (action.type === "SUBMIT") {
				if (state.action === "add") {
					return {
						...state,
						action: null,
						message: "Added",
					};
				} else if (state.action === "update") {
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

export function useVotersEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();
	const { selected } = useAppSelector(selectVotersState);
	const [state, dispatchStateAction] = useVotersEditReducer();

	useEffect(() => {
		if (state.action === "add") {
			if (selected.length > 0) {
				ConfirmModal.show(
					"Changes not applied! Do you want to discard changes?",
				).then((ok) => {
					if (ok) dispatchStateAction(INIT);
					else dispatch(setSelected([]));
				});
			}
		} else if (state.action === "update") {
			if (state.edited === state.saved) {
				dispatchStateAction(INIT);
				return;
			}
			const ids = state.voters.map((v) => v.id);
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
		() =>
			state.action === "add" ||
			(state.action === "update" && state.edited !== state.saved),
		[state],
	);

	const onChange = useCallback(
		(changes: VoterChange) => {
			if (readOnly || state.action === null) {
				console.warn("onChange: bad state");
				return;
			}
			dispatchStateAction(CHANGE(changes));
		},
		[readOnly, state.action],
	);

	const submit = useCallback(async () => {
		if (readOnly || state.action === null) {
			console.warn("submit: bad state");
		} else if (state.action === "add") {
			const voter = await dispatch(addVoter(state.edited));
			if (voter) {
				dispatchStateAction(SUBMIT);
				dispatch(setSelected([voter.id]));
			}
		} else if (state.action === "update") {
			const id = state.edited.id;
			const changes = shallowDiff(state.saved, state.edited);
			await dispatch(updateVoter(id, changes));
			dispatchStateAction(SUBMIT);
		}
	}, [readOnly, state]);

	const cancel = useCallback(async () => {
		dispatchStateAction(INIT);
	}, []);

	const addDisabled = readOnly || hasChanges();
	const onAdd = useCallback(() => {
		if (addDisabled) {
			console.warn("onAdd: bad state");
			return;
		}
		dispatchStateAction(CREATE);
		dispatch(setSelected([]));
	}, [addDisabled]);

	const deleteDisabled = readOnly || state.action !== "update";
	const onDelete = useCallback(async () => {
		if (deleteDisabled) {
			console.warn("onDelete: bad state");
			return;
		}
		const list = state.voters.map((v) => v.SAPIN).join(", ");
		const ids = state.voters.map((v) => v.id);
		const ok = await ConfirmModal.show(
			`Are you sure you want to delete ${list}?`,
		);
		if (ok) {
			dispatchStateAction(SUBMIT);
			await dispatch(deleteVoters(ids));
		}
	}, [state, deleteDisabled]);

	return {
		state,
		hasChanges,
		onChange,
		submit,
		cancel,
		addDisabled,
		onAdd,
		deleteDisabled,
		onDelete,
	};
}
